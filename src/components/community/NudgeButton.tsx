import React, { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mediumHaptic } from '../../utils/haptics';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../icons';
import { SPRINGS } from '../../constants/animations';

interface NudgeButtonProps {
    friendId: string;
    friendName: string;
    onNudge: (friendId: string) => void;
    disabled?: boolean;
}

function getTodayKey(friendId: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `@bridge_friend_nudge_${friendId}_${today}`;
}

export const NudgeButton: React.FC<NudgeButtonProps> = React.memo(({ friendId, friendName, onNudge, disabled }) => {
    const [nudged, setNudged] = useState(false);
    const [loading, setLoading] = useState(false);

    const iconScale = useSharedValue(1);
    const iconRotation = useSharedValue(0);

    // Check on mount if already nudged today
    React.useEffect(() => {
        AsyncStorage.getItem(getTodayKey(friendId)).then(val => {
            if (val) setNudged(true);
        });
    }, [friendId]);

    const handleNudge = useCallback(async () => {
        if (nudged || loading || disabled) return;
        setLoading(true);
        mediumHaptic();

        // Bell ring animation: rotate back and forth, then scale down + up for icon swap
        iconRotation.value = withSequence(
            withTiming(15, { duration: 60 }),
            withTiming(-15, { duration: 60 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(0, { duration: 40 }),
        );
        iconScale.value = withSequence(
            withTiming(0.6, { duration: 150 }),
            withSpring(1.15, SPRINGS.bouncy),
            withSpring(1, SPRINGS.snappy),
        );

        try {
            await AsyncStorage.setItem(getTodayKey(friendId), 'true');
            onNudge(friendId);
            setNudged(true);
        } finally {
            setLoading(false);
        }
    }, [nudged, loading, disabled, friendId, onNudge]);

    const isDisabled = nudged || disabled || loading;

    const iconAnimStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    return (
        <TouchableOpacity
            onPress={handleNudge}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[styles.button, isDisabled && styles.buttonDisabled]}
            accessibilityLabel={nudged ? `Already nudged ${friendName}` : `Nudge ${friendName} to vote`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
        >
            <Animated.View style={iconAnimStyle}>
                <EvaIcon
                    name={nudged ? 'checkmark' : 'bell'}
                    variant="outline"
                    size={14}
                    color={isDisabled ? COLORS.text.disabled : COLORS.primaryButton}
                />
            </Animated.View>
            {nudged && <Text style={styles.sentText}>Sent</Text>}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.primaryButton,
        backgroundColor: COLORS.backgroundFriendActive,
        gap: 4,
    },
    buttonDisabled: {
        borderColor: COLORS.borderGray,
        backgroundColor: COLORS.backgroundGray,
    },
    sentText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.disabled,
    },
});
