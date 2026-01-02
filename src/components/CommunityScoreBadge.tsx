/**
 * CommunityScoreBadge Component
 *
 * Enhanced display of community match score with:
 * - Visual meter/gauge
 * - Percentile context
 * - Animated reveal
 * - Contextual micro-copy based on score level
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, Body } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic } from '../utils/haptics';

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);

interface CommunityScoreBadgeProps {
  score: number;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  rankingBreakdown?: {
    firstChoice: number;
    secondChoice: number;
    thirdChoice: number;
  };
}

/**
 * Get score tier and associated styling/messaging
 */
const getScoreTier = (score: number) => {
  if (score >= 90) {
    return {
      tier: 'exceptional',
      label: 'Exceptional Match',
      description: 'Your friends are excited about this one!',
      percentile: 'Top 5%',
      color: '#10B981', // green
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      icon: 'star' as const,
    };
  }
  if (score >= 80) {
    return {
      tier: 'strong',
      label: 'Strong Match',
      description: 'Multiple friends ranked you highly',
      percentile: 'Top 15%',
      color: '#437FFF', // primary blue
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      textColor: 'text-primary-700',
      icon: 'heart' as const,
    };
  }
  if (score >= 70) {
    return {
      tier: 'good',
      label: 'Good Potential',
      description: 'Worth exploring further',
      percentile: 'Top 30%',
      color: '#8B5CF6', // purple
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      icon: 'sparkles' as const,
    };
  }
  return {
    tier: 'promising',
    label: 'Promising',
    description: 'Your friends see potential here',
    percentile: 'Top 50%',
    color: '#F59E0B', // amber
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: 'flash' as const,
  };
};

/**
 * Circular progress gauge component
 */
const ScoreGauge: React.FC<{
  score: number;
  size: number;
  color: string;
  animated: boolean;
}> = ({ score, size, color, animated }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: score / 100,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(score / 100);
    }
  }, [score, animated, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * 0.15], // Leave small gap at top
  });

  return (
    <StyledView style={{ width: size, height: size, position: 'relative' }}>
      {/* Background circle */}
      <StyledView
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#E5E7EB',
        }}
      />
      {/* Animated progress circle - simulated with View */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{ rotate: '-90deg' }],
          opacity: animatedValue,
        }}
      />
      {/* Score text in center */}
      <StyledView
        className="absolute items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Animated.Text
          style={{
            fontSize: size * 0.28,
            fontWeight: '700',
            color: '#1F2937',
          }}
        >
          {score}
        </Animated.Text>
      </StyledView>
    </StyledView>
  );
};

export const CommunityScoreBadge: React.FC<CommunityScoreBadgeProps> = ({
  score,
  animate = true,
  size = 'md',
  showBreakdown = false,
  rankingBreakdown,
}) => {
  const scoreTier = getScoreTier(score);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const gaugeSize = size === 'sm' ? 80 : size === 'md' ? 100 : 120;

  useEffect(() => {
    if (animate) {
      // Trigger haptic on mount for "reveal" feeling
      lightHaptic();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animate, fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <StyledView
        className={`${scoreTier.bgColor} ${scoreTier.borderColor} border rounded-2xl p-5`}
        style={{
          shadowColor: scoreTier.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Top row: Gauge + Info */}
        <StyledView className="flex-row items-center">
          {/* Score Gauge */}
          <ScoreGauge
            score={score}
            size={gaugeSize}
            color={scoreTier.color}
            animated={animate}
          />

          {/* Score Info */}
          <StyledView className="flex-1 ml-4">
            {/* Tier Label with Icon */}
            <StyledView className="flex-row items-center mb-1">
              <Ionicons name={scoreTier.icon} size={16} color={scoreTier.color} />
              <Body className={`${scoreTier.textColor} font-semibold ml-1.5`}>
                {scoreTier.label}
              </Body>
            </StyledView>

            {/* Percentile Badge */}
            <StyledView
              className="self-start rounded-full px-2.5 py-1 mb-2"
              style={{ backgroundColor: `${scoreTier.color}20` }}
            >
              <Body
                className="text-xs font-bold"
                style={{ color: scoreTier.color }}
              >
                {scoreTier.percentile}
              </Body>
            </StyledView>

            {/* Description */}
            <Body className="text-neutral-600 text-sm">
              {scoreTier.description}
            </Body>
          </StyledView>
        </StyledView>

        {/* Ranking Breakdown (optional) */}
        {showBreakdown && rankingBreakdown && (
          <StyledView className="mt-4 pt-4 border-t border-neutral-200">
            <Body className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
              How Friends Ranked You
            </Body>
            <StyledView className="flex-row justify-around">
              <StyledView className="items-center">
                <StyledView className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mb-1">
                  <Ionicons name="trophy" size={16} color="#EAB308" />
                </StyledView>
                <Body className="text-neutral-900 font-bold">
                  {rankingBreakdown.firstChoice}
                </Body>
                <Body className="text-neutral-500 text-xs">#1 picks</Body>
              </StyledView>
              <StyledView className="items-center">
                <StyledView className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mb-1">
                  <Ionicons name="medal" size={16} color="#6B7280" />
                </StyledView>
                <Body className="text-neutral-900 font-bold">
                  {rankingBreakdown.secondChoice}
                </Body>
                <Body className="text-neutral-500 text-xs">#2 picks</Body>
              </StyledView>
              <StyledView className="items-center">
                <StyledView className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mb-1">
                  <Ionicons name="ribbon" size={16} color="#F97316" />
                </StyledView>
                <Body className="text-neutral-900 font-bold">
                  {rankingBreakdown.thirdChoice}
                </Body>
                <Body className="text-neutral-500 text-xs">#3 picks</Body>
              </StyledView>
            </StyledView>
          </StyledView>
        )}
      </StyledView>
    </Animated.View>
  );
};

export default CommunityScoreBadge;
