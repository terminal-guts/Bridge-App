/**
 * Confetti Component (Reanimated)
 *
 * Celebratory confetti animation for T3 moments (match accepted,
 * onboarding complete, all-votes-done).
 *
 * Migrated from RN Animated to Reanimated for UI-thread performance.
 * Respects reduced motion — returns null when active.
 * Auto-cleans up particles after 2s.
 * Capped at 30 particles max.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#437FFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ConfettiProps {
  trigger: boolean;
  particleCount?: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  color: string;
  fallDuration: number;
  drift: number;
  rotationEnd: number;
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(SCREEN_HEIGHT + 100, { duration: particle.fallDuration });
    translateX.value = withTiming(particle.drift, { duration: particle.fallDuration });
    rotation.value = withTiming(particle.rotationEnd, { duration: 1500 });
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200 }),
      withTiming(0, { duration: 1500 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: particle.x,
    width: 10,
    height: 10,
    backgroundColor: particle.color,
    borderRadius: 2,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value * 360}deg` },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={style} />;
}

export function Confetti({ trigger, particleCount = 30, onComplete }: ConfettiProps) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);
  const batchRef = useRef(0);

  useEffect(() => {
    if (!trigger) {
      setParticles([]);
      return;
    }

    if (reducedMotion) {
      onComplete?.();
      return;
    }

    // Increment batch so particle keys are unique across re-triggers
    const batch = ++batchRef.current;
    const count = Math.min(particleCount, 30);
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: batch * 1000 + i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      fallDuration: 2000 + Math.random() * 1000,
      drift: (Math.random() - 0.5) * 200,
      rotationEnd: (Math.random() - 0.5) * 10,
    }));

    setParticles(newParticles);

    // Auto-cleanup after 2s
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [trigger]);

  if (!trigger || reducedMotion || particles.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {particles.map((particle) => (
        <ConfettiPiece key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

export default Confetti;
