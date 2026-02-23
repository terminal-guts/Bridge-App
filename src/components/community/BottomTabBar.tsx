import React from 'react';
import { View, TouchableOpacity, SafeAreaView } from 'react-native';
import { UsersTabIcon, HandshakeTabIcon, ProfileTabIcon } from '../Icons/Icons';

export const BottomTabBar: React.FC = () => {
    return (
        <SafeAreaView className="bg-white border-t border-[#E9EDF5] h-[72px]">
            <View className="flex-row items-center justify-around h-full px-4 relative">
                <TouchableOpacity className="items-center justify-center flex-1 h-full relative">
                    {/* Active Indicator Line */}
                    <View className="absolute top-0 w-[44px] h-[4px] rounded-b-[4px] bg-[#2B65F9]" />
                    <View className="text-[#2B65F9]">
                        <UsersTabIcon size={30} color="#2B65F9" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity className="items-center justify-center flex-1 h-full">
                    <View className="text-[#8D8D8D]">
                        <HandshakeTabIcon size={30} color="#8D8D8D" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity className="items-center justify-center flex-1 h-full">
                    <View className="text-[#8D8D8D]">
                        <ProfileTabIcon size={30} color="#8D8D8D" />
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
