import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Chip } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

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
  'Tennis', 'Golf', 'Running', 'Yoga', 'Hiking', 'Skiing',
  'Basketball', 'Lifting', 'Live Sports', 'Watching Sports',

  // Culture & Entertainment
  'Museums', 'Theater', 'Live Music', 'Comedy Shows',
  'Film', 'Reading', 'Photography',

  // Food & Drink
  'Cooking', 'Coffee', 'Cocktails', 'Fine Dining', 'Brunch',

  // Travel & Adventure
  'Travel', 'Camping',

  // Lifestyle
  'Startups', 'Investing', 'Real Estate', 'Fashion', 'Meditation', 'Podcasts',

  // Social
  'Dinner Parties', 'Game Nights', 'Dancing', 'Trivia Nights',
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
      if (totalMyInterests >= 5) {
        setError('Five is the max -- swap one out if you want to change');
        return;
      }
      setMyInterests([...myInterests, interest]);
    }
    setError('');
  };

  const handleSkip = () => {
    // Save whatever the user selected (even if < 3) so the matching
    // algorithm has partial data rather than nothing (22% weight).
    if (myInterests.length > 0) {
      updateData({ interests: myInterests });
    }
    onNext();
  };

  const validateAndContinue = () => {
    if (totalMyInterests < 3) {
      setError('Pick at least 3 so we can find great matches for you');
      return;
    }

    if (totalMyInterests > 5) {
      setError('Five is the max -- swap one out if you want to change');
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
      onSkip={handleSkip}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">What are you into?</H1>
      <Body className="text-neutral-500 text-sm mb-2">
        Pick at least 3 -- we use these to find people with shared passions.
      </Body>
      <Body className="text-primary-500 font-semibold mb-6">
        {totalMyInterests} of 5 selected
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
