/**
 * Undo Snackbar Component
 *
 * Shows a temporary snackbar with undo functionality
 * Used for reversible actions like declining matches
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { Body, Button } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { mediumHaptic } from '../utils/haptics';

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
  position?: 'top' | 'bottom';
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  position = 'bottom',
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset animations
      translateY.setValue(100);
      opacity.setValue(0);
      progressAnim.setValue(0);
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleUndo = async () => {
    await mediumHaptic();
    handleDismiss();
    // Wait for dismiss animation before calling undo
    setTimeout(() => {
      onUndo();
    }, 250);
  };

  if (!visible) return null;

  const positionStyle = position === 'top'
    ? { top: 60 }
    : { bottom: 100 };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  return (
    <StyledAnimatedView
      className="absolute left-4 right-4 z-50"
      style={{
        ...positionStyle,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <StyledView className="bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <Animated.View
          style={{
            height: 3,
            backgroundColor: '#437FFF',
            width: progressWidth,
          }}
        />

        <StyledView className="flex-row items-center justify-between px-4 py-3">
          {/* Icon and Message */}
          <StyledView className="flex-row items-center flex-1 mr-3">
            <StyledView className="w-8 h-8 bg-primary-500/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="arrow-undo" size={16} color="#437FFF" />
            </StyledView>
            <Body className="text-white flex-1">{message}</Body>
          </StyledView>

          {/* Undo Button */}
          <StyledTouchableOpacity
            onPress={handleUndo}
            className="bg-primary-500 px-4 py-2 rounded-lg"
            activeOpacity={0.8}
          >
            <Body className="text-white font-semibold">Undo</Body>
          </StyledTouchableOpacity>

          {/* Dismiss Button */}
          <StyledTouchableOpacity
            onPress={handleDismiss}
            className="ml-2 w-8 h-8 items-center justify-center"
            activeOpacity={0.6}
          >
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledAnimatedView>
  );
};

/**
 * Simple Snackbar (no undo action)
 */
interface SnackbarProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onDismiss: () => void;
  duration?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 3000,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const config = getSnackbarConfig(type);

  return (
    <StyledAnimatedView
      className="absolute bottom-24 left-4 right-4 z-50"
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      <StyledView
        className="rounded-2xl shadow-2xl px-4 py-3 flex-row items-center"
        style={{ backgroundColor: config.bg }}
      >
        <StyledView
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: config.iconBg }}
        >
          <Ionicons name={config.icon} size={18} color={config.iconColor} />
        </StyledView>
        <Body className="flex-1" style={{ color: config.textColor }}>
          {message}
        </Body>
      </StyledView>
    </StyledAnimatedView>
  );
};

const getSnackbarConfig = (type: 'success' | 'error' | 'info' | 'warning') => {
  const configs = {
    success: {
      bg: '#12B981',
      iconBg: 'rgba(255, 255, 255, 0.2)',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    },
    error: {
      bg: '#EF4444',
      iconBg: 'rgba(255, 255, 255, 0.2)',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
    },
    warning: {
      bg: '#F59E0B',
      iconBg: 'rgba(255, 255, 255, 0.2)',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      icon: 'warning' as keyof typeof Ionicons.glyphMap,
    },
    info: {
      bg: '#1F2937',
      iconBg: 'rgba(67, 127, 255, 0.2)',
      iconColor: '#437FFF',
      textColor: '#FFFFFF',
      icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
    },
  };

  return configs[type];
};
