import React from 'react';
import { View, Text, ImageBackground, Image } from 'react-native';
import { useCompatibility } from '../../context/CompatibilityContext';
import { ArrowLeft } from 'lucide-react-native';

export const ProfileHeader: React.FC = () => {
    const { data } = useCompatibility();

    return (
        <View className="px-4 pt-2">
            <View className="mb-4">
                <ArrowLeft size={24} color="#000" />
            </View>

            <View className="flex-row justify-between items-center relative h-[240px]">
                {/* User 1 */}
                <View className="w-[49%] h-full rounded-[14px] bg-black relative overflow-hidden">
                    <Image
                        source={{ uri: data.user1.image }}
                        style={{ width: '100%', height: '100%', position: 'absolute' }}
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <View className="absolute bottom-0 left-0 right-0 p-3 z-10">
                        <Text className="font-outfit-semibold text-white text-[22px] leading-[28px]">{data.user1.name}, {data.user1.age}</Text>
                        <Text className="font-outfit-regular text-white text-[14px] leading-[18px]">{data.user1.role}</Text>
                    </View>
                </View>

                {/* Match Percentage Overlay Image directly from user's assets */}
                <View className="absolute left-1/2 top-1/2 -ml-[45px] -mt-[19px] z-20 shadow-sm shadow-blue-500/20">
                    <Image
                        source={{ uri: "https://files.catbox.moe/armjgh.png" }}
                        style={{ width: 90, height: 38 }}
                        resizeMode="contain"
                    />
                </View>

                {/* User 2 */}
                <View className="w-[49%] h-full rounded-[14px] bg-black relative overflow-hidden">
                    <Image
                        source={{ uri: data.user2.image }}
                        style={{ width: '100%', height: '100%', position: 'absolute' }}
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <View className="absolute bottom-0 left-0 right-0 p-3 z-10">
                        <Text className="font-outfit-semibold text-white text-[22px] leading-[28px]">{data.user2.name}, {data.user2.age}</Text>
                        <Text className="font-outfit-regular text-white text-[14px] leading-[18px]">{data.user2.role}</Text>
                    </View>
                </View>
            </View>

            <View className="mt-6 mb-2">
                <Text className="font-outfit-regular text-center text-[#010101]/60 text-[15px] leading-[24px]">
                    Look through each section to see where they align{"\n"}and where they differ.
                </Text>
            </View>
        </View>
    );
};
