import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { X, Heart } from 'lucide-react-native';

export default function ProfileMatchActions() {
    return (
        <View className="absolute bottom-[34px] w-full flex-row justify-center items-center gap-[28px] z-50 drop-shadow-[0px_-5px_24px_rgba(0,0,0,0.28)]">
            <TouchableOpacity className="w-[62px] h-[62px] rounded-full bg-[#565164] flex items-center justify-center">
                <X size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity className="w-[62px] h-[62px] rounded-full bg-[#2563EB]/20 flex items-center justify-center">
                <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}
