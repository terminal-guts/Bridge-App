/**
 * Confetti Component
 *
 * Displays celebratory confetti animation when user completes all votes.
 * Lightweight implementation using Animated API.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiProps {
  trigger: boolean; // Set to true to trigger animation
  onComplete?: () => void;
}

interface ConfettiPiece {
  id: number;
  x: number;
  rotation: Animated.Value;
  translateY: Animated.Value;
  translateX: Animated.Value;
  scale: Animated.Value;
  color: string;
}

const COLORS = ['#437FFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    if (trigger) {
      // Generate confetti pieces
      confettiPieces.current = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        rotation: new Animated.Value(0),
        translateY: new Animated.Value(-50),
        translateX: new Animated.Value(0),
        scale: new Animated.Value(1),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));

      // Animate all pieces
      const animations = confettiPieces.current.map((piece) => {
        const fallDistance = height + 100;
        const drift = (Math.random() - 0.5) * 200;

        return Animated.parallel([
          Animated.timing(piece.translateY, {
            toValue: fallDistance,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(piece.translateX, {
            toValue: drift,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotation, {
            toValue: (Math.random() - 0.5) * 10,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(piece.scale, {
              toValue: 1.2,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(piece.scale, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      Animated.parallel(animations).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [trigger]);

  if (!trigger) {
    return null;
  }

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
      {confettiPieces.current.map((piece) => (
        <Animated.View
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.x,
            width: 10,
            height: 10,
            backgroundColor: piece.color,
            transform: [
              { translateY: piece.translateY },
              { translateX: piece.translateX },
              { rotate: piece.rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              })},
              { scale: piece.scale },
            ],
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

export default Confetti;
