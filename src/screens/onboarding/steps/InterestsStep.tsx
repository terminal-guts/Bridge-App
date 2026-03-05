import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Chip } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface InterestsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

const AVAILABLE_INTERESTS = [
  // Activities
  'Tennis', 'Golf', 'Running', 'Yoga', 'Pilates', 'CrossFit', 'Hiking', 'Skiing',
  'Cycling', 'Swimming', 'Basketball', 'Soccer', 'Climbing', 'Lifting',
  'Live Sports', 'Watching Sports',

  // Culture & Entertainment
  'Museums', 'Art Galleries', 'Theater', 'Live Music', 'Concerts', 'Comedy Shows',
  'Film', 'Documentaries', 'Reading', 'Writing', 'Photography',

  // Food & Drink
  'Cooking', 'Baking', 'Wine Tasting', 'Craft Beer', 'Coffee', 'Cocktails',
  'Fine Dining', 'Food Markets', 'Brunch',

  // Travel & Adventure
  'Travel', 'Weekend Trips', 'International Travel', 'Road Trips', 'Camping',

  // Lifestyle
  'Startups', 'Investing', 'Real Estate', 'Fashion', 'Interior Design',
  'Meditation', 'Wellness', 'Volunteering', 'Podcasts',

  // Social
  'Dinner Parties', 'Game Nights', 'Dancing', 'Karaoke', 'Trivia Nights',
  'Poker', 'Video Games',
];

export const InterestsStep: React.FC<InterestsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const initialInterests = data.interests || [];
  const predefinedSelected = initialInterests.filter(i => AVAILABLE_INTERESTS.includes(i));

  const [myInterests, setMyInterests] = useState<string[]>(predefinedSelected);
  const [error, setError] = useState('');

  const totalMyInterests = myInterests.length;

  const handlePress = (interest: string) => {
    if (myInterests.includes(interest)) {
      setMyInterests(myInterests.filter(i => i !== interest));
    } else {
      if (totalMyInterests >= 8) {
        setError('You can select up to 8 interests');
        return;
      }
      setMyInterests([...myInterests, interest]);
    }
    setError('');
  };

  const validateAndContinue = () => {
    if (totalMyInterests < 3) {
      setError('Please select at least 3 interests');
      return;
    }

    if (totalMyInterests > 8) {
      setError('You can select up to 8 interests');
      return;
    }

    updateData({
      interests: myInterests,
    });
    onNext();
  };

  const isSelected = (interest: string) => myInterests.includes(interest);

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Interests</H1>
      <Body className="text-neutral-500 text-sm mb-2">
        Select at least 3 - add custom interests later.
      </Body>
      <Body className="text-primary-500 font-semibold mb-6">
        {totalMyInterests} of 8 selected
      </Body>

      {/* Interest Categories */}
      <StyledView className="flex-row flex-wrap -mx-1 mb-4">
        {AVAILABLE_INTERESTS.map((interest) => (
          <StyledView key={interest} className="px-1 mb-2">
            <Chip
              label={interest}
              selected={isSelected(interest)}
              onPress={() => handlePress(interest)}
            />
          </StyledView>
        ))}
      </StyledView>

      {error && (
        <Body className="text-error text-sm mt-4">{error}</Body>
      )}
      </StyledView>
    </OnboardingLayout>
  );
};
