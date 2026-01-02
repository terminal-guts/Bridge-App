/**
 * StickyActionBar Component
 *
 * Floating action bar for match decisions with:
 * - Pass and Accept buttons always visible
 * - "Save for Later" option
 * - Undo functionality with countdown
 * - Haptic feedback
 * - Animated transitions
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { styled } from 'nativewind';
import { Body, Button } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);

interface StickyActionBarProps {
  onPass: () => void;
  onAccept: () => void;
  onSaveForLater?: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  showSaveForLater?: boolean;
  savedCount?: number;
  maxSaved?: number;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  onPass,
  onAccept,
  onSaveForLater,
  isSubmitting = false,
  disabled = false,
  showSaveForLater = true,
  savedCount = 0,
  maxSaved = 2,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [passPressed, setPassPressed] = useState(false);
  const [acceptPressed, setAcceptPressed] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handlePass = async () => {
    if (isSubmitting || disabled) return;
    await mediumHaptic();
    setPassPressed(true);
    setTimeout(() => setPassPressed(false), 150);
    onPass();
  };

  const handleAccept = async () => {
    if (isSubmitting || disabled) return;
    await successHaptic();
    setAcceptPressed(true);
    setTimeout(() => setAcceptPressed(false), 150);
    onAccept();
  };

  const handleSaveForLater = async () => {
    if (isSubmitting || disabled || savedCount >= maxSaved) return;
    await lightHaptic();
    onSaveForLater?.();
  };

  const canSave = savedCount < maxSaved;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom + 8,
      }}
    >
      {/* Gradient fade effect at top */}
      <StyledView
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          right: 0,
          height: 20,
          backgroundColor: 'transparent',
        }}
      />

      <StyledView
        className="bg-white border-t border-neutral-100 px-4 pt-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Save for Later Option */}
        {showSaveForLater && onSaveForLater && (
          <StyledTouchableOpacity
            onPress={handleSaveForLater}
            disabled={!canSave || isSubmitting}
            className={`mb-3 py-2 items-center flex-row justify-center ${!canSave ? 'opacity-40' : ''}`}
          >
            <Ionicons
              name="bookmark-outline"
              size={18}
              color={canSave ? '#437FFF' : '#9CA3AF'}
            />
            <Body className={`ml-2 text-sm ${canSave ? 'text-primary-500' : 'text-neutral-400'}`}>
              {canSave
                ? `Save for Later (${maxSaved - savedCount} remaining)`
                : 'No saves remaining'}
            </Body>
          </StyledTouchableOpacity>
        )}

        {/* Main Action Buttons */}
        <StyledView className="flex-row -mx-2">
          {/* Pass Button */}
          <StyledView className="flex-1 px-2">
            <TouchableOpacity
              onPress={handlePass}
              disabled={isSubmitting || disabled}
              activeOpacity={0.8}
              style={{
                backgroundColor: passPressed ? '#F3F4F6' : '#FFFFFF',
                borderWidth: 2,
                borderColor: '#E5E7EB',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                transform: [{ scale: passPressed ? 0.97 : 1 }],
              }}
            >
              <Ionicons
                name="close"
                size={24}
                color={isSubmitting ? '#9CA3AF' : '#6B7280'}
              />
              <Body
                className={`ml-2 font-semibold text-base ${isSubmitting ? 'text-neutral-400' : 'text-neutral-600'}`}
              >
                {isSubmitting ? 'Wait...' : 'Pass'}
              </Body>
            </TouchableOpacity>
          </StyledView>

          {/* Accept Button */}
          <StyledView className="flex-1 px-2">
            <TouchableOpacity
              onPress={handleAccept}
              disabled={isSubmitting || disabled}
              activeOpacity={0.8}
              style={{
                backgroundColor: acceptPressed ? '#3B6FDD' : '#437FFF',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                transform: [{ scale: acceptPressed ? 0.97 : 1 }],
                shadowColor: '#437FFF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="heart" size={24} color="#FFFFFF" />
              <Body className="ml-2 font-semibold text-base text-white">
                {isSubmitting ? 'Wait...' : 'Accept'}
              </Body>
            </TouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>
    </Animated.View>
  );
};

/**
 * UndoToast Component
 *
 * Shows after passing with countdown to undo
 */
interface UndoToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  visible,
  message,
  duration = 5000,
  onUndo,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (visible) {
      setCountdown(Math.ceil(duration / 1000));
      progressAnim.setValue(1);

      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Progress animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-dismiss
      const dismissTimeout = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(dismissTimeout);
      };
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration, slideAnim, progressAnim]);

  const handleUndo = async () => {
    await lightHaptic();
    onUndo();
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <StyledView
        className="bg-neutral-900 rounded-2xl overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Progress bar */}
        <Animated.View
          style={{
            height: 3,
            backgroundColor: '#437FFF',
            width: progressWidth,
          }}
        />

        <StyledView className="flex-row items-center justify-between px-4 py-3">
          <StyledView className="flex-row items-center flex-1">
            <StyledView className="w-8 h-8 bg-neutral-800 rounded-full items-center justify-center mr-3">
              <Body className="text-white font-bold">{countdown}</Body>
            </StyledView>
            <Body className="text-white flex-1">{message}</Body>
          </StyledView>

          <TouchableOpacity
            onPress={handleUndo}
            className="bg-white px-4 py-2 rounded-full ml-3"
          >
            <Body className="text-neutral-900 font-semibold">Undo</Body>
          </TouchableOpacity>
        </StyledView>
      </StyledView>
    </Animated.View>
  );
};

export default StickyActionBar;
