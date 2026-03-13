/**
 * CelebrationBanner Component
 *
 * Displays a celebratory message when all friends have been helped today.
 * Features:
 * - Gradient background (rose to amber)
 * - Spring scale-in entrance animation
 * - Success haptic feedback
 */

import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { successHaptic } from '../../utils/haptics';
import { SHADOWS } from '../../theme/shadows';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPRINGS } from '../../constants/animations';

const StyledText = styled(Text);

// Track if haptic has fired recently (within 5 seconds) to prevent spam
let lastHapticTime = 0;
const HAPTIC_COOLDOWN = 5000; // 5 seconds

export const CelebrationBanner: React.FC = () => {
  const hasFiredRef = useRef(false);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    // Bounce in on mount
    scale.value = withSpring(1, SPRINGS.bouncy);

    // Only fire haptic once per mount and respect cooldown
    const now = Date.now();
    if (!hasFiredRef.current && (now - lastHapticTime) > HAPTIC_COOLDOWN) {
      successHaptic();
      hasFiredRef.current = true;
      lastHapticTime = now;
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={[animatedStyle, {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
      }]}
    >
      <LinearGradient
        colors={['#FFF1F2', '#FFFBEB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 18,
          paddingHorizontal: 24,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: '#FFE4E6',
          ...SHADOWS.accentRed,
        }}
      >
        <StyledText
          style={{
            fontSize: FONT_SIZES.lg,
            fontWeight: '700',
            fontFamily: FONTS.bold,
            color: '#881337',
            textAlign: 'center',
            letterSpacing: 0.2,
          }}
        >
          You helped everyone today!
        </StyledText>
      </LinearGradient>
    </Animated.View>
  );
};

export default CelebrationBanner;
