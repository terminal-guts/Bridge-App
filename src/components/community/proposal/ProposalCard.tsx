/**
 * ProposalCard Component
 *
 * Displays a match proposal with:
 * - Side-by-side anchor + candidate profile previews
 * - Endorsement section with friend names and karma badges
 * - Vote buttons (Yes/No)
 * - Voted state indicator
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withSpring,
    withTiming,
    interpolateColor,
} from 'react-native-reanimated';
import { SPRINGS } from '../../../constants/animations';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Proposal, UserProfile, Endorsement } from '../../../types/community';
import { KarmaBadge } from '../karma/KarmaBadge';
import { FONTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../icons';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;
const StyledImage = Image;

interface ProposalCardProps {
  proposal: Proposal;
  yourVote?: boolean; // true = yes, false = no, undefined = not voted
  onVote: (vote: boolean) => void;
  onVoteAnimationComplete?: () => void; // Callback after vote animation
  showRecommendedBadge?: boolean; // Show "Highly Recommended" badge
}

export const ProposalCard = React.memo<ProposalCardProps>(({
  proposal,
  yourVote,
  onVote,
  onVoteAnimationComplete,
  showRecommendedBadge = true,
}) => {
  const hasVoted = yourVote !== undefined;
  const highlyRecommended = false;

  // Animation values
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  // Trigger animation when voted
  useEffect(() => {
    if (hasVoted) {
      scaleAnim.value = withSequence(
        withSpring(1.02, SPRINGS.bouncy),
        withSpring(1, SPRINGS.responsive),
      );
      glowAnim.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 }),
      );
      if (onVoteAnimationComplete) {
        setTimeout(onVoteAnimationComplete, 500);
      }
    }
  }, [hasVoted]);

  const handleVote = async (vote: boolean) => {
    if (hasVoted) return; // Already voted

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call vote handler
    onVote(vote);
  };

  // Render profile preview (anchor or candidate)
  const renderProfilePreview = (user: UserProfile, label: string) => {
    // Get 1-2 key attributes
    const attributes = [
      user.currentJob && user.company ? `${user.currentJob} at ${user.company}` : user.currentJob,
      user.education,
    ].filter(Boolean);

    const displayAttributes = attributes.slice(0, 2);

    return (
      <StyledView className="flex-1 items-center">
        {/* Photo */}
        <StyledImage
          source={{ uri: user.photos?.[0]?.url || 'https://via.placeholder.com/60' }}
          className="rounded-full mb-2"
          style={{ width: 60, height: 60 }}
          contentFit="cover"
        />

        {/* Name & Age */}
        <StyledText className="text-sm font-semibold text-neutral-900 mb-0.5" style={{ fontFamily: FONTS.semiBold }}>
          {user.firstName}, {user.age}
        </StyledText>

        {/* Attributes */}
        {displayAttributes.map((attr, index) => (
          <StyledText
            key={index}
            className="text-xs text-neutral-600 text-center"
            numberOfLines={1}
          >
            {attr}
          </StyledText>
        ))}
      </StyledView>
    );
  };

  // Render endorsers
  const renderEndorsers = () => {
    if (proposal.endorsements.length === 0) {
      return (
        <StyledText className="text-xs text-neutral-500 italic">
          No endorsements yet
        </StyledText>
      );
    }

    return (
      <StyledView>
        {proposal.endorsements.map((endorsement, index) => {
          const isFriend = endorsement.endorsementType.includes('friend');
          const endorserName = isFriend
            ? endorsement.endorserProfile.firstName
            : 'System-assigned matcher';

          return (
            <StyledView key={endorsement.id} className="flex-row items-center" style={{ marginTop: index > 0 ? 8 : 0 }}>
              {isFriend && (
                <StyledImage
                  source={{
                    uri: endorsement.endorserProfile.photos?.[0]?.url || 'https://via.placeholder.com/24',
                  }}
                  className="rounded-full"
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  contentFit="cover"
                />
              )}
              <StyledText className="text-xs text-neutral-700">
                {endorserName}
                {isFriend && ' ('}
              </StyledText>
              {isFriend && (
                <>
                  <KarmaBadge
                    points={endorsement.endorserProfile.karma?.karma_points || 0}
                  />
                  <StyledText className="text-xs text-neutral-700">)</StyledText>
                </>
              )}
            </StyledView>
          );
        })}
      </StyledView>
    );
  };

  // Animated style for card pulse + glow
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    backgroundColor: interpolateColor(
      glowAnim.value,
      [0, 1],
      ['rgba(91, 143, 255, 0)', 'rgba(91, 143, 255, 0.15)'],
    ),
  }));

  return (
    <ReanimatedAnimated.View
      className="bg-neutral-50 rounded-xl p-4 mb-4"
      style={[{
        elevation: 2,
        shadowColor: '#FF9678',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
      }, cardAnimStyle]}
    >
      {/* Highly Recommended Badge */}
      {highlyRecommended && (
        <StyledView className="flex-row items-center mb-3 px-2 py-1.5 bg-amber-50 rounded-lg self-start">
          <EvaIcon name="star" variant="outline" size={16} color="#F59E0B" />
          <StyledText className="text-xs font-semibold text-amber-700 ml-1" style={{ fontFamily: FONTS.semiBold }}>
            Highly Recommended
          </StyledText>
        </StyledView>
      )}

      {/* Profile Previews: Anchor + Candidate side-by-side */}
      <StyledView className="flex-row justify-between mb-4">
        {renderProfilePreview(proposal.userA, 'Anchor')}

        {/* Heart Icon Between */}
        <StyledView className="justify-center items-center px-2">
          <StyledText className="text-2xl">💕</StyledText>
        </StyledView>

        {renderProfilePreview(proposal.userB, 'Candidate')}
      </StyledView>

      {/* Endorsement Section */}
      <StyledView className="bg-neutral-50 rounded-lg p-3 mb-4">
        <StyledText className="text-xs font-semibold text-neutral-700 mb-2" style={{ fontFamily: FONTS.semiBold }}>
          Endorsed by:
        </StyledText>
        {renderEndorsers()}
      </StyledView>

      {/* Vote Buttons */}
      <StyledView className="flex-row">
        {/* No Button */}
        <StyledTouchableOpacity
          className="flex-1 py-3 rounded-lg justify-center items-center"
          style={{
            backgroundColor: hasVoted ? (yourVote === false ? COLORS.error : COLORS.backgroundGray) : COLORS.error,
            opacity: hasVoted ? (yourVote === false ? 1 : 0.5) : 1,
            marginRight: 12,
          }}
          onPress={() => handleVote(false)}
          disabled={hasVoted}
          activeOpacity={hasVoted ? 1 : 0.8}
        >
          <StyledText
            className="font-semibold"
            style={{
              color: hasVoted ? (yourVote === false ? COLORS.card : COLORS.text.disabled) : COLORS.card,
              fontFamily: FONTS.semiBold,
            }}
          >
            {hasVoted && yourVote === false ? '✓ No' : 'Vote No'}
          </StyledText>
        </StyledTouchableOpacity>

        {/* Yes Button */}
        <StyledTouchableOpacity
          className="flex-1 py-3 rounded-lg justify-center items-center"
          style={{
            backgroundColor: hasVoted ? (yourVote === true ? COLORS.emerald : COLORS.backgroundGray) : COLORS.emerald,
            opacity: hasVoted ? (yourVote === true ? 1 : 0.5) : 1,
          }}
          onPress={() => handleVote(true)}
          disabled={hasVoted}
          activeOpacity={hasVoted ? 1 : 0.8}
        >
          <StyledText
            className="font-semibold"
            style={{
              color: hasVoted ? (yourVote === true ? COLORS.card : COLORS.text.disabled) : COLORS.card,
              fontFamily: FONTS.semiBold,
            }}
          >
            {hasVoted && yourVote === true ? '✓ Yes' : 'Vote Yes'}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </ReanimatedAnimated.View>
  );
});

export default ProposalCard;
