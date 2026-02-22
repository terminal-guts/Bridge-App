import React from 'react';
import { View, Text } from 'react-native';

interface ProfileMatchTagsProps {
    title: string;
    tags: { emoji: string; text: string }[];
}

export default function ProfileMatchTags({ title, tags }: ProfileMatchTagsProps) {
    return (
        <View className="mb-4">
            <Text className="font-outfit-medium text-[#2563EB]/20 text-base mb-2.5">
                {title}
            </Text>
            <View className="flex flex-row flex-wrap gap-2.5">
                {tags.map((tag, index) => (
                    <View
                        key={index}
                        className="flex flex-row items-center justify-center py-1.5 px-2.5 bg-black/2 rounded-full min-h-[30px]"
                    >
                        <Text className="font-outfit-regular text-[#010101]/80 text-sm">
                            {tag.emoji} {tag.text}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
