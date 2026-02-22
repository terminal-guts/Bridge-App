import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check, X, UserPlus, Info } from 'lucide-react-native';

export const ActionButtons: React.FC = () => {
    return (
        <View className="px-4 pb-8 pt-5 bg-white/95">
            {/* Primary "Yes" Button */}
            <TouchableOpacity
                className="bg-[#2563EB] h-[46px] rounded-[10px] flex-row items-center justify-center mb-3 shadow-sm"
                activeOpacity={0.8}
            >
                <Check size={19} color="white" strokeWidth={3} />
                <Text className="font-outfit-medium text-white text-[16px] leading-[20px] ml-1">Yes</Text>
            </TouchableOpacity>

            {/* Secondary Buttons Row */}
            <View className="flex-row justify-between gap-3">
                <TouchableOpacity
                    className="flex-1 bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] h-[63px] rounded-xl items-center justify-center"
                    activeOpacity={0.7}
                >
                    <X size={18} color="#010101" strokeWidth={2} opacity={0.5} />
                    <Text className="font-outfit-medium text-[#010101]/50 text-[14px] leading-[18px] mt-1.5">No</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] h-[63px] rounded-xl items-center justify-center"
                    activeOpacity={0.7}
                >
                    <UserPlus size={18} color="#010101" strokeWidth={2} opacity={0.5} />
                    <Text className="font-outfit-medium text-[#010101]/50 text-[14px] leading-[18px] mt-1.5">For Friend</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] h-[63px] rounded-xl items-center justify-center"
                    activeOpacity={0.7}
                >
                    <Info size={19} color="#010101" strokeWidth={2} opacity={0.5} />
                    <Text className="font-outfit-medium text-[#010101]/50 text-[14px] leading-[18px] mt-1.5">Not Sure</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
