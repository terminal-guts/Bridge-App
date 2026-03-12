/**
 * CelebrationBanner Component
 *
 * Displays a celebratory message when all friends have been helped today.
 * Features:
 * - Gradient background (rose to amber)
 * - Confetti particle animation on mount
 * - Success haptic feedback
 */

import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { CELEBRATION_BANNER } from '../../constants/friendsArea';
import { successHaptic } from '../../utils/haptics';
import { SHADOWS } from '../../theme/shadows';
import { FONTS } from '../../constants/typography';

const StyledView = styled(View);
const StyledText = styled(Text);

// Track if haptic has fired recently (within 5 seconds) to prevent spam
let lastHapticTime = 0;
const HAPTIC_COOLDOWN = 5000; // 5 seconds

export const CelebrationBanner: React.FC = () => {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    // Only fire haptic once per mount and respect cooldown
    const now = Date.now();
    if (!hasFiredRef.current && (now - lastHapticTime) > HAPTIC_COOLDOWN) {
      successHaptic();
      hasFiredRef.current = true;
      lastHapticTime = now;
    }
  }, []);

  return (
    <StyledView
      style={{
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
      }}
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
            fontSize: 15,
            fontWeight: '700',
            fontFamily: FONTS.bold,
            color: '#881337',
            textAlign: 'center',
            letterSpacing: 0.2,
          }}
        >
          🎉 You helped everyone today! 🌟
        </StyledText>
      </LinearGradient>
    </StyledView>
  );
};

export default CelebrationBanner;
