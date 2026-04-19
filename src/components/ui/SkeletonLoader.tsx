/**
 * Skeleton Loader Component
 *
 * Provides skeleton loading states for dashboard components.
 * Uses Reanimated for 120fps pulse animation on the UI thread.
 */

import React, { useEffect } from 'react';
import { View, Dimensions, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 'rounded-lg',
  className = '',
}) => {
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      // Static bone — respect the user's reduce-motion setting.
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
    );
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: width as number, height: height as number, backgroundColor: COLORS.skeletonBone }, animatedStyle]}
      className={`${borderRadius} ${className}`}
    />
  );
};

interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ paddingTop: 24, backgroundColor: COLORS.screenBackground }}>
      <View className="px-4">
        {/* Prospective Matches Card Skeleton (Large Hero Card) */}
        <View
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: COLORS.skeletonBone }}
        >
          <SkeletonLoader height={12} width="60%" borderRadius="rounded" className="mb-2" />
          <View className="flex-row items-baseline justify-center my-4">
            <SkeletonLoader height={60} width={100} borderRadius="rounded" />
            <SkeletonLoader height={32} width={16} borderRadius="rounded" className="mx-2" />
            <SkeletonLoader height={40} width={80} borderRadius="rounded" />
          </View>
          <SkeletonLoader height={12} width="80%" borderRadius="rounded" className="mx-auto mb-4" />
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" />
        </View>

        {/* Survey & Pricing Row Skeleton */}
        <View className="flex-row mb-6" style={{ gap: 16 }}>
          {/* Survey Card Skeleton */}
          <View className="flex-1 rounded-xl p-5" style={{ backgroundColor: COLORS.card }}>
            <SkeletonLoader height={10} width="70%" borderRadius="rounded" className="mb-3" />
            <View className="items-center my-4">
              <SkeletonLoader height={48} width={140} borderRadius="rounded-xl" />
            </View>
          </View>

          {/* Pricing Card Skeleton */}
          <View className="flex-1 rounded-xl p-5" style={{ backgroundColor: COLORS.card }}>
            <SkeletonLoader height={10} width="60%" borderRadius="rounded" className="mx-auto mb-3" />
            <View className="items-center">
              <SkeletonLoader height={20} width={80} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={20} width={90} borderRadius="rounded" className="mb-3" />
              <SkeletonLoader height={10} width="70%" borderRadius="rounded" />
            </View>
          </View>
        </View>

        {/* Friends Section Skeleton */}
        <View>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3 px-4">
            <SkeletonLoader height={20} width={80} borderRadius="rounded" />
            <View className="flex-row" style={{ gap: 12 }}>
              <SkeletonLoader height={36} width={36} borderRadius="rounded-full" />
              <SkeletonLoader height={36} width={36} borderRadius="rounded-full" />
            </View>
          </View>

          {/* Friend Cards */}
          <View className="px-4">
            {[1, 2].map((i) => (
              <View key={i} className="rounded-xl p-3 mb-2" style={{ backgroundColor: COLORS.card }}>
                <View className="flex-row items-center">
                  <SkeletonLoader height={48} width={48} borderRadius="rounded-full" className="mr-3" />
                  <View className="flex-1">
                    <SkeletonLoader height={14} width={120} borderRadius="rounded" className="mb-2" />
                    <SkeletonLoader height={20} width={80} borderRadius="rounded-full" />
                  </View>
                  <SkeletonLoader height={32} width={70} borderRadius="rounded-lg" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * SurveySkeleton Component
 *
 * Skeleton loading state for the daily survey screen
 */
export const SurveySkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 px-4 pt-4 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header Skeleton */}
      <View className="mb-6">
        <View className="flex-row items-center mb-2">
          <SkeletonLoader height={32} width={32} borderRadius="rounded-full" className="mr-2" />
          <SkeletonLoader height={12} width={80} borderRadius="rounded" />
        </View>
        <SkeletonLoader height={28} width="70%" borderRadius="rounded" className="mb-2" />
        <SkeletonLoader height={16} width="90%" borderRadius="rounded" />
      </View>

      {/* Progress Indicator Skeleton */}
      <View className="flex-row items-center justify-center mb-6">
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
        <SkeletonLoader height={4} width={48} borderRadius="rounded-full" className="mx-2" />
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
        <SkeletonLoader height={4} width={48} borderRadius="rounded-full" className="mx-2" />
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
      </View>

      {/* Recipient Card Skeleton */}
      <View className="rounded-2xl mb-8 overflow-hidden" style={{ backgroundColor: COLORS.card }}>
        <SkeletonLoader height={48} width="100%" borderRadius="rounded-none" className="mb-4" />
        <View className="px-4 pb-4">
          <View className="flex-row">
            <SkeletonLoader height={88} width={88} borderRadius="rounded-xl" />
            <View className="flex-1 ml-4 justify-center">
              <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={14} width={100} borderRadius="rounded" className="mb-1" />
              <SkeletonLoader height={12} width={80} borderRadius="rounded" />
            </View>
          </View>
          <View className="flex-row mt-4" style={{ gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={28} width={70} borderRadius="rounded-full" />
            ))}
          </View>
        </View>
      </View>

      {/* Section Header Skeleton */}
      <View className="mb-4">
        <SkeletonLoader height={22} width={100} borderRadius="rounded" className="mb-1" />
        <SkeletonLoader height={14} width={180} borderRadius="rounded" />
      </View>

      {/* Candidate Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <View key={i} className="rounded-2xl p-4 mb-4" style={{ backgroundColor: COLORS.card }}>
          <View className="flex-row mb-4">
            <SkeletonLoader height={100} width={100} borderRadius="rounded-xl" />
            <View className="flex-1 ml-4 justify-center">
              <SkeletonLoader height={18} width={100} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={14} width={120} borderRadius="rounded" className="mb-1" />
              <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-3" />
              <SkeletonLoader height={14} width={90} borderRadius="rounded" />
            </View>
          </View>
          <SkeletonLoader height={1} width="100%" borderRadius="rounded" className="mb-4" />
          <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-2" />
          <View className="flex-row" style={{ gap: 8 }}>
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * CommunitySkeleton — matches the Community screen layout:
 * header row + section label + 3 friend rows (avatar + name + streak + button)
 */
export const CommunitySkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header */}
      <View className="px-6 pt-4 mb-5">
        <View className="flex-row items-center justify-between">
          <SkeletonLoader height={32} width={160} borderRadius="rounded" />
          <View className="flex-row" style={{ gap: 8 }}>
            <SkeletonLoader height={28} width={60} borderRadius="rounded-lg" />
            <SkeletonLoader height={34} width={34} borderRadius="rounded-full" />
          </View>
        </View>
      </View>

      {/* Section label */}
      <View className="px-6 mb-3">
        <SkeletonLoader height={18} width={140} borderRadius="rounded" />
      </View>

      {/* Friend rows */}
      <View className="px-6">
        {[1, 2, 3].map(i => (
          <View key={i} className="flex-row items-center mb-4">
            <SkeletonLoader height={52} width={52} borderRadius="rounded-full" className="mr-3" />
            <View className="flex-1">
              <SkeletonLoader height={16} width={90} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={12} width={60} borderRadius="rounded" />
            </View>
            <SkeletonLoader height={36} width={72} borderRadius="rounded-lg" />
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * MatchesSkeleton — matches the Matches screen layout:
 * header + a vertically stacked list of 2-3 card placeholders scaled to the
 * viewport. Each card mirrors MatchCard's overlay content shape.
 */
export const MatchesSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  const { height: windowHeight } = useWindowDimensions();
  // Cap each card around 60% of viewport height so 2-3 comfortably stack
  // and the list scrolls rather than stretches a single card to fill.
  const cardHeight = Math.min(Math.round(windowHeight * 0.6), 560);

  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header — matches headerRow in MatchesScreen */}
      <View className="px-6 pt-2 pb-1">
        <SkeletonLoader height={32} width={100} borderRadius="rounded" />
      </View>

      {/* Stacked card skeletons */}
      <View className="px-4 pb-4 pt-2" style={{ gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: COLORS.skeletonBone, height: cardHeight }}
          >
            {/* Overlaid bottom content — mirrors MatchCard bottom section */}
            <View className="absolute bottom-0 left-0 right-0 p-4" style={{ paddingRight: 80 }}>
              {/* Status pill */}
              <SkeletonLoader height={28} width={160} borderRadius="rounded-lg" className="mb-2" />
              {/* Name */}
              <SkeletonLoader height={28} width={140} borderRadius="rounded" className="mb-2" />
              {/* Endorser row */}
              <View className="flex-row items-center mb-1" style={{ gap: 6 }}>
                <SkeletonLoader height={14} width={60} borderRadius="rounded" />
                <View className="flex-row" style={{ marginLeft: 4 }}>
                  {[0, 1, 2].map(j => (
                    <View key={j} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.skeletonOverlay, marginLeft: j === 0 ? 0 : -8 }} />
                  ))}
                </View>
              </View>
              {/* Date */}
              <SkeletonLoader height={12} width={120} borderRadius="rounded" />
            </View>

            {/* Action button placeholder — bottom right */}
            <View className="absolute" style={{ right: 16, bottom: 18, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.skeletonOverlay }} />
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * LeaderboardSkeleton — matches the Leaderboard screen layout:
 * header + podium card (3 avatars) + 7 list rows
 */
export const LeaderboardSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header */}
      <View className="px-6 pt-4 mb-4 flex-row items-center justify-between">
        <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
        <SkeletonLoader height={22} width={120} borderRadius="rounded" />
        <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
      </View>

      {/* Prize banner */}
      <View className="mx-4 mb-3 rounded-xl overflow-hidden">
        <SkeletonLoader height={40} width="100%" borderRadius="rounded-none" />
      </View>

      {/* Countdown */}
      <View className="flex-row items-center justify-center mb-4" style={{ gap: 6 }}>
        <SkeletonLoader height={14} width={14} borderRadius="rounded-full" />
        <SkeletonLoader height={14} width={160} borderRadius="rounded" />
      </View>

      {/* Podium card */}
      <View className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ height: 180 }}>
        <SkeletonLoader height={180} width="100%" borderRadius="rounded-none" />
      </View>

      {/* List rows */}
      <View className="px-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <View key={i} className="flex-row items-center mb-3" style={{ gap: 12 }}>
            <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
            <SkeletonLoader height={48} width={48} borderRadius="rounded-full" />
            <View className="flex-1">
              <SkeletonLoader height={14} width={80} borderRadius="rounded" className="mb-1" />
              <SkeletonLoader height={10} width={50} borderRadius="rounded" />
            </View>
            <SkeletonLoader height={28} width={60} borderRadius="rounded-full" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const ProfileSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header row — matches live ProfileScreen: no white bar, warm bg,
          ScreenTitle-sized headline on the left + tight 3-icon group on the right. */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        {/* ScreenTitle-sized headline bone (~28px tall, ~160 wide for "Profile") */}
        <SkeletonLoader height={28} width={140} borderRadius="rounded" />
        {/* Tight 3-icon row — gap:4 matches the locked header icon spacing */}
        <View className="flex-row" style={{ gap: 4 }}>
          <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
          <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
          <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
        </View>
      </View>

      {/* Avatar + user-name bone — centered, sits on warm bg (no white card) */}
      <View className="items-center px-4 pt-4 pb-6">
        <SkeletonLoader height={96} width={96} borderRadius="rounded-full" className="mb-3" />
        {/* User name bone sized for FONT_SIZES['4xl'] (24px) bold */}
        <SkeletonLoader height={24} width={160} borderRadius="rounded" />
      </View>

      {/* Content Cards Skeleton */}
      <View className="px-4 pb-6">
        {/* Profile Strength / Completeness Card Skeleton */}
        <View
          className="rounded-lg p-4 mb-4"
          style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight }}
        >
          <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={18} width={150} borderRadius="rounded" />
          </View>
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" className="mb-3" />
          <SkeletonLoader height={14} width="80%" borderRadius="rounded" />
        </View>

        {/* Section Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight }}
          >
            <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-4" />
            <View style={{ gap: 12 }}>
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <View className="flex-1">
                  <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-1" />
                  <SkeletonLoader height={16} width={120} borderRadius="rounded" />
                </View>
              </View>
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <View className="flex-1">
                  <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-1" />
                  <SkeletonLoader height={16} width={100} borderRadius="rounded" />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * BlockedUsersSkeleton matches the BlockedUsersScreen layout (no header placeholder):
 * 5-6 rows (name + date + unblock button)
 */
export const BlockedUsersSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} className="rounded-xl p-4 mb-2 flex-row items-center justify-between border shadow-sm" style={{ backgroundColor: COLORS.card, borderColor: COLORS.borderLight }}>
          <View className="flex-1">
            <SkeletonLoader height={16} width={120} borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={12} width={80} borderRadius="rounded" />
          </View>
          <SkeletonLoader height={44} width={80} borderRadius="rounded-lg" />
        </View>
      ))}
    </View>
  );
};

/**
 * SuggestMatchSkeleton matches the SuggestMatchScreen layout (no header placeholder):
 * 5-6 rows with 48px circular avatar + name/job blocks + arrow
 */
export const SuggestMatchSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} className="flex-row items-center py-3 border-b" style={{ borderBottomColor: COLORS.borderLight }}>
          <SkeletonLoader height={48} width={48} borderRadius="rounded-full" className="mr-3" />
          <View className="flex-1">
            <SkeletonLoader height={18} width={140} borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={14} width={100} borderRadius="rounded" />
          </View>
          <SkeletonLoader height={20} width={20} borderRadius="rounded" />
        </View>
      ))}
    </View>
  );
};

/**
 * ContactInviteSkeleton matches the ContactInviteScreen layout (no header placeholder):
 * search bar placeholder + list of contact rows
 */
export const ContactInviteSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Search Bar Placeholder */}
      <View className="px-3 py-2 border-b" style={{ backgroundColor: COLORS.card, borderBottomColor: COLORS.borderLight }}>
        <View className="rounded-lg h-10 px-3 justify-center" style={{ backgroundColor: COLORS.borderLight }}>
          <SkeletonLoader height={14} width={120} borderRadius="rounded" />
        </View>
      </View>

      {/* Contact rows */}
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <View key={i} className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: COLORS.card, borderBottomColor: COLORS.borderLight }}>
          <SkeletonLoader height={40} width={40} borderRadius="rounded-full" className="mr-3" />
          <View className="flex-1">
            <SkeletonLoader height={14} width={120} borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={12} width={80} borderRadius="rounded" />
          </View>
          <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
        </View>
      ))}
    </View>
  );
};

/**
 * ProfileMatchSkeleton — matches the ProfileMatchScreen layout:
 * Large hero photo (55% height) + overlapping info block + detailed cards
 */
export const ProfileMatchSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  const { height: screenHeight } = Dimensions.get('window');
  const heroPhotoHeight = Math.round(screenHeight * 0.55);

  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Hero area */}
      <View style={{ height: heroPhotoHeight, backgroundColor: COLORS.skeletonBone }}>
        {/* Hero bottom overlay info */}
        <View className="absolute bottom-6 left-5 right-5 flex-row items-end justify-between">
          <View className="flex-1">
            <SkeletonLoader height={42} width={200} borderRadius="rounded-lg" className="mb-3 bg-white/30" />
            <SkeletonLoader height={20} width={180} borderRadius="rounded" className="bg-white/20" />
          </View>
          <SkeletonLoader height={32} width={60} borderRadius="rounded-full" className="bg-white/30" />
        </View>
      </View>

      {/* Body content */}
      <View className="px-4 pt-6">
        {/* Badges section */}
        <View className="rounded-2xl p-5 mb-4 border shadow-sm flex-row" style={{ backgroundColor: COLORS.card, borderColor: COLORS.borderLight, gap: 12 }}>
          <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
          <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
          <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
        </View>

        {/* Detailed prompt card */}
        <View className="rounded-2xl h-32 mb-4 border flex-row overflow-hidden shadow-sm" style={{ backgroundColor: COLORS.card, borderColor: COLORS.borderLight }}>
          <View className="w-1 mr-4" style={{ backgroundColor: COLORS.primary }} />
          <View className="flex-1 justify-center pr-4">
             <SkeletonLoader height={16} width="60%" borderRadius="rounded" className="mb-3" />
             <SkeletonLoader height={14} width="90%" borderRadius="rounded" className="mb-2" />
             <SkeletonLoader height={14} width="40%" borderRadius="rounded" />
          </View>
        </View>

        {/* Values/Interests card */}
        <View className="rounded-2xl p-5 mb-4 border shadow-sm" style={{ backgroundColor: COLORS.card, borderColor: COLORS.borderLight }}>
          <SkeletonLoader height={20} width={100} borderRadius="rounded" className="mb-4" />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <SkeletonLoader key={i} height={36} width={90} borderRadius="rounded-full" />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * FriendListSkeleton — used for the friend-list modal in ProposalReviewView
 */
export const FriendListSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`px-5 ${className}`}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} className="flex-row items-center p-3 mb-2 rounded-xl border" style={{ backgroundColor: COLORS.borderLight, borderColor: COLORS.border }}>
          <SkeletonLoader height={48} width={48} borderRadius="rounded-full" className="mr-3" />
          <View className="flex-1">
            <SkeletonLoader height={16} width={120} borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={12} width={80} borderRadius="rounded" />
          </View>
          <View className="w-5 h-5 rounded-full border" style={{ borderColor: COLORS.text.tertiary }} />
        </View>
      ))}
    </View>
  );
};

/**
 * ProposalReviewSkeleton matches the ProposalReviewView layout:
 * Progress dots + 2 large photo cards + action buttons placeholder
 */
export const ProposalReviewSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Progress Dots */}
      <View className="flex-row justify-center py-4" style={{ gap: 8 }}>
        <SkeletonLoader height={10} width={40} borderRadius="rounded-full" />
      </View>

      <View className="flex-1 px-4">
        {/* Dual photo cards */}
        <View className="flex-row flex-1 mb-6" style={{ gap: 12 }}>
           <View className="flex-1 rounded-3xl overflow-hidden" style={{ backgroundColor: COLORS.borderLight }}>
             <View className="absolute bottom-4 left-4">
               <SkeletonLoader height={24} width={80} borderRadius="rounded" className="bg-white/30" />
             </View>
           </View>
           <View className="flex-1 rounded-3xl overflow-hidden" style={{ backgroundColor: COLORS.borderLight }}>
             <View className="absolute bottom-4 left-4">
               <SkeletonLoader height={24} width={80} borderRadius="rounded" className="bg-white/30" />
             </View>
           </View>
        </View>

        {/* Voting buttons placeholder */}
        <View className="pb-8" style={{ gap: 16 }}>
          <SkeletonLoader height={64} width="100%" borderRadius="rounded-2xl" />
          <View className="flex-row" style={{ gap: 16 }}>
            <SkeletonLoader height={52} width="48%" borderRadius="rounded-xl" />
            <SkeletonLoader height={52} width="48%" borderRadius="rounded-xl" />
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * SettingsSkeleton — matches the SettingsScreen layout (no header placeholder):
 * 4 cards (Account, Preferences, Legal & Support, Danger Zone), each with a
 * title row + setting rows (icon box + title/subtitle + arrow placeholder).
 * Used until both profile (role) and notification prefs have loaded so toggle
 * values and role-dependent rows don't pop in.
 */
export const SettingsSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  const Row = () => (
    <View className="flex-row items-center" style={{ paddingVertical: 14 }}>
      <View className="rounded-lg mr-3" style={{ width: 40, height: 40, backgroundColor: COLORS.borderLight }} />
      <View className="flex-1">
        <SkeletonLoader height={14} width="55%" borderRadius="rounded" className="mb-2" />
        <SkeletonLoader height={11} width="75%" borderRadius="rounded" />
      </View>
      <SkeletonLoader height={18} width={18} borderRadius="rounded" />
    </View>
  );

  const SettingsCard = ({ rowCount }: { rowCount: number }) => (
    <View
      className="rounded-2xl p-4 mb-6"
      style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight }}
    >
      <SkeletonLoader height={18} width={120} borderRadius="rounded" className="mb-3" />
      {Array.from({ length: rowCount }).map((_, i) => (
        <Row key={i} />
      ))}
    </View>
  );

  return (
    <View className={`flex-1 px-4 pt-4 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      <SettingsCard rowCount={3} />
      <SettingsCard rowCount={5} />
      <SettingsCard rowCount={3} />
      <SettingsCard rowCount={2} />
    </View>
  );
};

/**
 * ChatSkeleton — matches the ChatScreen message list layout (no header
 * placeholder): alternating left/right bubble rows with varied widths.
 * Input bar is not included because the real input bar stays visible
 * during load.
 */
export const ChatSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  const bubbles: Array<{ side: 'left' | 'right'; width: string }> = [
    { side: 'left', width: '55%' },
    { side: 'right', width: '40%' },
    { side: 'left', width: '70%' },
    { side: 'right', width: '60%' },
    { side: 'left', width: '35%' },
    { side: 'right', width: '50%' },
  ];

  return (
    <View className={`flex-1 px-4 pt-6 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {bubbles.map((b, i) => (
        <View
          key={i}
          className="mb-3"
          style={{ alignItems: b.side === 'right' ? 'flex-end' : 'flex-start' }}
        >
          <SkeletonLoader height={36} width={b.width} borderRadius="rounded-2xl" />
        </View>
      ))}
    </View>
  );
};

/**
 * MatchPreferencesSkeleton — matches MatchPreferencesScreen layout (no header
 * placeholder): a stack of preference section cards, each with a title + body
 * area sized for a slider row or chip group.
 */
export const MatchPreferencesSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  const sections = [56, 72, 72, 96, 96, 56];

  return (
    <View className={`flex-1 px-4 pt-4 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {sections.map((bodyHeight, i) => (
        <View
          key={i}
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight }}
        >
          <SkeletonLoader height={16} width={140} borderRadius="rounded" className="mb-3" />
          <SkeletonLoader height={bodyHeight} width="100%" borderRadius="rounded-xl" />
        </View>
      ))}
    </View>
  );
};

/**
 * BadgesSkeleton — small skeleton for the Badges tab inside ProfileScreen.
 * 3 rows of badge card placeholders, matching the real badge card layout.
 */
export const BadgesSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`px-4 pt-4 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          className="rounded-2xl p-3 mb-2 flex-row items-center"
          style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight, gap: 12 }}
        >
          <SkeletonLoader height={48} width={48} borderRadius="rounded-xl" />
          <View className="flex-1">
            <SkeletonLoader height={14} width="60%" borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={11} width="40%" borderRadius="rounded" />
          </View>
        </View>
      ))}
    </View>
  );
};
