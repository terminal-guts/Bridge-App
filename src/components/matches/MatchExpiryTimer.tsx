import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/typography';

interface MatchExpiryTimerProps {
    expiresAt: number; // Unix ms timestamp to count down to
}

/**
 * Countdown timer badge — same visual style as CommunityScreen's MatchResetTimer.
 * Color thresholds per match screen spec:
 *   ≥ 24h  → green
 *   ≥ 12h  → yellow
 *   ≥  4h  → orange
 *   <  4h  → red
 */
export function MatchExpiryTimer({ expiresAt }: MatchExpiryTimerProps) {
    const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

    useEffect(() => {
        const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    if (remaining <= 0) return null;

    const hours   = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    let label: string;
    if (hours > 0) {
        label = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        label = `${minutes}m ${seconds}s`;
    } else {
        label = `${seconds}s`;
    }

    let color: string;
    let bgColor: string;
    let borderColor: string;
    if (remaining >= 24 * 3600000) {
        color = '#1D9E50';
        bgColor = 'rgba(52, 199, 89, 0.08)';
        borderColor = 'rgba(52, 199, 89, 0.25)';
    } else if (remaining >= 12 * 3600000) {
        color = '#C9A800';
        bgColor = 'rgba(212, 170, 1, 0.08)';
        borderColor = 'rgba(212, 170, 1, 0.25)';
    } else if (remaining >= 4 * 3600000) {
        color = '#C96B00';
        bgColor = 'rgba(255, 141, 40, 0.08)';
        borderColor = 'rgba(255, 141, 40, 0.25)';
    } else {
        color = '#D92D20';
        bgColor = 'rgba(255, 56, 60, 0.08)';
        borderColor = 'rgba(255, 56, 60, 0.25)';
    }

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgColor,
            borderWidth: 1,
            borderColor,
            borderRadius: 10,
            paddingHorizontal: 9,
            height: 34,
            gap: 5,
        }}>
            <Ionicons name="time-outline" size={13} color={color} />
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: FONTS.semiBold, color }}>{label}</Text>
        </View>
    );
}
