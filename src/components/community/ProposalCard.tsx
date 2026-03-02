/**
 * ProposalCard Component
 *
 * Displays a match proposal with:
 * - Side-by-side anchor + candidate profile previews
 * - Endorsement section with friend names and karma badges
 * - Vote buttons (Yes/No)
 * - Voted state indicator
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Proposal, UserProfile, Endorsement } from '../../types/community';
import { KarmaBadge } from './KarmaBadge';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;
const StyledImage = styled(Image) as typeof Image;

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

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Trigger animation when voted
  useEffect(() => {
    if (hasVoted) {
      // Card pulse and glow animation
      Animated.sequence([
        // Pulse out
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.02,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]),
        // Pulse in
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
      ]).start(() => {
        if (onVoteAnimationComplete) {
          onVoteAnimationComplete();
        }
      });
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
          resizeMode="cover"
        />

        {/* Name & Age */}
        <StyledText className="text-sm font-semibold text-neutral-900 mb-0.5">
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
                  resizeMode="cover"
                />
              )}
              <StyledText className="text-xs text-neutral-700">
                {endorserName}
                {isFriend && ' ('}
              </StyledText>
              {isFriend && (
                <>
                  <KarmaBadge
                    points={endorsement.endorserProfile.karma?.karmaPoints || 0}
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

  // Interpolate glow color (using warmer primary blue)
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(91, 143, 255, 0)', 'rgba(91, 143, 255, 0.15)'],
  });

  return (
    <Animated.View
      className="bg-neutral-50 rounded-xl p-4 mb-4"
      style={{
        elevation: 2,
        shadowColor: '#FF9678',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        transform: [{ scale: scaleAnim }],
        backgroundColor: glowColor,
      }}
    >
      {/* Highly Recommended Badge */}
      {highlyRecommended && (
        <StyledView className="flex-row items-center mb-3 px-2 py-1.5 bg-amber-50 rounded-lg self-start">
          <Ionicons name="star" size={16} color="#F59E0B" />
          <StyledText className="text-xs font-semibold text-amber-700 ml-1">
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
        <StyledText className="text-xs font-semibold text-neutral-700 mb-2">
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
            backgroundColor: hasVoted ? (yourVote === false ? '#EF4444' : '#F3F4F6') : '#EF4444',
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
              color: hasVoted ? (yourVote === false ? '#FFFFFF' : '#9CA3AF') : '#FFFFFF',
            }}
          >
            {hasVoted && yourVote === false ? '✓ No' : 'Vote No'}
          </StyledText>
        </StyledTouchableOpacity>

        {/* Yes Button */}
        <StyledTouchableOpacity
          className="flex-1 py-3 rounded-lg justify-center items-center"
          style={{
            backgroundColor: hasVoted ? (yourVote === true ? '#10B981' : '#F3F4F6') : '#10B981',
            opacity: hasVoted ? (yourVote === true ? 1 : 0.5) : 1,
          }}
          onPress={() => handleVote(true)}
          disabled={hasVoted}
          activeOpacity={hasVoted ? 1 : 0.8}
        >
          <StyledText
            className="font-semibold"
            style={{
              color: hasVoted ? (yourVote === true ? '#FFFFFF' : '#9CA3AF') : '#FFFFFF',
            }}
          >
            {hasVoted && yourVote === true ? '✓ Yes' : 'Vote Yes'}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </Animated.View>
  );
});

export default ProposalCard;
