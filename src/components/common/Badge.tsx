import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
    label: string;
    variant?: 'match' | 'mismatch' | 'warning' | 'info';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info', className = '' }) => {
    const getStyles = () => {
        switch (variant) {
            case 'match': return { bg: 'bg-[rgba(52,199,89,0.1)]', text: 'text-[#34C759]' };
            case 'mismatch': return { bg: 'bg-[rgba(255,56,60,0.1)]', text: 'text-[#FF383C]' };
            case 'warning': return { bg: 'bg-[rgba(255,204,0,0.1)]', text: 'text-[#FFCC00]' };
            default: return { bg: 'bg-[rgba(52,199,89,0.04)]', text: 'text-[#34C759]' };
        }
    };

    const styles = getStyles();

    return (
        <View className={`px-2 py-1 h-[23px] rounded-[6px] items-center justify-center flex-row ${styles.bg} ${className}`}>
            <Text className={`text-[12px] font-outfit-medium leading-[15px] ${styles.text}`}>
                {label}
            </Text>
        </View>
    );
};
