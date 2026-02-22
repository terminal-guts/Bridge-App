import React from 'react';
import { View, Text } from 'react-native';
import { HelpCircle } from 'lucide-react-native';

export default function CommunityValidation() {
    return (
        <View className="bg-white border border-black/10 shadow-sm rounded-xl p-3 w-full max-w-[343px] self-center mb-3">
            <View className="flex flex-row justify-between items-center mb-4">
                <Text className="font-outfit-medium text-[#2563EB]/20 text-base">
                    Community validation
                </Text>
                <View className="flex flex-row items-center justify-center py-1 px-2.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full shadow-[0px_4px_8px_rgba(37,99,235,0.21)] gap-1">
                    <HelpCircle size={14} color="#2563EB" />
                    <Text className="font-outfit-regular text-[#2563EB] text-xs">
                        Why this match
                    </Text>
                </View>
            </View>

            <View className="flex flex-row justify-between items-center gap-3">
                <View className="relative h-2 w-[270px] bg-black/5 rounded-full overflow-hidden flex-1">
                    <View className="absolute left-0 top-0 h-full w-[75%] bg-[#2563EB]/20 rounded-full" />
                </View>
                <Text className="font-outfit-semibold text-[#010101]/30 text-xl leading-relaxed">
                    75%
                </Text>
            </View>
        </View>
    );
}
