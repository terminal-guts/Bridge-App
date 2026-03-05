import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { SimpleChip } from '../../../components/ui/SimpleChip';
import { lightHaptic } from '../../../utils/haptics';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);
const StyledText = styled(Text);

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 8;

const AVAILABLE_INTERESTS = [
  // Activities
  'Tennis', 'Golf', 'Running', 'Yoga', 'Pilates', 'CrossFit', 'Hiking', 'Skiing',
  'Cycling', 'Swimming', 'Basketball', 'Soccer', 'Climbing',

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
];

// Convert to Set for O(1) lookup instead of O(n)
const AVAILABLE_INTERESTS_SET = new Set(AVAILABLE_INTERESTS);

interface InterestsSectionProps {
  interests: string[];
  onToggleInterest: (interest: string) => void;
  onShowCustomInterestModal: () => void;
}

export const InterestsSection = React.memo<InterestsSectionProps>(({
  interests,
  onToggleInterest,
  onShowCustomInterestModal,
}) => {
  // Memoize Set conversion for O(1) lookup - CRITICAL for performance
  const interestsSet = useMemo(() => new Set(interests), [interests]);

  // Filter custom interests using Set for O(1) lookup
  const customInterests = useMemo(() =>
    interests.filter(i => !AVAILABLE_INTERESTS_SET.has(i)),
    [interests]
  );

  const handleToggleInterest = useCallback((interest: string) => {
    lightHaptic();
    onToggleInterest(interest);
  }, [onToggleInterest]);

  const handleRemoveCustomInterest = useCallback((customInterest: string) => {
    lightHaptic();
    onToggleInterest(customInterest);
  }, [onToggleInterest]);

  return (
    <Card className="mb-8">
      <H3 className="mb-4">Interests <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
      <Body className="text-neutral-600 text-sm mb-4">
        Select or add your interests (Select {MIN_INTERESTS}-{MAX_INTERESTS})
      </Body>

      {/* Available Interests Grid */}
      <StyledView className="flex-row flex-wrap gap-2 mb-4">
        {AVAILABLE_INTERESTS.map((interest) => (
          <SimpleChip
            key={interest}
            label={interest}
            selected={interestsSet.has(interest)}
            onPress={() => handleToggleInterest(interest)}
          />
        ))}

        {/* Custom interests (not in predefined list) */}
        {customInterests.map((customInterest) => (
          <StyledTouchableOpacity
            key={customInterest}
            activeOpacity={1}
            delayPressIn={0}
            onPress={() => handleRemoveCustomInterest(customInterest)}
            className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
          >
            <Body className="text-sm text-white font-medium">{customInterest}</Body>
          </StyledTouchableOpacity>
        ))}

        {/* "Other" Button */}
        <StyledTouchableOpacity
          onPress={() => {
            lightHaptic();
            onShowCustomInterestModal();
          }}
          className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50"
        >
          <Body className="text-sm text-neutral-600">+ Other</Body>
        </StyledTouchableOpacity>
      </StyledView>
    </Card>
  );
});

InterestsSection.displayName = 'InterestsSection';
