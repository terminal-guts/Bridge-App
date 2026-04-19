import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Alert, Linking, Text, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { DURATIONS } from '../../constants/animations';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('AudioRecorder');

// ─── Constants ────────────────────────────────────────────────────────────────
const WAVEFORM_BAR_COUNT = 30;
const METERING_POLL_MS = 80;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 120_000; // 2 minutes

// Custom recording options with metering enabled
const RECORDING_OPTIONS: Audio.RecordingOptions = {
    isMeteringEnabled: true,
    android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
    },
    ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
    },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface AudioRecorderProps {
    onRecordingComplete: (uri: string, durationMillis: number) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onRecordingStateChange, disabled }) => {
    const reduceMotion = useReducedMotion();
    const [isRecording, setIsRecording] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [waveformBars, setWaveformBars] = useState<number[]>(new Array(WAVEFORM_BAR_COUNT).fill(3));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const recordingRef = useRef<Audio.Recording | null>(null);
    const isRecordingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const meteringRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const waveformDataRef = useRef<number[]>(new Array(WAVEFORM_BAR_COUNT).fill(3));
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
            stopMetering();
            if (recordingRef.current) {
                logger.info('[AudioRecorder] Unmounting, cleaning up recording...');
                recordingRef.current.stopAndUnloadAsync().catch(e => logger.error('Cleanup failed', e));
                recordingRef.current = null;
            }
        };
    }, []);

    // ── Timer helpers ─────────────────────────────────────────────────────────
    const startTimer = () => {
        startTimeRef.current = Date.now();
        setElapsed(0);
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const ms = now - startTimeRef.current;
            setElapsed(ms);
            // Auto-stop at max duration
            if (ms >= MAX_DURATION_MS) {
                stopRecording();
            }
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // ── Metering helpers ──────────────────────────────────────────────────────
    const startMetering = () => {
        meteringRef.current = setInterval(async () => {
            if (!recordingRef.current || !isRecordingRef.current) return;
            try {
                const status = await recordingRef.current.getStatusAsync();
                if (status.isRecording && status.metering != null) {
                    // metering is in dBFS (negative values, -160 to 0)
                    // Normalize to 0..1 range
                    const db = status.metering;
                    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
                    // Map to bar height (3-32px range)
                    const barHeight = 3 + normalized * 29;

                    // Shift bars left and add new one
                    const newBars = [...waveformDataRef.current.slice(1), barHeight];
                    waveformDataRef.current = newBars;
                    setWaveformBars([...newBars]);
                }
            } catch {
                // Recording may have been stopped between check and status call
            }
        }, METERING_POLL_MS);
    };

    const stopMetering = () => {
        if (meteringRef.current) {
            clearInterval(meteringRef.current);
            meteringRef.current = null;
        }
    };

    // ── Animations ────────────────────────────────────────────────────────────
    const animateIn = () => {
        // Slide always animates (it's the primary state-change cue).
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: DURATIONS.normal,
            useNativeDriver: true,
        }).start();

        // Pulse is decorative — skip the loop entirely when reduced motion is on.
        if (reduceMotion) {
            pulseAnim.setValue(1);
            return;
        }
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: DURATIONS.emphasis + 200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: DURATIONS.emphasis + 200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const animateOut = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: DURATIONS.micro,
            useNativeDriver: true,
        }).start();
    };

    // ── Format ────────────────────────────────────────────────────────────────
    const formatElapsed = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // ── Start recording ───────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        if (isRecordingRef.current || isPreparing) return;

        try {
            logger.info('[AudioRecorder] Starting recording...');
            setIsPreparing(true);

            // Pre-check existing permission state — on iOS, if the user previously
            // denied mic access and `canAskAgain` is false, `requestPermissionsAsync`
            // silently returns the cached denied status without prompting. We need
            // to route the user to Settings in that case.
            const { status: existing, canAskAgain } = await Audio.getPermissionsAsync();
            if (existing !== 'granted') {
                if (!canAskAgain) {
                    // iOS has permanently denied — only recourse is Settings.
                    Alert.alert(
                        'Microphone Access',
                        'Please enable microphone access in Settings to record voice messages.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                    );
                    setIsPreparing(false);
                    return;
                }
                // First-time or re-askable — prompt.
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Microphone Access',
                        'Please enable microphone access in Settings to record voice messages.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                    );
                    setIsPreparing(false);
                    return;
                }
            }

            // Clean up any leftover recording
            if (recordingRef.current) {
                await recordingRef.current.stopAndUnloadAsync().catch(() => { });
                recordingRef.current = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            logger.info('[AudioRecorder] Creating recording with metering enabled...');
            const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

            logger.info('[AudioRecorder] Recording started successfully');
            setErrorMessage(null);
            recordingRef.current = recording;
            isRecordingRef.current = true;
            waveformDataRef.current = new Array(WAVEFORM_BAR_COUNT).fill(3);
            setWaveformBars(new Array(WAVEFORM_BAR_COUNT).fill(3));
            setIsRecording(true);
            setIsPreparing(false);
            onRecordingStateChange?.(true);

            animateIn();
            startTimer();
            startMetering();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        } catch (err) {
            logger.error('[AudioRecorder] Failed to start recording', err);
            setErrorMessage('Could not start microphone. Please try again.');
            setIsPreparing(false);
            setIsRecording(false);
            isRecordingRef.current = false;
            onRecordingStateChange?.(false);
        }
    }, [isPreparing]);

    // ── Stop recording (send) ─────────────────────────────────────────────────
    const stopRecording = useCallback(async () => {
        if (!isRecordingRef.current || !recordingRef.current) {
            logger.info('[AudioRecorder] Stop called but no active recording.');
            return;
        }

        try {
            const recording = recordingRef.current;
            recordingRef.current = null;
            isRecordingRef.current = false;

            setIsRecording(false);
            onRecordingStateChange?.(false);
            animateOut();
            stopTimer();
            stopMetering();

            logger.info('[AudioRecorder] Stopping recording...');
            const status = await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recording.getURI();
            logger.info('[AudioRecorder] Recording stopped.', {
                uri,
                duration: status.durationMillis,
            });

            if (uri && status.durationMillis && status.durationMillis > MIN_DURATION_MS) {
                logger.info('[AudioRecorder] Success — sending to parent.');
                onRecordingComplete(uri, status.durationMillis);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            } else {
                logger.warn('[AudioRecorder] Recording too short or no URI.', {
                    hasUri: !!uri,
                    duration: status.durationMillis,
                });
                setErrorMessage('Hold for at least 1 second to send a voice note.');
            }
        } catch (err) {
            logger.error('[AudioRecorder] Error stopping recording:', err);
            setErrorMessage('Something went wrong while saving the audio.');
            setIsRecording(false);
            onRecordingStateChange?.(false);
            isRecordingRef.current = false;
            recordingRef.current = null;
            animateOut();
            stopTimer();
            stopMetering();
        }
    }, [onRecordingComplete]);

    // ── Cancel recording ──────────────────────────────────────────────────────
    const cancelRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            const recording = recordingRef.current;
            recordingRef.current = null;
            isRecordingRef.current = false;

            setIsRecording(false);
            onRecordingStateChange?.(false);
            animateOut();
            stopTimer();
            stopMetering();

            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            logger.info('[AudioRecorder] Recording cancelled.');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        } catch (err) {
            logger.error('[AudioRecorder] Error cancelling recording:', err);
            setIsRecording(false);
            onRecordingStateChange?.(false);
            isRecordingRef.current = false;
            recordingRef.current = null;
        }
    }, []);

    // ── Tap handler (start toggle) ────────────────────────────────────────────
    const handleMicPress = useCallback(() => {
        if (isRecordingRef.current) {
            // If already recording, tapping mic sends
            stopRecording();
        } else {
            startRecording();
        }
    }, [startRecording, stopRecording]);

    // ── Render: idle state (just the mic button) ──────────────────────────────
    if (!isRecording) {
        return (
            <View>
                <TouchableOpacity
                    onPress={() => { setErrorMessage(null); handleMicPress(); }}
                    disabled={disabled || isPreparing}
                    activeOpacity={0.7}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    style={[
                        styles.micButton,
                        (disabled || isPreparing) && styles.micButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={isPreparing ? 'Preparing microphone' : 'Record voice note'}
                    accessibilityState={{ disabled: disabled || isPreparing }}
                >
                    <EvaIcon
                        name="mic"
                        variant="outline"
                        size={24}
                        color="white"
                        style={{ opacity: isPreparing ? 0.4 : 1 }}
                    />
                </TouchableOpacity>
                {errorMessage && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText} numberOfLines={2}>{errorMessage}</Text>
                    </View>
                )}
            </View>
        );
    }

    // ── Render: recording state (full-width iMessage-like bar) ─────────────────
    return (
        <Animated.View
            accessibilityRole="timer"
            accessibilityLabel={`Recording voice note, ${formatElapsed(elapsed)} elapsed`}
            style={[
                styles.recordingBar,
                {
                    opacity: slideAnim,
                    transform: [{
                        translateY: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                        }),
                    }],
                },
            ]}
        >
            {/* Cancel button */}
            <TouchableOpacity
                onPress={cancelRecording}
                activeOpacity={0.7}
                style={styles.cancelButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cancel recording"
            >
                <EvaIcon name="trash-2" variant="outline" size={20} color={COLORS.error} />
            </TouchableOpacity>

            {/* Waveform + Timer */}
            <View style={styles.waveformContainer}>
                {/* Live recording dot */}
                <Animated.View
                    style={[
                        styles.recordingDot,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                />

                {/* Timer */}
                <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>

                {/* Waveform bars */}
                <View style={styles.waveformBars}>
                    {waveformBars.map((height, i) => (
                        <View
                            key={i}
                            style={[
                                styles.waveformBar,
                                {
                                    height: Math.max(3, height),
                                    opacity: 0.4 + (i / WAVEFORM_BAR_COUNT) * 0.6,
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>

            {/* Send button */}
            <TouchableOpacity
                onPress={stopRecording}
                activeOpacity={0.7}
                style={styles.sendButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Send voice note"
            >
                <EvaIcon name="arrow-upward" variant="outline" size={20} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Idle mic button — 44x44 meets iOS HIG minimum touch target.
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButtonDisabled: {
        opacity: 0.5,
    },

    // Recording bar (replaces the entire input row)
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 48,
        paddingHorizontal: 6,
        flex: 1,
    },

    // Cancel (trash) button
    cancelButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Waveform + timer container
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        height: 36,
    },

    // Pulsing red dot
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error,
        marginRight: 8,
    },

    // Timer text
    timerText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semiBold,
        color: COLORS.error,
        marginRight: 10,
        minWidth: 36,
        fontVariant: ['tabular-nums'],
    },

    // Waveform bar container
    waveformBars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 32,
    },

    // Individual waveform bar
    waveformBar: {
        width: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.error,
    },

    // Send button
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Inline error banner (shown below mic button)
    errorBanner: {
        position: 'absolute',
        bottom: 48,
        right: 0,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 180,
        maxWidth: 260,
    },
    errorText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        color: COLORS.error,
    },
});
