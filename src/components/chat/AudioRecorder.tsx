import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('AudioRecorder');

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface AudioRecorderProps {
    onRecordingComplete: (uri: string, durationMillis: number) => void;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const isButtonPressed = useRef(false); // Track if user is currently holding the button
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (recordingRef.current) {
                logger.info('[DEBUG] Unmounting, cleaning up recording...');
                recordingRef.current.stopAndUnloadAsync().catch(e => logger.error('Cleanup failed', e));
                recordingRef.current = null;
            }
        };
    }, []);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopPulse = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    };

    async function startRecording() {
        if (isRecording || isPreparing) return;

        isButtonPressed.current = true;

        try {
            logger.info('[DEBUG] 1. Starting preparation...');
            setIsPreparing(true);
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status !== 'granted') {
                Alert.alert('Microphone Access', 'Please enable microphone access to send voice notes.');
                setIsPreparing(false);
                isButtonPressed.current = false;
                return;
            }

            // Ensure previous is cleaned up just in case
            if (recordingRef.current) {
                await recordingRef.current.stopAndUnloadAsync().catch(() => { });
                recordingRef.current = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            logger.info('[DEBUG] 2. Creating recording object...');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            // CRITICAL: If the user already released the button while we were creating the object
            if (!isButtonPressed.current) {
                logger.info('[DEBUG] 3a. User already released, cleaning up immediately...');
                await recording.stopAndUnloadAsync();
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                setIsPreparing(false);
                return;
            }

            logger.info('[DEBUG] 3b. Recording started successfully');
            recordingRef.current = recording;
            setIsRecording(true);
            setIsPreparing(false);
            startPulse();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err) {
            logger.error('Failed to start recording', err);
            Alert.alert('Error', 'Could not start microphone');
            setIsPreparing(false);
            setIsRecording(false);
        }
    }

    async function stopRecording() {
        const stopTime = Date.now();
        logger.info('[DEBUG] stopRecording triggered at:', stopTime);
        isButtonPressed.current = false;

        if (isPreparing && !isRecording) {
            logger.info('[DEBUG] Released while still preparing. Button state cleared.');
            setIsPreparing(false);
            return;
        }

        if (!recordingRef.current) {
            logger.info('[DEBUG] No active recording object found during stop.');
            setIsRecording(false);
            setIsPreparing(false);
            return;
        }

        try {
            const recording = recordingRef.current;
            recordingRef.current = null;

            setIsRecording(false);
            stopPulse();

            logger.info('[DEBUG] 4. Calling stopAndUnloadAsync...');
            const status = await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recording.getURI();
            logger.info('[DEBUG] 5. Recording stopped.', {
                uri,
                duration: status.durationMillis,
                canRecord: status.canRecord
            });

            if (uri && status.durationMillis && status.durationMillis > 200) {
                logger.info('[DEBUG] 6. Success! Sending to parent.');
                onRecordingComplete(uri, status.durationMillis);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                logger.warn('[DEBUG] 6. Recording rejected:', {
                    hasUri: !!uri,
                    duration: status.durationMillis,
                    threshold: 200
                });
                Alert.alert('Hold to Talk', 'Press and hold to record. Make sure the button turns red before releasing.');
            }
        } catch (err) {
            logger.error('[DEBUG] ERROR in stopRecording:', err);
            Alert.alert('Error', 'Something went wrong while saving the audio.');
            setIsRecording(false);
            recordingRef.current = null;
        }
    }

    return (
        <StyledView className="items-center justify-center">
            {isRecording && (
                <Animated.View
                    style={{
                        transform: [{ scale: pulseAnim }],
                        position: 'absolute',
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    }}
                />
            )}
            <StyledTouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={disabled}
                className={`w-12 h-12 rounded-full items-center justify-center ${isRecording ? 'bg-rose-500' : 'bg-primary-500'
                    } ${disabled ? 'opacity-50' : ''}`}
            >
                <Ionicons
                    name={isRecording ? 'mic' : 'mic-outline'}
                    size={24}
                    color="white"
                    style={{ opacity: isPreparing ? 0.3 : 1 }}
                />
            </StyledTouchableOpacity>
        </StyledView>
    );
};
