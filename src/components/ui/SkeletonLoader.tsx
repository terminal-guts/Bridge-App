/**
 * Skeleton Loader Component
 *
 * Provides skeleton loading states for dashboard components
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);

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
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width,
        height,
        opacity,
      }}
      className={`bg-neutral-200 ${borderRadius} ${className}`}
    />
  );
};

interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <StyledView className={`flex-1 bg-neutral-100 ${className}`} style={{ paddingTop: 24 }}>
      <StyledView className="px-4">
        {/* Prospective Matches Card Skeleton (Large Hero Card) */}
        <StyledView className="bg-primary-500 rounded-2xl p-6 mb-6">
          <SkeletonLoader height={12} width="60%" borderRadius="rounded" className="mb-2 bg-white/30" />
          <StyledView className="flex-row items-baseline justify-center my-4">
            <SkeletonLoader height={60} width={100} borderRadius="rounded" className="bg-white/30" />
            <SkeletonLoader height={32} width={16} borderRadius="rounded" className="mx-2 bg-white/20" />
            <SkeletonLoader height={40} width={80} borderRadius="rounded" className="bg-white/30" />
          </StyledView>
          <SkeletonLoader height={12} width="80%" borderRadius="rounded" className="mx-auto mb-4 bg-white/30" />
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" className="bg-white/20" />
        </StyledView>

        {/* Survey & Pricing Row Skeleton */}
        <StyledView className="flex-row mb-6" style={{ gap: 16 }}>
          {/* Survey Card Skeleton */}
          <StyledView className="flex-1 bg-white rounded-xl p-5">
            <SkeletonLoader height={10} width="70%" borderRadius="rounded" className="mb-3" />
            <StyledView className="items-center my-4">
              <SkeletonLoader height={48} width={140} borderRadius="rounded-xl" />
            </StyledView>
          </StyledView>

          {/* Pricing Card Skeleton */}
          <StyledView className="flex-1 bg-white rounded-xl p-5">
            <SkeletonLoader height={10} width="60%" borderRadius="rounded" className="mx-auto mb-3" />
            <StyledView className="items-center">
              <SkeletonLoader height={20} width={80} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={20} width={90} borderRadius="rounded" className="mb-3" />
              <SkeletonLoader height={10} width="70%" borderRadius="rounded" />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Friends Section Skeleton */}
        <StyledView>
          {/* Header */}
          <StyledView className="flex-row items-center justify-between mb-3 px-4">
            <SkeletonLoader height={20} width={80} borderRadius="rounded" />
            <StyledView className="flex-row" style={{ gap: 12 }}>
              <SkeletonLoader height={36} width={36} borderRadius="rounded-full" />
              <SkeletonLoader height={36} width={36} borderRadius="rounded-full" />
            </StyledView>
          </StyledView>

          {/* Friend Cards */}
          <StyledView className="px-4">
            {[1, 2].map((i) => (
              <StyledView key={i} className="bg-white rounded-xl p-3 mb-2">
                <StyledView className="flex-row items-center">
                  <SkeletonLoader height={48} width={48} borderRadius="rounded-full" className="mr-3" />
                  <StyledView className="flex-1">
                    <SkeletonLoader height={14} width={120} borderRadius="rounded" className="mb-2" />
                    <SkeletonLoader height={20} width={80} borderRadius="rounded-full" />
                  </StyledView>
                  <SkeletonLoader height={32} width={70} borderRadius="rounded-lg" />
                </StyledView>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

/**
 * ProfileSkeleton Component
 *
 * Skeleton loading state for the profile screen
 */
/**
 * SurveySkeleton Component
 *
 * Skeleton loading state for the daily survey screen
 */
export const SurveySkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <StyledView className={`flex-1 bg-neutral-50 px-4 pt-4 ${className}`}>
      {/* Header Skeleton */}
      <StyledView className="mb-6">
        <StyledView className="flex-row items-center mb-2">
          <SkeletonLoader height={32} width={32} borderRadius="rounded-full" className="mr-2" />
          <SkeletonLoader height={12} width={80} borderRadius="rounded" />
        </StyledView>
        <SkeletonLoader height={28} width="70%" borderRadius="rounded" className="mb-2" />
        <SkeletonLoader height={16} width="90%" borderRadius="rounded" />
      </StyledView>

      {/* Progress Indicator Skeleton */}
      <StyledView className="flex-row items-center justify-center mb-6">
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
        <SkeletonLoader height={4} width={48} borderRadius="rounded-full" className="mx-2" />
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
        <SkeletonLoader height={4} width={48} borderRadius="rounded-full" className="mx-2" />
        <SkeletonLoader height={32} width={32} borderRadius="rounded-full" />
      </StyledView>

      {/* Recipient Card Skeleton */}
      <StyledView className="bg-white rounded-2xl mb-8 overflow-hidden">
        <SkeletonLoader height={48} width="100%" borderRadius="rounded-none" className="mb-4" />
        <StyledView className="px-4 pb-4">
          <StyledView className="flex-row">
            <SkeletonLoader height={88} width={88} borderRadius="rounded-xl" />
            <StyledView className="flex-1 ml-4 justify-center">
              <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={14} width={100} borderRadius="rounded" className="mb-1" />
              <SkeletonLoader height={12} width={80} borderRadius="rounded" />
            </StyledView>
          </StyledView>
          <StyledView className="flex-row mt-4" style={{ gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={28} width={70} borderRadius="rounded-full" />
            ))}
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Section Header Skeleton */}
      <StyledView className="mb-4">
        <SkeletonLoader height={22} width={100} borderRadius="rounded" className="mb-1" />
        <SkeletonLoader height={14} width={180} borderRadius="rounded" />
      </StyledView>

      {/* Candidate Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <StyledView key={i} className="bg-white rounded-2xl p-4 mb-4">
          <StyledView className="flex-row mb-4">
            <SkeletonLoader height={100} width={100} borderRadius="rounded-xl" />
            <StyledView className="flex-1 ml-4 justify-center">
              <SkeletonLoader height={18} width={100} borderRadius="rounded" className="mb-2" />
              <SkeletonLoader height={14} width={120} borderRadius="rounded" className="mb-1" />
              <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-3" />
              <SkeletonLoader height={14} width={90} borderRadius="rounded" />
            </StyledView>
          </StyledView>
          <SkeletonLoader height={1} width="100%" borderRadius="rounded" className="mb-4" />
          <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-2" />
          <StyledView className="flex-row" style={{ gap: 8 }}>
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
            <SkeletonLoader height={44} width="32%" borderRadius="rounded-xl" />
          </StyledView>
        </StyledView>
      ))}
    </StyledView>
  );
};

export const ProfileSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <StyledView className={`flex-1 bg-neutral-50 ${className}`}>
      {/* Header Skeleton */}
      <StyledView className="bg-white border-b border-neutral-200">
        <StyledView className="px-4 py-3 flex-row justify-between items-center">
          <SkeletonLoader height={24} width={120} borderRadius="rounded" />
          <StyledView className="flex-row space-x-3">
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Profile Photo and Name Skeleton */}
      <StyledView className="bg-white px-4 pb-4">
        <StyledView className="items-center">
          <SkeletonLoader height={96} width={96} borderRadius="rounded-full" className="mb-3" />
          <SkeletonLoader height={20} width={100} borderRadius="rounded" className="mb-3" />

          {/* Photo Gallery Preview Skeleton */}
          <StyledView className="flex-row space-x-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={64} width={64} borderRadius="rounded-lg" />
            ))}
          </StyledView>
        </StyledView>

        {/* Friends Section Skeleton */}
        <StyledView className="flex-row justify-center mt-4 space-x-3">
          <SkeletonLoader height={36} width={100} borderRadius="rounded-full" />
          <SkeletonLoader height={36} width={120} borderRadius="rounded-full" />
        </StyledView>
      </StyledView>

      {/* Tab Bar Skeleton */}
      <StyledView className="bg-white border-t border-neutral-100 flex-row">
        <StyledView className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={60} borderRadius="rounded" />
        </StyledView>
        <StyledView className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={80} borderRadius="rounded" />
        </StyledView>
        <StyledView className="flex-1 py-3 items-center">
          <SkeletonLoader height={16} width={70} borderRadius="rounded" />
        </StyledView>
      </StyledView>

      {/* Content Cards Skeleton */}
      <StyledView className="px-4 py-6">
        {/* Profile Completeness Card Skeleton */}
        <StyledView className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <StyledView className="flex-row items-center mb-3">
            <SkeletonLoader height={24} width={24} borderRadius="rounded-full" />
            <SkeletonLoader height={18} width={150} borderRadius="rounded" className="ml-3" />
          </StyledView>
          <SkeletonLoader height={8} width="100%" borderRadius="rounded-full" className="mb-3" />
          <SkeletonLoader height={14} width="80%" borderRadius="rounded" />
        </StyledView>

        {/* Section Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <StyledView key={i} className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <SkeletonLoader height={20} width={120} borderRadius="rounded" className="mb-4" />
            <StyledView className="space-y-3">
              <StyledView className="flex-row items-center">
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <StyledView className="flex-1 ml-3">
                  <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-1" />
                  <SkeletonLoader height={16} width={120} borderRadius="rounded" />
                </StyledView>
              </StyledView>
              <StyledView className="flex-row items-center">
                <SkeletonLoader height={40} width={40} borderRadius="rounded-lg" />
                <StyledView className="flex-1 ml-3">
                  <SkeletonLoader height={12} width={80} borderRadius="rounded" className="mb-1" />
                  <SkeletonLoader height={16} width={100} borderRadius="rounded" />
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>
        ))}
      </StyledView>
    </StyledView>
  );
};
