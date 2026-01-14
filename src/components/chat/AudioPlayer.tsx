import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { BodySmall } from '../ui/Typography';

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

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

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
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
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
            console.error('Error playing audio', error);
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

    return (
        <StyledView className="flex-row items-center min-w-[150px] py-1">
            <StyledTouchableOpacity
                onPress={playPause}
                className={`w-10 h-10 rounded-full items-center justify-center ${isOwnMessage ? 'bg-white/20' : 'bg-primary-50'
                    }`}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isOwnMessage ? 'white' : '#437FFF'} />
                ) : (
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={24}
                        color={isOwnMessage ? 'white' : '#437FFF'}
                    />
                )}
            </StyledTouchableOpacity>

            <StyledView className="flex-1 ml-3 mr-2">
                <StyledView className={`h-1 rounded-full ${isOwnMessage ? 'bg-white/30' : 'bg-neutral-200'}`}>
                    <StyledView
                        style={{ width: `${progress}%` }}
                        className={`h-full rounded-full ${isOwnMessage ? 'bg-white' : 'bg-primary-500'}`}
                    />
                </StyledView>
                <StyledView className="flex-row justify-between mt-1">
                    <BodySmall className={isOwnMessage ? 'text-white/80' : 'text-neutral-500'}>
                        {formatTime(position)}
                    </BodySmall>
                    <BodySmall className={isOwnMessage ? 'text-white/80' : 'text-neutral-500'}>
                        {formatTime(totalDuration)}
                    </BodySmall>
                </StyledView>
            </StyledView>
        </StyledView>
    );
};
