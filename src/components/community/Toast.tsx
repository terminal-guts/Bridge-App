/**
 * Toast Component
 *
 * Displays temporary feedback messages with smooth animations
 * Used for vote confirmations and other brief notifications
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { EvaIcon } from '../icons';
import { SPRINGS, DURATIONS } from '../../constants/animations';

interface ToastProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
  duration?: number;
  onHide?: () => void;
}

const TYPE_CONFIG = {
  success: { bg: COLORS.emerald, icon: 'checkmark-circle' },
  info: { bg: COLORS.primaryAccent, icon: 'info' },
  warning: { bg: COLORS.warning.icon, icon: 'alert-triangle' },
  error: { bg: COLORS.error, icon: 'close-circle' },
} as const;

export function Toast({
  message,
  visible,
  type = 'success',
  icon,
  duration = 2000,
  onHide,
}: ToastProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  const hideToast = useCallback(() => {
    if (reducedMotion) {
      opacity.value = 0;
      translateY.value = 50;
      if (onHide) onHide();
    } else {
      opacity.value = withTiming(0, { duration: DURATIONS.normal });
      translateY.value = withTiming(50, { duration: DURATIONS.normal }, (finished) => {
        if (finished && onHide) runOnJS(onHide)();
      });
    }
  }, [onHide, reducedMotion]);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = 1;
        translateY.value = 0;
      } else {
        opacity.value = withTiming(1, { duration: DURATIONS.micro });
        translateY.value = withSpring(0, SPRINGS.responsive);
      }

      const timer = setTimeout(hideToast, duration);
      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const config = TYPE_CONFIG[type];

  return (
    <Animated.View style={[styles.container, animStyle]} accessibilityRole="alert" accessibilityLabel={message}>
      <View style={[styles.inner, { backgroundColor: config.bg }]}>
        <EvaIcon name={icon || config.icon} variant="outline" size={24} color={COLORS.card} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...SHADOWS.lg,
  },
  message: {
    flex: 1,
    color: COLORS.card,
    fontFamily: FONTS.medium,
    marginLeft: 12,
  },
});

export default Toast;
