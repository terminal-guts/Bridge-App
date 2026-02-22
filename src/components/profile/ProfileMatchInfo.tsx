import React from 'react';
import { View, Text, Image } from 'react-native';
import { Check } from 'lucide-react-native';

export default function ProfileMatchInfo() {
  return (
    <View className="bg-white border border-black/10 shadow-sm rounded-xl p-3 w-full max-w-[343px] self-center mb-3 flex flex-col gap-2">
      <View className="flex flex-row items-center gap-2">
        <Text className="font-outfit-semibold text-[#010101] text-2xl">
          Brooklyn, 26
        </Text>
        <Check size={22} color="#2563EB" fill="#2563EB" />
      </View>

      <View className="flex flex-row items-center gap-1.5">
        <View className="relative w-5 h-5 flex flex-row items-center justify-center">
          <View className="absolute z-10 w-full h-full rounded-full border-[1.5px] border-[#00C8B3] flex items-center justify-center">
            <Text style={{ fontSize: 10 }}>💗</Text>
          </View>
        </View>
        <Text className="font-outfit-regular text-sm text-[#010101]/70">
          Matched by :
        </Text>
        <View className="flex flex-row items-center ml-1">
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
            className="w-5 h-5 rounded-full border border-white -mr-1.5 z-30"
          />
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
            className="w-5 h-5 rounded-full border border-white -mr-1.5 z-20"
          />
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=13' }}
            className="w-5 h-5 rounded-full border border-white z-10"
          />
        </View>
      </View>
    </View>
  );
}
