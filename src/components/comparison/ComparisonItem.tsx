import React from 'react';
import { View, Text } from 'react-native';
import { Check, X, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';

interface ComparisonItemProps {
    label: string;
    userValue: string | string[];
    partnerValue: string | string[];
    status: 'match' | 'mismatch' | 'warning' | 'none';
}

export const ComparisonItem: React.FC<ComparisonItemProps> = ({
    label,
    userValue,
    partnerValue,
    status
}) => {
    const renderIcon = () => {
        switch (status) {
            case 'match': return <Check size={19} color="#34C759" strokeWidth={3} />;
            case 'mismatch': return <X size={19} color="#FF383C" strokeWidth={3} />;
            case 'warning': return <AlertTriangle size={19} color="#FFA629" strokeWidth={3} />;
            default: return <View className="w-5" />;
        }
    };

    const ValueBox = ({ value, label }: { value: string | string[], label: string }) => {
        if (Array.isArray(value)) {
            return (
                <View className="flex-1 flex-row flex-wrap gap-[4px] items-start p-2.5 bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] rounded-xl">
                    <Text className="font-outfit-medium text-[13px] leading-[16px] text-[#010101]/50 w-full mb-1">{label}</Text>
                    {value.map((v, i) => (
                        <View key={i} className="bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] rounded-[10px] px-2.5 py-1">
                            <Text className="font-outfit-medium text-[14px] leading-[18px] text-[#010101]">{v}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View className="flex-1 bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] rounded-xl p-2.5 items-start justify-center min-h-[58px]">
                <Text className="font-outfit-medium text-[13px] leading-[16px] text-[#010101]/50 mb-1">{label}</Text>
                <Text className="font-outfit-medium text-[14px] leading-[18px] text-[#010101]">{value}</Text>
            </View>
        );
    };

    return (
        <View className="flex-row items-center justify-between mb-3 min-h-[58px]">
            <ValueBox value={userValue} label={label} />

            <View className="items-center justify-center w-[43px]">
                {renderIcon()}
            </View>

            <ValueBox value={partnerValue} label={label} />
        </View>
    );
};
