import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { FriendWithGridStatus } from '../../types/community';
import { FireIcon, StarIcon } from '../icons/Icons';

interface UserRowProps {
    item: FriendWithGridStatus;
    index: number;
    onMatch?: () => void;
}

export const UserRow: React.FC<UserRowProps> = ({ item, index, onMatch }) => {
    const isAlternate = index % 2 !== 0;

    const name = item.friend.firstName || 'Unknown';
    const imageUrl = item.friend.photos?.[0]?.url || 'https://via.placeholder.com/150';
    const streak = item.streakDays || 0;
    const actionType = item.hasCompletedGrid ? 'points' : 'match';
    // Stable random fallback for bots/mocks with no assists tracked
    const stableRandom = (seed: string, min: number, max: number) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
      return min + (Math.abs(h) % (max - min));
    };
    const points = item.assistsCount > 0
      ? item.assistsCount * 10
      : stableRandom(item.friendId, 40, 180);

    return (
        <View className={`flex-row items-center justify-between px-6 py-4 ${isAlternate ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
            <View className="flex-row items-center">
                <Image
                    source={{ uri: imageUrl }}
                    className="w-[52px] h-[52px] rounded-full bg-gray-200"
                />

                <View className="justify-center ml-4">
                    <Text className="text-[17px] font-outfit-bold text-[#111111] mb-[2px]">
                        {name}
                    </Text>
                    <View className="flex-row items-center">
                        <FireIcon size={14} color="#2B65F9" />
                        <Text className="text-[14px] font-jakarta-medium text-[#737373] ml-1.5 mt-0.5">
                            {streak}-day streak
                        </Text>
                    </View>
                </View>
            </View>

            {actionType === 'match' ? (
                <TouchableOpacity onPress={onMatch} className="px-5 py-2 rounded-lg border border-[#2B65F9] bg-[#F4F7FF]">
                    <Text className="text-[#2B65F9] font-outfit-semibold text-[14px]">Match</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg border border-[#3ECC62] bg-[#F2FCF5]">
                    <StarIcon size={14} color="#3ECC62" />
                    <Text className="text-[#3ECC62] font-outfit-semibold text-[14px] ml-1.5">{points} pts</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};
