import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star } from '../icons/LucideReplacements';
import { FONTS } from '../../constants/typography';

export default function ProfileMatchImage() {
    return (
        <View className="relative w-full h-[451px]">
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=375&h=451' }}
                className="w-full h-full rounded-[30px] overflow-hidden bg-[#D9D9D9]"
                resizeMode="cover"
            >
                <View className="absolute top-[64px] left-4 right-4 flex-row justify-between items-center z-50">
                    <TouchableOpacity className="w-6 h-6 items-center justify-center">
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>

                    <View className="flex-row gap-2 items-center mr-1">
                        <View className="w-4 h-1 bg-white rounded-[20px]" />
                        <View className="w-4 h-1 bg-[#D9D9D9]/20 rounded-[20px]" />
                        <View className="w-4 h-1 bg-[#D9D9D9]/20 rounded-[20px]" />
                        <View className="w-4 h-1 bg-[#D9D9D9]/20 rounded-[20px]" />
                        <View className="w-4 h-1 bg-[#D9D9D9]/20 rounded-[20px]" />
                        <View className="w-4 h-1 bg-[#D9D9D9]/20 rounded-[20px]" />
                    </View>
                </View>

                <View className="absolute bottom-[24px] right-[16px] flex-row items-center gap-[5px] px-2.5 py-2 bg-[#34C759]/10 border border-[#34C759] rounded-lg overflow-hidden backdrop-blur-3xl">
                    <View className="w-3.5 h-3.5 border-[1.5px] border-[#34C759] rounded-sm flex items-center justify-center">
                        <Star size={10} color="#34C759" fill="#34C759" />
                    </View>
                    <Text className="font-semibold text-[#34C759] text-xs" style={{ fontFamily: FONTS.semiBold }}>
                        Karma Pts : 80 pts
                    </Text>
                </View>
            </ImageBackground>
        </View>
    );
}
