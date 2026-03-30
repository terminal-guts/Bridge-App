import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { SimpleChip } from '../../../components/ui/SimpleChip';
import { interestIconName } from '../../../utils/emojiMaps';
import { lightHaptic } from '../../../utils/haptics';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);
const StyledText = styled(Text);

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;
const CHIP_GAP = 8;

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
  atLimit: boolean;
}

export const InterestsSection: React.FC<InterestsSectionProps> = ({
  interests,
  onToggleInterest,
  onShowCustomInterestModal,
  atLimit,
}) => {
  const interestsSet = new Set(interests);
  const customInterests = interests.filter(i => !AVAILABLE_INTERESTS_SET.has(i));

  const handleToggleInterest = (interest: string) => {
    lightHaptic();
    onToggleInterest(interest);
  };

  const count = interests.length;

  return (
    <Card className="mb-8">
      <StyledView className="flex-row items-center justify-between mb-1">
        <H3>Interests <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
        <Body
          className="text-xs font-medium"
          style={{ color: atLimit ? COLORS.amber : COLORS.text.tertiary }}
          accessibilityLabel={`${count} of ${MAX_INTERESTS} interests selected`}
        >
          {count}/{MAX_INTERESTS}
        </Body>
      </StyledView>
      <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
        Select or add your interests (Select {MIN_INTERESTS}-{MAX_INTERESTS})
      </Body>

      {/* Empty state */}
      {count === 0 && (
        <Body className="text-sm italic mb-4" style={{ color: COLORS.text.tertiary }}>
          Tap any chip below to get started.
        </Body>
      )}

      {/* At-limit hint */}
      {atLimit && (
        <Body className="text-xs mb-3" style={{ color: COLORS.amber }}>
          Maximum reached. Remove one to add a different interest.
        </Body>
      )}

      {/* Grouped Interests */}
      {INTEREST_GROUPS.map((group) => (
        <StyledView key={group.label} className="mb-5">
          <Body style={{ color: COLORS.text.tertiary }} className="text-xs font-semibold tracking-wider mb-2.5">{group.label}</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: CHIP_GAP }}>
            {group.items.map((interest) => {
              const isSelected = interestsSet.has(interest);
              const isDisabled = atLimit && !isSelected;
              return (
                <SimpleChip
                  key={interest}
                  label={interest}
                  selected={isSelected}
                  disabled={isDisabled}
                  onPress={() => handleToggleInterest(interest)}
                  iconName={interestIconName(interest)}
                />
              );
            })}
          </StyledView>
        </StyledView>
      ))}

      {/* Custom interests */}
      {customInterests.length > 0 && (
        <StyledView className="mb-5">
          <Body style={{ color: COLORS.text.tertiary }} className="text-xs font-semibold tracking-wider mb-2.5">Custom</Body>
          <StyledView className="flex-row flex-wrap" style={{ gap: CHIP_GAP }}>
            {customInterests.map((customInterest) => (
              <SimpleChip
                key={customInterest}
                label={customInterest}
                selected
                onPress={() => handleToggleInterest(customInterest)}
                accessibilityHint="Double tap to remove"
              />
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
        disabled={atLimit}
        accessibilityRole="button"
        accessibilityLabel="Add custom interest"
        accessibilityState={{ disabled: atLimit }}
        className="px-4 rounded-full border border-dashed self-start"
        style={{
          minHeight: 44,
          justifyContent: 'center',
          borderColor: atLimit ? COLORS.borderLight : COLORS.border,
          backgroundColor: atLimit ? COLORS.borderLight : COLORS.card,
          opacity: atLimit ? 0.5 : 1,
        }}
      >
        <Body style={{ color: atLimit ? COLORS.text.tertiary : COLORS.text.secondary }} className="text-sm">+ Other</Body>
      </StyledTouchableOpacity>
    </Card>
  );
};
