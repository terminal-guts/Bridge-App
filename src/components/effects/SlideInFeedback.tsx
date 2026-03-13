/**
 * SlideInFeedback Component
 *
 * Generic slide-in confirmation component for transient feedback.
 * Uses Reanimated springs for entrance and timing for exit.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { SPRINGS, DURATIONS } from '../../constants/animations';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../icons';

type FeedbackType = 'success' | 'info' | 'warning' | 'error';

interface SlideInFeedbackProps {
  visible: boolean;
  message: string;
  icon?: string;
  type?: FeedbackType;
  duration?: number;
  onHide?: () => void;
}

const TYPE_CONFIG: Record<FeedbackType, { bg: string; icon: string }> = {
  success: { bg: COLORS.emerald, icon: 'checkmark-circle' },
  info: { bg: COLORS.primaryAccent, icon: 'information-circle' },
  warning: { bg: COLORS.warning?.icon || '#F59E0B', icon: 'alert-triangle' },
  error: { bg: COLORS.error, icon: 'close-circle' },
};

export function SlideInFeedback({
  visible,
  message,
  icon,
  type = 'success',
  duration = 2000,
  onHide,
}: SlideInFeedbackProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        opacity.value = 1;
        translateY.value = 0;
      } else {
        opacity.value = withTiming(1, { duration: DURATIONS.micro });
        translateY.value = withSpring(0, SPRINGS.responsive);
      }

      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
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
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const config = TYPE_CONFIG[type];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 96,
          left: 16,
          right: 16,
          zIndex: 50,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: config.bg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <EvaIcon
          name={icon || config.icon}
          variant="outline"
          size={24}
          color="#FFFFFF"
        />
        <Text
          style={{
            flex: 1,
            marginLeft: 12,
            fontFamily: FONTS.medium,
            color: '#FFFFFF',
            fontSize: 15,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
