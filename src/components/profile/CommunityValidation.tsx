import React from 'react';
import { View, Text } from 'react-native';
import { FONTS } from '../../constants/typography';

export default function CommunityValidation() {
    return (
        <View className="bg-white border border-black/10 shadow-sm rounded-xl p-3 w-full max-w-[343px] self-center mb-3">
            <View className="flex flex-row justify-between items-center mb-4">
                <Text className="font-medium text-[#2563EB]/20 text-base" style={{ fontFamily: FONTS.medium }}>
                    Community validation
                </Text>
            </View>

            <View className="flex flex-row justify-between items-center gap-3">
                <View className="relative h-2 w-[270px] bg-black/5 rounded-full overflow-hidden flex-1">
                    <View className="absolute left-0 top-0 h-full w-[75%] bg-[#2563EB]/20 rounded-full" />
                </View>
                <Text className="font-semibold text-[#101828]/30 text-xl leading-relaxed" style={{ fontFamily: FONTS.semiBold }}>
                    75%
                </Text>
            </View>
        </View>
    );
}
