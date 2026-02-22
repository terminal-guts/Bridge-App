import React from 'react';
import { View, Text } from 'react-native';

interface TagCloudProps {
    title: string;
    tags: string[];
}

export const TagCloud: React.FC<TagCloudProps> = ({ title, tags }) => {
    return (
        <View className="mb-2.5 px-0">
            <Text className="font-outfit-regular text-[#010101]/60 text-[14px] leading-[18px] mb-2.5">{title}</Text>
            <View className="flex-row flex-wrap gap-2">
                {tags.map((tag, index) => (
                    <View
                        key={index}
                        className="bg-[rgba(1,1,1,0.02)] border border-[rgba(1,1,1,0.04)] px-2.5 py-1.5 rounded-[40px] items-center justify-center h-[30px]"
                    >
                        <Text className="font-outfit-regular text-[14px] leading-[18px] text-[#010101]/80">{tag}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};
