import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { styled } from 'nativewind';
import * as FileSystem from 'expo-file-system/legacy';
import { BodySmall } from '../ui/Typography';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';
import { FONTS } from '../../constants/typography';
import { EvaIcon } from '../icons';

const logger = createLogger('AudioPlayer');

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface AudioPlayerProps {
    uri: string;
    duration?: number;
    isOwnMessage: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri, duration, isOwnMessage }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [isLoading, setIsLoading] = useState(false);
    // Hold the current sound via ref so the unmount cleanup effect can reach
    // it without depending on the `sound` state (which would cause the effect
    // to tear down and re-run on every setSound, unloading the sound we just
    // created). See Wave 14 leak fix.
    const soundRef = useRef<Audio.Sound | null>(null);
    // Track any file we downloaded into cacheDirectory so we can delete it on
    // unmount — otherwise `audio_<timestamp>.m4a` accumulates forever.
    const downloadedUriRef = useRef<string | null>(null);

    // Mount/unmount-only cleanup — runs once, exactly at unmount.
    useEffect(() => {
        return () => {
            soundRef.current?.unloadAsync().catch(() => { /* best-effort */ });
            soundRef.current = null;
            const cachedUri = downloadedUriRef.current;
            if (cachedUri) {
                FileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => { /* best-effort */ });
                downloadedUriRef.current = null;
            }
        };
    }, []);

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setTotalDuration(status.durationMillis || totalDuration);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                sound?.setPositionAsync(0);
            }
        }
    };

    const playPause = async () => {
        try {
            if (sound === null) {
                setIsLoading(true);
                // Ensure audio mode is set for playback (recording mode blocks playback on iOS)
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                });

                // Download remote files locally first — iOS AVPlayer can't stream all formats
                let playbackUri = uri;
                if (uri.startsWith('http')) {
                    const ext = uri.match(/\.(\w+?)(\?|$)/)?.[1] || 'm4a';
                    const localPath = `${FileSystem.cacheDirectory}audio_${Date.now()}.${ext}`;
                    const download = await FileSystem.downloadAsync(uri, localPath);
                    logger.info('Downloaded audio to:', download.uri);
                    playbackUri = download.uri;
                    // Remember the URI so the unmount cleanup effect can delete it
                    downloadedUriRef.current = download.uri;
                }

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: playbackUri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                soundRef.current = newSound;
                setIsLoading(false);
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                } else {
                    if (position >= totalDuration) {
                        await sound.setPositionAsync(0);
                    }
                    await sound.playAsync();
                }
            }
        } catch (error) {
            logger.error('Error playing audio', error);
            setIsLoading(false);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const progress = totalDuration > 0 ? (position / totalDuration) * 100 : 0;

    const trackBg = isOwnMessage ? 'rgba(255,255,255,0.3)' : COLORS.border;
    const fillBg = isOwnMessage ? '#FFFFFF' : COLORS.primary;
    const playButtonBg = isOwnMessage ? 'rgba(255,255,255,0.2)' : COLORS.primaryLight;
    const timeColor = isOwnMessage ? 'rgba(255,255,255,0.8)' : COLORS.text.tertiary;

    return (
        <StyledView className="flex-row items-center min-w-[150px] py-1">
            <StyledTouchableOpacity
                onPress={playPause}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: playButtonBg }}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isOwnMessage ? 'white' : COLORS.primaryAccent} />
                ) : (
                    <EvaIcon
                        name={isPlaying ? 'pause-circle' : 'play-circle'}
                        variant="outline"
                        size={24}
                        color={isOwnMessage ? 'white' : COLORS.primaryAccent}
                    />
                )}
            </StyledTouchableOpacity>

            <StyledView className="flex-1 ml-3 mr-2">
                <StyledView className="h-1 rounded-full" style={{ backgroundColor: trackBg }}>
                    <StyledView
                        style={{ width: `${progress}%`, backgroundColor: fillBg }}
                        className="h-full rounded-full"
                    />
                </StyledView>
                <StyledView className="flex-row justify-between mt-1">
                    <BodySmall style={{ fontVariant: ['tabular-nums'], fontFamily: FONTS.medium, color: timeColor }}>
                        {formatTime(position)}
                    </BodySmall>
                    <BodySmall style={{ fontVariant: ['tabular-nums'], fontFamily: FONTS.medium, color: timeColor }}>
                        {formatTime(totalDuration)}
                    </BodySmall>
                </StyledView>
            </StyledView>
        </StyledView>
    );
};
