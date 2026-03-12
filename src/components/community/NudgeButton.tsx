import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../icons';

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
        try {
            await AsyncStorage.setItem(getTodayKey(friendId), 'true');
            onNudge(friendId);
            setNudged(true);
        } finally {
            setLoading(false);
        }
    }, [nudged, loading, disabled, friendId, onNudge]);

    const isDisabled = nudged || disabled || loading;

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
            <EvaIcon
                name={nudged ? 'checkmark' : 'bell'}
                variant="outline"
                size={14}
                color={isDisabled ? COLORS.text.disabled : COLORS.primaryButton}
            />
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
        backgroundColor: '#EEF3FF',
        gap: 4,
    },
    buttonDisabled: {
        borderColor: COLORS.borderGray,
        backgroundColor: COLORS.backgroundGray,
    },
    sentText: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        color: COLORS.text.disabled,
    },
});
