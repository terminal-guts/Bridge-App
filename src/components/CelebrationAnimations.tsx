/**
 * Celebration Animations
 *
 * Delightful animations for positive user actions:
 * - Confetti for match acceptance
 * - Success modals
 * - Achievement celebrations
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Modal } from 'react-native';
import { styled } from 'nativewind';
import { H2, Body, Button } from './ui';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Confetti Animation
 * Displays falling confetti particles
 */
interface ConfettiProps {
  visible: boolean;
  duration?: number;
}

interface Particle {
  id: number;
  x: number;
  y: Animated.Value;
  rotation: Animated.Value;
  color: string;
  size: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ visible, duration = 3000 }) => {
  const particles = useRef<Particle[]>([]).current;
  const PARTICLE_COUNT = 50;

  useEffect(() => {
    if (visible && particles.length === 0) {
      // Initialize particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          id: i,
          x: Math.random() * SCREEN_WIDTH,
          y: new Animated.Value(-20),
          rotation: new Animated.Value(0),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: Math.random() * 8 + 4,
        });
      }
    }

    if (visible) {
      // Animate particles
      particles.forEach((particle, index) => {
        // Stagger start times
        setTimeout(() => {
          Animated.parallel([
            // Fall animation
            Animated.timing(particle.y, {
              toValue: SCREEN_HEIGHT + 100,
              duration: duration + Math.random() * 1000,
              useNativeDriver: true,
            }),
            // Rotation animation
            Animated.loop(
              Animated.timing(particle.rotation, {
                toValue: 360,
                duration: 2000 + Math.random() * 1000,
                useNativeDriver: true,
              })
            ),
          ]).start();
        }, index * 50);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <StyledView className="absolute inset-0 z-50" pointerEvents="none">
      {particles.map(particle => (
        <StyledAnimatedView
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.x,
            width: particle.size,
            height: particle.size * 1.5,
            backgroundColor: particle.color,
            borderRadius: 2,
            transform: [
              { translateY: particle.y },
              {
                rotate: particle.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </StyledView>
  );
};

const CONFETTI_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Orange
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
];

/**
 * Success Modal
 * Full-screen success celebration
 */
interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  icon = 'checkmark-circle',
  onClose,
  autoClose = true,
  autoCloseDuration = 2000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close
      if (autoClose && onClose) {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => onClose());
        }, autoCloseDuration);
      }
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <StyledView className="flex-1 bg-black/50 items-center justify-center p-6">
        <StyledAnimatedView
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm items-center"
        >
          {/* Icon */}
          <StyledView className="w-24 h-24 bg-success/20 rounded-full items-center justify-center mb-4">
            <Ionicons name={icon} size={56} color="#12B981" />
          </StyledView>

          {/* Title */}
          <H2 className="text-center mb-2">{title}</H2>

          {/* Message */}
          <Body className="text-neutral-600 text-center mb-6">{message}</Body>

          {/* Close button (if not auto-closing) */}
          {!autoClose && onClose && (
            <Button onPress={onClose} variant="primary" fullWidth>
              Continue
            </Button>
          )}
        </StyledAnimatedView>
      </StyledView>
    </Modal>
  );
};

/**
 * Floating Hearts Animation
 * Hearts floating upward (for match accepted)
 */
interface FloatingHeartsProps {
  visible: boolean;
  count?: number;
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({
  visible,
  count = 10,
}) => {
  const hearts = useRef<Array<{ id: number; x: number; anim: Animated.Value }>>([]).current;

  useEffect(() => {
    if (visible && hearts.length === 0) {
      for (let i = 0; i < count; i++) {
        hearts.push({
          id: i,
          x: Math.random() * (SCREEN_WIDTH - 40) + 20,
          anim: new Animated.Value(SCREEN_HEIGHT),
        });
      }
    }

    if (visible) {
      hearts.forEach((heart, index) => {
        setTimeout(() => {
          Animated.timing(heart.anim, {
            toValue: -100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }).start();
        }, index * 200);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <StyledView className="absolute inset-0 z-40" pointerEvents="none">
      {hearts.map(heart => (
        <StyledAnimatedView
          key={heart.id}
          style={{
            position: 'absolute',
            left: heart.x,
            transform: [{ translateY: heart.anim }],
          }}
        >
          <Ionicons name="heart" size={30} color="#FF6B9D" />
        </StyledAnimatedView>
      ))}
    </StyledView>
  );
};

/**
 * Pulse Animation
 * Pulsing glow effect (for urgency, timers)
 */
interface PulseProps {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  intensity?: number;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  active,
  color = '#FF6B6B',
  intensity = 1,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1 + 0.1 * intensity,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  return (
    <StyledAnimatedView
      style={{
        transform: [{ scale: pulseAnim }],
      }}
    >
      {children}
    </StyledAnimatedView>
  );
};

/**
 * Shimmer Effect
 * Loading shimmer animation
 */
export const Shimmer: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <StyledView
      className="bg-neutral-200 rounded-lg overflow-hidden"
      style={{ width, height }}
    >
      <StyledAnimatedView
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{
          transform: [{ translateX }],
          width,
        }}
      />
    </StyledView>
  );
};
