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

const INTEREST_GROUPS = [
  { label: 'Sports & Fitness', items: ['Tennis', 'Golf', 'Running', 'Yoga', 'Hiking', 'Skiing', 'Basketball', 'Lifting', 'Live Sports', 'Watching Sports'] },
  { label: 'Culture', items: ['Museums', 'Theater', 'Live Music', 'Comedy Shows', 'Film', 'Reading', 'Photography'] },
  { label: 'Food & Drink', items: ['Cooking', 'Coffee', 'Cocktails', 'Fine Dining', 'Brunch'] },
  { label: 'Lifestyle', items: ['Travel', 'Camping', 'Startups', 'Investing', 'Real Estate', 'Fashion', 'Meditation', 'Podcasts'] },
  { label: 'Social', items: ['Dinner Parties', 'Game Nights', 'Dancing', 'Trivia Nights', 'Poker', 'Video Games'] },
];

const AVAILABLE_INTERESTS = INTEREST_GROUPS.flatMap(g => g.items);

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

      {/* Grouped Interests */}
      {INTEREST_GROUPS.map((group) => (
        <StyledView key={group.label} className="mb-5">
          <Body className="text-neutral-400 text-xs font-semibold tracking-wider mb-2.5">{group.label}</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: 10 }}>
            {group.items.map((interest) => (
              <SimpleChip
                key={interest}
                label={interest}
                selected={interestsSet.has(interest)}
                onPress={() => handleToggleInterest(interest)}
              />
            ))}
          </StyledView>
        </StyledView>
      ))}

      {/* Custom interests */}
      {customInterests.length > 0 && (
        <StyledView className="mb-5">
          <Body className="text-neutral-400 text-xs font-semibold tracking-wider mb-2.5">Custom</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: 10 }}>
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
          </StyledView>
        </StyledView>
      )}

      {/* "Other" Button */}
      <StyledTouchableOpacity
        onPress={() => {
          lightHaptic();
          onShowCustomInterestModal();
        }}
        className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50 self-start"
      >
        <Body className="text-sm text-neutral-600">+ Other</Body>
      </StyledTouchableOpacity>
    </Card>
  );
});

InterestsSection.displayName = 'InterestsSection';
