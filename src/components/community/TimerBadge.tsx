/**
 * TimerBadge Component
 *
 * Displays countdown timer with urgency-based styling and animations.
 * Uses Reanimated for smooth 120fps pulse on the UI thread.
 *
 * States:
 * - Plenty (6+ hours): Gray, calm
 * - Moderate (2-6 hours): Orange, warm
 * - Urgent (<2 hours): Rose, subtle pulse
 * - Critical (<15 min): Red, noticeable pulse
 */

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { styled } from 'nativewind';
import { TIMER_STATES } from '../../constants/friendsArea';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';

const logger = createLogger('TimerBadge');

const StyledText = styled(Text);

interface TimerBadgeProps {
  timeRemaining: string; // Format: "9h 17m"
}

interface TimerState {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  shouldPulse: boolean;
}

/**
 * Calculate hours remaining from time string
 * Handles formats: "9h 17m", "9h17m", "9h", "17m", "0h 0m"
 */
const parseHoursFromTimeString = (timeString: string): number => {
  try {
    if (!timeString || typeof timeString !== 'string') {
      return 999;
    }

    const hourMatch = timeString.match(/(\d+)\s*h/i);
    const minuteMatch = timeString.match(/(\d+)\s*m/i);

    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

    if (isNaN(hours) || isNaN(minutes)) {
      return 999;
    }

    return Math.max(0, hours + minutes / 60);
  } catch (error) {
    logger.warn('[TimerBadge] Failed to parse time string:', timeString, error);
    return 999;
  }
};

const getTimerState = (hoursRemaining: number): TimerState => {
  if (hoursRemaining < 0.25) {
    return {
      icon: TIMER_STATES.CRITICAL.icon,
      color: TIMER_STATES.CRITICAL.color,
      bgColor: TIMER_STATES.CRITICAL.bgColor,
      borderColor: TIMER_STATES.CRITICAL.borderColor,
      shouldPulse: true,
    };
  } else if (hoursRemaining < 2) {
    return {
      icon: TIMER_STATES.URGENT.icon,
      color: TIMER_STATES.URGENT.color,
      bgColor: TIMER_STATES.URGENT.bgColor,
      borderColor: TIMER_STATES.URGENT.borderColor,
      shouldPulse: true,
    };
  } else if (hoursRemaining < 6) {
    return {
      icon: TIMER_STATES.MODERATE.icon,
      color: TIMER_STATES.MODERATE.color,
      bgColor: TIMER_STATES.MODERATE.bgColor,
      borderColor: TIMER_STATES.MODERATE.borderColor,
      shouldPulse: false,
    };
  } else {
    return {
      icon: TIMER_STATES.PLENTY.icon,
      color: TIMER_STATES.PLENTY.color,
      bgColor: TIMER_STATES.PLENTY.bgColor,
      borderColor: TIMER_STATES.PLENTY.borderColor,
      shouldPulse: false,
    };
  }
};

export const TimerBadge: React.FC<TimerBadgeProps> = ({ timeRemaining }) => {
  const hours = parseHoursFromTimeString(timeRemaining);
  const timerState = getTimerState(hours);

  const scale = useSharedValue(1);

  useEffect(() => {
    if (timerState.shouldPulse) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }

    return () => cancelAnimation(scale);
  }, [timerState.shouldPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: timerState.bgColor,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: timerState.borderColor,
          shadowColor: timerState.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 2,
        },
      ]}
    >
      <StyledText style={{ fontSize: 15, fontFamily: FONTS.regular, marginRight: 5 }}>
        {timerState.icon}
      </StyledText>
      <StyledText
        style={{
          fontSize: 13,
          fontWeight: '700',
          fontFamily: FONTS.bold,
          color: timerState.color,
          letterSpacing: 0.2,
        }}
      >
        {timeRemaining}
      </StyledText>
    </Animated.View>
  );
};

export default TimerBadge;
