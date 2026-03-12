import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { SimpleChip } from '../../../components/ui/SimpleChip';
import { lightHaptic } from '../../../utils/haptics';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);
const StyledText = styled(Text);

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;

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
      <H3 className="mb-4">Interests <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
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
