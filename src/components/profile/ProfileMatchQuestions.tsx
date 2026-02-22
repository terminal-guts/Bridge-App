import React from 'react';
import { View, Text } from 'react-native';

const questions = [
    {
        q: "What's your idea of a perfect weekend?",
        a: "Exploring new places, slow mornings, and meaningful conversations with people I care about."
    },
    {
        q: "What are you most passionate about?",
        a: "Finding ways to grow, create, and support the people around me."
    },
    {
        q: "What's a life lesson that took you a while to learn?",
        a: "It's okay to change your mind and rewrite your plans when you learn more about yourself."
    }
];

export default function ProfileMatchQuestions() {
    return (
        <View className="mb-[150px]">
            <Text className="font-outfit-medium text-[#2563EB]/20 text-base mb-3 ml-4">
                Deep questions
            </Text>
            <View className="flex flex-col gap-[14px] items-center">
                {questions.map((item, index) => (
                    <View
                        key={index}
                        className="bg-white border border-black/10 shadow-sm rounded-xl p-3 w-full max-w-[343px]"
                    >
                        <Text className="font-outfit-medium text-[#010101]/30 text-sm leading-[18px] mb-1">
                            {index + 1}. {item.q}
                        </Text>
                        <Text className="font-outfit-regular text-[#010101]/15 text-[13px] leading-5">
                            {item.a}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
