import React from 'react';
import { View, Text } from 'react-native';
import { Badge } from '../common/Badge';

interface ComparisonSectionProps {
    title: string;
    matchScore?: string;
    children: React.ReactNode;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({ title, matchScore, children }) => {
    const getVariant = () => {
        if (!matchScore) return 'info';
        if (matchScore.includes('2/2')) return 'match';
        if (matchScore === 'Match') return 'info';
        if (matchScore.includes('0/')) return 'mismatch';
        return 'warning';
    };

    return (
        <View className="mb-3 bg-[#FFFFFF] rounded-xl p-3 shadow-[0px_4px_4px_rgba(0,0,0,0.05)] border border-[rgba(1,1,1,0.1)]">
            <View className="flex-row justify-between items-center mb-3">
                <Text className="font-outfit-medium text-[#2563EB] text-[16px] leading-[20px]">
                    {title}
                </Text>
                {matchScore && (
                    <Badge
                        label={matchScore}
                        variant={getVariant()}
                    />
                )}
            </View>
            <View>
                {children}
            </View>
        </View>
    );
};
