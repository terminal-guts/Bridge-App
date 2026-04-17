/**
 * Skeleton Loader Component
 *
 * Provides skeleton loading states for dashboard components.
 * Uses Reanimated for 120fps pulse animation on the UI thread.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
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

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
    );
  }, []);

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
        <View className="bg-primary-500 rounded-2xl p-6 mb-6">
          <SkeletonLoader height={12} width="60%" borderRadius="rounded" className="mb-2 bg-white/30" />
          <View className="flex-row items-baseline justify-center my-4">
            <SkeletonLoader height={60} width={100} borderRadius="rounded" className="bg-white/30" />
            <SkeletonLoader height={32} width={16} borderRadius="rounded" className="mx-2 bg-white/20" />
            <SkeletonLoader height={40} width={80} borderRadius="rounded" className="bg-white/30" />
          </View>
          <SkeletonLoader height={12} width="80%" borderRadius="rounded" className="mx-auto mb-4 bg-white/30" />
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" className="bg-white/20" />
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

export const MatchesSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <View className={`flex-1 ${className}`} style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Header — matches headerRow in MatchesScreen */}
      <View className="px-6 pt-2 pb-1">
        <SkeletonLoader height={32} width={100} borderRadius="rounded" />
      </View>

      {/* Full-height card skeleton — mirrors the MatchCard layout */}
      <View className="flex-1 px-4 pb-4 pt-2">
        <View className="flex-1 rounded-3xl overflow-hidden" style={{ backgroundColor: COLORS.card }}>
          {/* Full card is one big image area — skeleton fills it */}
          <View className="flex-1" />

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
                {[0, 1, 2].map(i => (
                  <View key={i} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.skeletonOverlay, marginLeft: i === 0 ? 0 : -8 }} />
                ))}
              </View>
            </View>
            {/* Date */}
            <SkeletonLoader height={12} width={120} borderRadius="rounded" />
          </View>

          {/* Action button placeholder — bottom right */}
          <View className="absolute" style={{ right: 16, bottom: 18, width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5E7EB' }} />
        </View>
      </View>
    </View>
  );
};

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
      {/* Header Skeleton */}
      <View style={{ backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View className="px-4 py-3 flex-row justify-between items-center">
          <SkeletonLoader height={24} width={120} borderRadius="rounded" />
          <View className="flex-row space-x-3">
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
          </View>
        </View>
      </View>

      {/* Profile Photo and Name Skeleton */}
      <View className="px-4 pb-4" style={{ backgroundColor: COLORS.card }}>
        <View className="items-center">
          <SkeletonLoader height={96} width={96} borderRadius="rounded-full" className="mb-3" />
          <SkeletonLoader height={20} width={100} borderRadius="rounded" className="mb-3" />

          {/* Photo Gallery Preview Skeleton */}
          <View className="flex-row space-x-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={64} width={64} borderRadius="rounded-lg" />
            ))}
          </View>
        </View>

        {/* Friends Section Skeleton */}
        <View className="flex-row justify-center mt-4 space-x-3">
          <SkeletonLoader height={36} width={100} borderRadius="rounded-full" />
          <SkeletonLoader height={36} width={120} borderRadius="rounded-full" />
        </View>
      </View>

      {/* Tab Bar Skeleton */}
      <View className="flex-row" style={{ backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
        <View className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={60} borderRadius="rounded" />
        </View>
        <View className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={80} borderRadius="rounded" />
        </View>
        <View className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={70} borderRadius="rounded" />
        </View>
      </View>

      {/* Content Cards Skeleton */}
      <View className="px-4 py-6">
        {/* Profile Completeness Card Skeleton */}
        <View className="rounded-lg p-4 mb-4 shadow-sm" style={{ backgroundColor: COLORS.card }}>
          <View className="flex-row items-center mb-3">
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={18} width={150} borderRadius="rounded" className="ml-3" />
          </View>
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" className="mb-3" />
          <SkeletonLoader height={14} width="80%" borderRadius="rounded" />
        </View>

        {/* Section Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <View key={i} className="rounded-lg p-4 mb-4 shadow-sm" style={{ backgroundColor: COLORS.card }}>
            <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-4" />
            <View className="space-y-3">
              <View className="flex-row items-center">
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <View className="flex-1 ml-3">
                  <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-1" />
                  <SkeletonLoader height={16} width={120} borderRadius="rounded" />
                </View>
              </View>
              <View className="flex-row items-center">
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <View className="flex-1 ml-3">
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
    <View className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} className="bg-white rounded-xl p-4 mb-2 flex-row items-center justify-between border border-neutral-100 shadow-sm">
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
    <View className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} className="flex-row items-center py-3 border-b border-neutral-100">
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
    <View className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Search Bar Placeholder */}
      <View className="px-3 py-2 bg-white border-b border-neutral-100">
        <View className="bg-neutral-100 rounded-lg h-10 px-3 justify-center">
          <SkeletonLoader height={14} width={120} borderRadius="rounded" />
        </View>
      </View>

      {/* Contact rows */}
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <View key={i} className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-50">
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
  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Hero area - roughly 55% of common screen height */}
      <View style={{ height: 450, backgroundColor: COLORS.skeletonBone }}>
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
        <View className="bg-white rounded-2xl p-5 mb-4 border border-neutral-100 shadow-sm">
          <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-4" />
          <View className="flex-row space-x-3">
             <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
             <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
             <SkeletonLoader height={64} width={64} borderRadius="rounded-xl" />
          </View>
        </View>

        {/* Detailed prompt card */}
        <View className="bg-white rounded-2xl h-32 mb-4 border border-neutral-100 flex-row overflow-hidden shadow-sm">
          <View className="w-1 bg-primary-500 mr-4" />
          <View className="flex-1 justify-center pr-4">
             <SkeletonLoader height={16} width="60%" borderRadius="rounded" className="mb-3" />
             <SkeletonLoader height={14} width="90%" borderRadius="rounded" className="mb-2" />
             <SkeletonLoader height={14} width="40%" borderRadius="rounded" />
          </View>
        </View>

        {/* Values/Interests card */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-neutral-100 shadow-sm">
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
    <View className="px-5">
      {[1, 2, 3, 4].map(i => (
        <View key={i} className="flex-row items-center p-3 mb-2 rounded-xl bg-neutral-50 border border-neutral-100">
          <SkeletonLoader height={48} width={48} borderRadius="rounded-full" className="mr-3" />
          <View className="flex-1">
            <SkeletonLoader height={16} width={120} borderRadius="rounded" className="mb-2" />
            <SkeletonLoader height={12} width={80} borderRadius="rounded" />
          </View>
          <View className="w-5 h-5 rounded-full border border-neutral-300" />
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
    <View className="flex-1 bg-white" style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Progress Dots */}
      <View className="flex-row justify-center py-4 space-x-2">
        <SkeletonLoader height={10} width={40} borderRadius="rounded-full" />
      </View>

      <View className="flex-1 px-4">
        {/* Dual photo cards */}
        <View className="flex-row flex-1 space-x-3 mb-6">
           <View className="flex-1 rounded-3xl overflow-hidden bg-neutral-100">
             <View className="absolute bottom-4 left-4">
               <SkeletonLoader height={24} width={80} borderRadius="rounded" className="bg-white/30" />
             </View>
           </View>
           <View className="flex-1 rounded-3xl overflow-hidden bg-neutral-100">
             <View className="absolute bottom-4 left-4">
               <SkeletonLoader height={24} width={80} borderRadius="rounded" className="bg-white/30" />
             </View>
           </View>
        </View>

        {/* Voting buttons placeholder */}
        <View className="pb-8 space-y-4">
          <SkeletonLoader height={64} width="100%" borderRadius="rounded-2xl" />
          <View className="flex-row space-x-4">
            <SkeletonLoader height={52} width="48%" borderRadius="rounded-xl" />
            <SkeletonLoader height={52} width="48%" borderRadius="rounded-xl" />
          </View>
        </View>
      </View>
    </View>
  );
};
