/**
 * Toast Component
 *
 * Displays temporary feedback messages with smooth animations
 * Used for vote confirmations and other brief notifications
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon, type IconName    } from '../../components/icons';

const StyledView = styled(View);
const StyledText = styled(Text);

interface ToastProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
  duration?: number;
  onHide?: () => void;
}

export function Toast({
  message,
  visible,
  type = 'success',
  icon,
  duration = 2000,
  onHide,
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible && (fadeAnim as any)._value === 0) {
    return null;
  }

  const typeConfig = {
    success: {
      bg: '#10B981',
      icon: 'checkmark-circle',
    },
    info: {
      bg: '#437FFF',
      icon: 'information-circle',
    },
    warning: {
      bg: '#F59E0B',
      icon: 'warning',
    },
    error: {
      bg: '#EF4444',
      icon: 'close-circle',
    },
  };

  const config = typeConfig[type];

  return (
    <Animated.View
      className="absolute bottom-24 left-4 right-4 z-50"
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <StyledView
        className="flex-row items-center px-4 py-3 rounded-xl shadow-lg"
        style={{
          backgroundColor: config.bg,
        }}
      >
        {/* Icon */}
        <EvaIcon name={(icon || config.icon) as any} size={24} color="#FFFFFF" />

        {/* Message */}
        <StyledText className="flex-1 text-white font-medium ml-3">
          {message}
        </StyledText>
      </StyledView>
    </Animated.View>
  );
}

export default Toast;
