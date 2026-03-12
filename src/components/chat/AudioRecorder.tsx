import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Alert, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';

const logger = createLogger('AudioRecorder');

const WAVEFORM_BAR_COUNT = 30;
const METERING_POLL_MS = 80;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 120_000; // 2 minutes

// Use proven preset + metering
const RECORDING_OPTIONS: Audio.RecordingOptions = {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
};

interface AudioRecorderProps {
    onRecordingComplete: (uri: string, durationMillis: number) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onRecordingStateChange, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [waveformBars, setWaveformBars] = useState<number[]>(new Array(WAVEFORM_BAR_COUNT).fill(3));

    const recordingRef = useRef<Audio.Recording | null>(null);
    const startedAtRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const meteringRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const waveformDataRef = useRef<number[]>(new Array(WAVEFORM_BAR_COUNT).fill(3));
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        return () => {
            clearTimers();
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => {});
                recordingRef.current = null;
            }
        };
    }, []);

    const clearTimers = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (meteringRef.current) { clearInterval(meteringRef.current); meteringRef.current = null; }
    };

    const formatElapsed = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // === START ===
    const startRecording = async () => {
        if (recordingRef.current) return;

        try {
            const perm = await Audio.requestPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Microphone Access', 'Please enable microphone access in Settings to send voice notes.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

            recordingRef.current = recording;
            startedAtRef.current = Date.now();
            setIsRecording(true);
            setElapsed(0);
            waveformDataRef.current = new Array(WAVEFORM_BAR_COUNT).fill(3);
            setWaveformBars(new Array(WAVEFORM_BAR_COUNT).fill(3));
            onRecordingStateChange?.(true);

            // Start timer
            timerRef.current = setInterval(() => {
                const ms = Date.now() - startedAtRef.current;
                setElapsed(ms);
                if (ms >= MAX_DURATION_MS) sendRecording();
            }, 100);

            // Start metering
            meteringRef.current = setInterval(async () => {
                if (!recordingRef.current) return;
                try {
                    const status = await recordingRef.current.getStatusAsync();
                    if (status.isRecording && status.metering != null) {
                        const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
                        const barHeight = 3 + normalized * 29;
                        const newBars = [...waveformDataRef.current.slice(1), barHeight];
                        waveformDataRef.current = newBars;
                        setWaveformBars([...newBars]);
                    }
                } catch {}
            }, METERING_POLL_MS);

            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            logger.info('[AudioRecorder] Recording started');
        } catch (err: any) {
            logger.error('[AudioRecorder] Start error:', err);
            Alert.alert('Error', 'Could not start microphone.');
        }
    };

    // === SEND ===
    const sendRecording = async () => {
        const recording = recordingRef.current;
        if (!recording) return;
        recordingRef.current = null;

        clearTimers();
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        setIsRecording(false);
        onRecordingStateChange?.(false);

        try {
            // Get duration BEFORE stopping (iOS bug: stopAndUnloadAsync returns 0)
            const preStatus = await recording.getStatusAsync();
            const duration = preStatus.durationMillis || 0;

            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            const uri = recording.getURI();

            logger.info('[AudioRecorder] Stopped', { uri, duration });

            if (uri && duration > MIN_DURATION_MS) {
                onRecordingComplete(uri, duration);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Alert.alert('Too Short', 'Record for at least 1 second to send a voice note.');
            }
        } catch (err: any) {
            logger.error('[AudioRecorder] Stop error:', err);
            Alert.alert('Error', 'Something went wrong while saving the audio.');
        }
    };

    // === CANCEL ===
    const cancelRecording = async () => {
        const recording = recordingRef.current;
        if (!recording) return;
        recordingRef.current = null;

        clearTimers();
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        setIsRecording(false);
        onRecordingStateChange?.(false);

        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            logger.info('[AudioRecorder] Recording cancelled');
        } catch (err: any) {
            logger.error('[AudioRecorder] Cancel error:', err);
        }
    };

    // === RENDER: idle ===
    if (!isRecording) {
        return (
            <TouchableOpacity
                onPress={startRecording}
                disabled={disabled}
                activeOpacity={0.7}
                style={[styles.micButton, disabled && styles.micButtonDisabled]}
            >
                <Ionicons name="mic-outline" size={24} color="white" />
            </TouchableOpacity>
        );
    }

    // === RENDER: recording bar ===
    return (
        <View style={styles.recordingBar}>
            {/* Cancel */}
            <TouchableOpacity onPress={cancelRecording} activeOpacity={0.7} style={styles.cancelButton}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>

            {/* Waveform + Timer */}
            <View style={styles.waveformContainer}>
                <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
                <View style={styles.waveformBars}>
                    {waveformBars.map((height, i) => (
                        <View
                            key={i}
                            style={[styles.waveformBar, {
                                height: Math.max(3, height),
                                opacity: 0.4 + (i / WAVEFORM_BAR_COUNT) * 0.6,
                            }]}
                        />
                    ))}
                </View>
            </View>

            {/* Send */}
            <TouchableOpacity onPress={sendRecording} activeOpacity={0.7} style={styles.sendButton}>
                <Ionicons name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    micButton: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#437FFF', alignItems: 'center', justifyContent: 'center',
    },
    micButtonDisabled: { opacity: 0.5 },
    recordingBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FEF2F2', borderRadius: 24,
        borderWidth: 1, borderColor: '#FECACA',
        height: 48, paddingHorizontal: 6, flex: 1,
    },
    cancelButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    },
    waveformContainer: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 10, height: 36,
    },
    recordingDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#EF4444', marginRight: 8,
    },
    timerText: {
        fontSize: 14, fontWeight: '600', fontFamily: FONTS.semiBold, color: '#B91C1C',
        marginRight: 10, minWidth: 36, fontVariant: ['tabular-nums'],
    },
    waveformBars: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', height: 32,
    },
    waveformBar: { width: 3, borderRadius: 1.5, backgroundColor: '#EF4444' },
    sendButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#437FFF', alignItems: 'center', justifyContent: 'center',
    },
});
