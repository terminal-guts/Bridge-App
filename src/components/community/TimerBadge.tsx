/**
 * TimerBadge Component
 *
 * Displays countdown timer with urgency-based styling and animations.
 *
 * States:
 * - Plenty (6+ hours): Gray, calm
 * - Moderate (2-6 hours): Orange, warm
 * - Urgent (<2 hours): Rose, subtle pulse
 * - Critical (<15 min): Red, noticeable pulse
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { styled } from 'nativewind';
import { TIMER_STATES } from '../../constants/friendsArea';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('TimerBadge');

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledAnimatedView = styled(Animated.View);

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
    // Handle empty or invalid strings
    if (!timeString || typeof timeString !== 'string') {
      return 999; // Default to "plenty"
    }

    // Extract hours and minutes with flexible regex
    const hourMatch = timeString.match(/(\d+)\s*h/i);
    const minuteMatch = timeString.match(/(\d+)\s*m/i);

    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

    // Validate parsed values
    if (isNaN(hours) || isNaN(minutes)) {
      return 999;
    }

    // Prevent negative values (edge case: clock skew)
    const totalHours = Math.max(0, hours + minutes / 60);

    return totalHours;
  } catch (error) {
    logger.warn('[TimerBadge] Failed to parse time string:', timeString, error);
    return 999; // Default to "plenty" if parsing fails
  }
};

/**
 * Get timer state based on hours remaining
 */
const getTimerState = (hoursRemaining: number): TimerState => {
  if (hoursRemaining < 0.25) {
    // < 15 minutes - CRITICAL
    return {
      icon: TIMER_STATES.CRITICAL.icon,
      color: TIMER_STATES.CRITICAL.color,
      bgColor: TIMER_STATES.CRITICAL.bgColor,
      borderColor: TIMER_STATES.CRITICAL.borderColor,
      shouldPulse: true,
    };
  } else if (hoursRemaining < 2) {
    // < 2 hours - URGENT
    return {
      icon: TIMER_STATES.URGENT.icon,
      color: TIMER_STATES.URGENT.color,
      bgColor: TIMER_STATES.URGENT.bgColor,
      borderColor: TIMER_STATES.URGENT.borderColor,
      shouldPulse: true,
    };
  } else if (hoursRemaining < 6) {
    // 2-6 hours - MODERATE
    return {
      icon: TIMER_STATES.MODERATE.icon,
      color: TIMER_STATES.MODERATE.color,
      bgColor: TIMER_STATES.MODERATE.bgColor,
      borderColor: TIMER_STATES.MODERATE.borderColor,
      shouldPulse: false,
    };
  } else {
    // 6+ hours - PLENTY
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

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (timerState.shouldPulse) {
      // Start pulse animation
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => {
        animation.stop();
        pulseAnim.setValue(1);
      };
    } else {
      // Reset to no pulse
      pulseAnim.setValue(1);
    }
  }, [timerState.shouldPulse, pulseAnim]);

  return (
    <StyledAnimatedView
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: timerState.bgColor,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: timerState.borderColor,
        transform: [{ scale: pulseAnim }],
        shadowColor: timerState.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <StyledText style={{ fontSize: 15, marginRight: 5 }}>
        {timerState.icon}
      </StyledText>
      <StyledText
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: timerState.color,
          letterSpacing: 0.2,
        }}
      >
        {timeRemaining}
      </StyledText>
    </StyledAnimatedView>
  );
};

export default TimerBadge;
