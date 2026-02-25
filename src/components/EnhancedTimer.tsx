/**
 * Enhanced Timer Component
 *
 * Visual countdown timer with:
 * - Circular progress indicator
 * - Color coding based on time remaining
 * - Pulsing animation when urgent
 * - Milestone notifications
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body } from './ui';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('EnhancedTimer');

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface EnhancedTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const EnhancedTimer: React.FC<EnhancedTimerProps> = ({
  expiresAt,
  onExpired,
  size = 'md',
  showLabel = true,
}) => {
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [formattedTime, setFormattedTime] = React.useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Size configurations
  const sizeConfig = {
    sm: { diameter: 60, strokeWidth: 4, fontSize: 'text-sm', iconSize: 16 },
    md: { diameter: 80, strokeWidth: 6, fontSize: 'text-base', iconSize: 20 },
    lg: { diameter: 120, strokeWidth: 8, fontSize: 'text-xl', iconSize: 28 },
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiresAtTime - now);

      setTimeRemaining(remaining);
      setFormattedTime(formatTimeRemaining(remaining));

      if (remaining === 0 && onExpired) {
        // Wrap onExpired in try-catch to handle both sync and async errors
        try {
          const maybePromise = onExpired() as unknown;
          // If it's a promise, catch any errors
          if (maybePromise instanceof Promise) {
            maybePromise.catch((error: Error) => {
              logger.error('[EnhancedTimer] onExpired callback error:', error);
            });
          }
        } catch (error) {
          logger.error('[EnhancedTimer] onExpired callback error:', error);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Pulse animation when urgent (< 3 hours)
  useEffect(() => {
    const hours = timeRemaining / (1000 * 60 * 60);

    if (hours > 0 && hours < 3) {
      // Store animation reference so we can stop it on cleanup
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      // Cleanup: stop animation on unmount or when condition changes
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timeRemaining, pulseAnim]);

  // Calculate progress (0-1)
  const totalDuration = 24 * 60 * 60 * 1000; // 24 hours
  const progress = Math.max(0, Math.min(1, timeRemaining / totalDuration));

  // Color coding based on time remaining
  const hours = timeRemaining / (1000 * 60 * 60);
  const { color, bgColor, label } = getTimeStatus(hours);

  // Calculate stroke dash offset for progress circle
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <StyledView className="items-center">
      <StyledAnimatedView
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <StyledView style={{ width: config.diameter, height: config.diameter }}>
          <Svg width={config.diameter} height={config.diameter}>
            {/* Background circle */}
            <Circle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={config.strokeWidth}
              fill="none"
            />

            {/* Progress circle */}
            <AnimatedCircle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={radius}
              stroke={color}
              strokeWidth={config.strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${config.diameter / 2} ${config.diameter / 2})`}
            />
          </Svg>

          {/* Time display overlay */}
          <StyledView
            className="absolute inset-0 items-center justify-center"
            style={{ width: config.diameter, height: config.diameter }}
          >
            <Ionicons name="time-outline" size={config.iconSize} color={color} />
            <Body className={`${config.fontSize} font-bold mt-1`} style={{ color }}>
              {getShortTime(timeRemaining)}
            </Body>
          </StyledView>
        </StyledView>
      </StyledAnimatedView>

      {showLabel && (
        <StyledView className="mt-3 items-center">
          <StyledView className={`${bgColor} px-3 py-1 rounded-full mb-1`}>
            <Body className="text-xs font-semibold" style={{ color }}>
              {label}
            </Body>
          </StyledView>
          <Body className="text-neutral-600 text-sm">{formattedTime}</Body>
        </StyledView>
      )}
    </StyledView>
  );
};

/**
 * Compact Timer Badge
 * Minimal timer for use in cards
 */
interface TimerBadgeProps {
  expiresAt: string;
  variant?: 'default' | 'warning' | 'danger';
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ expiresAt, variant }) => {
  const [timeRemaining, setTimeRemaining] = React.useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiresAtTime - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const hours = timeRemaining / (1000 * 60 * 60);
  const { color, bgColor, label } = getTimeStatus(hours);

  return (
    <StyledView className={`${bgColor} px-3 py-1.5 rounded-full flex-row items-center`}>
      <Ionicons name="time-outline" size={14} color={color} style={{ marginRight: 4 }} />
      <Body className="text-xs font-semibold" style={{ color }}>
        {label} • {getShortTime(timeRemaining)}
      </Body>
    </StyledView>
  );
};

/**
 * Countdown Text
 * Simple text countdown
 */
interface CountdownTextProps {
  expiresAt: string;
  prefix?: string;
}

export const CountdownText: React.FC<CountdownTextProps> = ({ expiresAt, prefix = 'Expires in' }) => {
  const [formattedTime, setFormattedTime] = React.useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiresAtTime - now);
      setFormattedTime(formatTimeRemaining(remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <Body className="text-neutral-600 text-sm">
      {prefix} {formattedTime}
    </Body>
  );
};

/**
 * Helper Functions
 */

const formatTimeRemaining = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

const getShortTime = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const getTimeStatus = (
  hours: number
): { color: string; bgColor: string; label: string } => {
  if (hours >= 12) {
    return {
      color: '#12B981', // Green
      bgColor: 'bg-success/20',
      label: 'Plenty of time',
    };
  } else if (hours >= 3) {
    return {
      color: '#437FFF', // Blue
      bgColor: 'bg-primary-100',
      label: 'Time remaining',
    };
  } else if (hours >= 1) {
    return {
      color: '#F59E0B', // Orange
      bgColor: 'bg-warning/20',
      label: 'Expiring soon',
    };
  } else {
    return {
      color: '#EF4444', // Red
      bgColor: 'bg-error/20',
      label: 'Expiring now!',
    };
  }
};
