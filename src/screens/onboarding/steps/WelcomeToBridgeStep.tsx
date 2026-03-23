import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';

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
    title: 'If it passed, it\'s yours to decide.',
    description: 'Every match you see has already been vetted.',
  },
];

export const WelcomeToBridgeStep: React.FC<WelcomeToBridgeStepProps> = ({
  onNext,
  onBack,
}) => {
  return (
    <OnboardingLayout
      onContinue={onNext}
      onBack={onBack}
      continueLabel="Let's go"
      hasTextInput={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Matched by our AI.{'\n'}Approved by your community.</Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
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
        ))}
      </View>

      {/* Callout */}
      <View style={styles.callout}>
        <View style={styles.calloutAccent} />
        <Text style={styles.calloutText}>
          No more scrolling. The only app where your people help you find your person.
        </Text>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 28,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text.heading,
    marginBottom: 6,
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
