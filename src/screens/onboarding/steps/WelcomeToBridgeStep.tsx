import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { successHaptic } from '../../../utils/haptics';

interface WelcomeToBridgeStepProps {
  onNext: () => void;
  onBack: () => void;
}

const STEPS = [
  {
    icon: 'flash' as const,
    color: COLORS.primaryButton,
    bgColor: '#EEF3FF',
    title: 'Our AI proposes a match',
    description: 'Based on who you are, not just how you look.',
  },
  {
    icon: 'people' as const,
    color: COLORS.emerald,
    bgColor: '#ECFDF5',
    title: 'Your community votes first',
    description: 'Friends vote yes, no, or nominate a better match.',
  },
  {
    icon: 'checkmark-circle-2' as const,
    color: COLORS.primaryButton,
    bgColor: '#EEF3FF',
    title: 'If it passes, it\'s yours to decide',
    description: 'Every match you see has already been vetted.',
  },
];

export const WelcomeToBridgeStep: React.FC<WelcomeToBridgeStepProps> = ({
  onNext,
  onBack,
}) => {
  // Fire a celebration haptic when the user reaches this step
  useEffect(() => {
    successHaptic();
    const timer = setTimeout(() => successHaptic(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <OnboardingLayout
      onContinue={onNext}
      onBack={onBack}
      continueLabel="Let's go"
      hasTextInput={false}
    >
      {/* Celebration badge */}
      <Animated.View entering={ZoomIn.delay(100).duration(500).springify()} style={styles.celebrationBadge}>
        <View style={styles.celebrationCircle}>
          <EvaIcon name="checkmark-circle-2" variant="fill" size={36} color="#fff" />
        </View>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.header}>
        <Text style={styles.completionLabel}>You're all set!</Text>
        <Text style={styles.title}>Matched by our AI.{'\n'}Approved by your community.</Text>
        <Text style={styles.subtitle}>Here's how Bridge works for you:</Text>
      </Animated.View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(500 + i * 150).duration(400)}>
            <View style={styles.stepRow}>
              {/* Left column: icon circle + connector */}
              <View style={styles.leftCol}>
                <View style={[styles.iconCircle, { backgroundColor: step.bgColor }]}>
                  <EvaIcon name={step.icon} variant="outline" size={20} color={step.color} />
                </View>
                {i < STEPS.length - 1 && <View style={styles.connector} />}
              </View>

              {/* Right column: text */}
              <View style={[styles.rightCol, i < STEPS.length - 1 && styles.rightColSpaced]}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Callout */}
      <Animated.View entering={FadeInDown.delay(1000).duration(400)} style={styles.callout}>
        <View style={styles.calloutAccent} />
        <Text style={styles.calloutText}>
          No more scrolling. The only app where your people help you find your person.
        </Text>
      </Animated.View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  celebrationBadge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm shadow for depth
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    marginBottom: 28,
  },
  completionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.emerald,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    lineHeight: LINE_HEIGHTS.base,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
  },
  leftCol: {
    alignItems: 'center',
    width: 44,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: 6,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 14,
    paddingTop: 8,
  },
  rightColSpaced: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.heading,
    marginBottom: 4,
  },
  stepDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    lineHeight: LINE_HEIGHTS.sm,
  },
  callout: {
    marginTop: 28,
    backgroundColor: '#EEF3FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  calloutAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primaryButton,
    alignSelf: 'stretch',
  },
  calloutText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryButton,
    lineHeight: LINE_HEIGHTS.sm,
  },
});
