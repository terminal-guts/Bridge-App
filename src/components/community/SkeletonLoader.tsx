/**
 * SkeletonLoader Component
 *
 * Reusable skeleton loader for community components.
 * Provides animated placeholder while content loads.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const StyledView = styled(View) as typeof View;
const AnimatedView = Animated.createAnimatedComponent(StyledView);

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  className?: string;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  className = '',
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      className={`bg-neutral-200 ${className}`}
      style={[
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
      ] as any}
    />
  );
}

/**
 * CandidateCardSkeleton - Loading placeholder for CandidateCard
 */
export function CandidateCardSkeleton() {
  return (
    <StyledView
      className="items-center bg-white rounded-xl p-3 border border-neutral-300"
      style={{
        width: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Photo skeleton */}
      <SkeletonLoader width={80} height={80} borderRadius={40} />

      {/* Name skeleton */}
      <SkeletonLoader width={60} height={16} borderRadius={4} className="mt-2" />

      {/* Location skeleton */}
      <SkeletonLoader width={70} height={12} borderRadius={4} className="mt-1" />

      {/* Attributes skeletons */}
      <StyledView className="mt-2 w-full items-center">
        <SkeletonLoader width={80} height={10} borderRadius={4} className="mb-1" />
        <SkeletonLoader width={70} height={10} borderRadius={4} />
      </StyledView>
    </StyledView>
  );
}

/**
 * AnchorCardSkeleton - Loading placeholder for AnchorCard
 */
export function AnchorCardSkeleton() {
  return (
    <StyledView
      className="bg-white rounded-xl p-4 items-center"
      style={{
        width: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      {/* Photo skeleton */}
      <SkeletonLoader width={100} height={100} borderRadius={50} />

      {/* Name skeleton */}
      <SkeletonLoader width={80} height={16} borderRadius={4} className="mt-3" />

      {/* Age skeleton */}
      <SkeletonLoader width={30} height={14} borderRadius={4} className="mt-1" />

      {/* Location skeleton */}
      <SkeletonLoader width={70} height={12} borderRadius={4} className="mt-1" />
    </StyledView>
  );
}

/**
 * TriangleGridSkeleton - Loading placeholder for entire triangle grid
 */
export function TriangleGridSkeleton() {
  const SCREEN_WIDTH = 375; // Default, will be responsive
  const GRID_PADDING = 20;
  const GRID_SIZE = SCREEN_WIDTH - GRID_PADDING * 2;
  const CARD_WIDTH = 100;
  const ANCHOR_CARD_WIDTH = 120;

  const positions = {
    anchor: {
      top: 0,
      left: GRID_SIZE / 2 - ANCHOR_CARD_WIDTH / 2,
    },
    candidate1: {
      top: GRID_SIZE * 0.5,
      left: 0,
    },
    candidate2: {
      top: GRID_SIZE * 0.5,
      right: 0,
    },
    candidate3: {
      top: GRID_SIZE * 0.8,
      left: GRID_SIZE / 2 - CARD_WIDTH / 2,
    },
  };

  return (
    <StyledView
      className="items-center justify-center py-8"
      style={{ width: SCREEN_WIDTH }}
    >
      <StyledView
        className="relative"
        style={{
          width: GRID_SIZE,
          height: GRID_SIZE,
        }}
      >
        {/* Anchor skeleton */}
        <StyledView
          className="absolute"
          style={{
            top: positions.anchor.top,
            left: positions.anchor.left,
          }}
        >
          <AnchorCardSkeleton />
        </StyledView>

        {/* Candidate 1 skeleton */}
        <StyledView
          className="absolute"
          style={{
            top: positions.candidate1.top,
            left: positions.candidate1.left,
          }}
        >
          <CandidateCardSkeleton />
        </StyledView>

        {/* Candidate 2 skeleton */}
        <StyledView
          className="absolute"
          style={{
            top: positions.candidate2.top,
            right: 0,
          }}
        >
          <CandidateCardSkeleton />
        </StyledView>

        {/* Candidate 3 skeleton */}
        <StyledView
          className="absolute"
          style={{
            top: positions.candidate3.top,
            left: positions.candidate3.left,
          }}
        >
          <CandidateCardSkeleton />
        </StyledView>
      </StyledView>
    </StyledView>
  );
}

export default SkeletonLoader;
