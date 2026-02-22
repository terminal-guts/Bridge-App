import React from 'react';
import { ScrollView, View, SafeAreaView, StatusBar } from 'react-native';
import { useCompatibility } from '../context/CompatibilityContext';
import { ProfileHeader } from '../components/comparison/ProfileHeader';
import { ComparisonSection } from '../components/comparison/ComparisonSection';
import { ComparisonItem } from '../components/comparison/ComparisonItem';
import { TagCloud } from '../components/comparison/TagCloud';
import { ActionButtons } from '../components/comparison/ActionButtons';

const CompatibilityScreen: React.FC = () => {
    const { data } = useCompatibility();

    return (
        <SafeAreaView className="flex-1 bg-[#FFFFFF]">
            <StatusBar barStyle="dark-content" />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 240 }}
            >
                <ProfileHeader />

                <View className="px-4 mt-6">
                    {data.sections.map((section, index) => (
                        <ComparisonSection
                            key={index}
                            title={section.title}
                            matchScore={section.matchScore}
                        >
                            <View>
                                {section.items.map((item, i) => (
                                    <ComparisonItem
                                        key={i}
                                        label={item.label}
                                        userValue={item.userValue}
                                        partnerValue={item.partnerValue}
                                        status={item.status}
                                    />
                                ))}
                            </View>
                        </ComparisonSection>
                    ))}

                    {/* Values Section */}
                    <ComparisonSection title="Values" matchScore="Match">
                        <TagCloud title="You" tags={data.values.you} />
                        <TagCloud title="Them" tags={data.values.them} />
                    </ComparisonSection>

                    {/* Interests Section */}
                    <ComparisonSection title="Interests" matchScore="Match">
                        <TagCloud title="You" tags={data.interests.you} />
                        <TagCloud title="Them" tags={data.interests.them} />
                    </ComparisonSection>
                </View>
            </ScrollView>

            {/* Floating Action Buttons */}
            <View className="absolute bottom-0 left-0 right-0">
                <ActionButtons />
            </View>
        </SafeAreaView>
    );
};

export default CompatibilityScreen;
