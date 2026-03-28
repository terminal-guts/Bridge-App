import React, { useState } from 'react';
import { Modal, View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H2, Body } from '../ui/Typography';
import { Button } from '../ui/Button';
import { EvaIcon } from '../icons';
import { lightHaptic } from '../../utils/haptics';

interface OnboardingVotingTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

const StyledView = styled(View);

const SLIDES = [
  {
    icon: 'people' as const,
    title: "You're the matchmaker.",
    body: "You don't swipe for yourself. You vote on whether two people from your campus would make a great couple.",
    cta: 'Next',
  },
  {
    icon: 'eye' as const,
    title: "Judge the pair.",
    body: "Browse their photos, answers, and shared interests.",
    cta: 'Next',
  },
  {
    icon: 'checkmark-circle-2' as const,
    title: "Your four votes.",
    body: "Yes · No · Recommend (to a friend) · Not Sure.\n\nAll votes are anonymous.",
    cta: 'Next',
  },
  {
    icon: 'heart' as const,
    title: "The community decides.",
    body: "Enough Yes votes? Both people get quietly notified and choose privately whether to connect.",
    cta: "Let's vote!",
  },
] as const;

const TOTAL = SLIDES.length;

export const OnboardingVotingTutorial: React.FC<OnboardingVotingTutorialProps> = ({
  visible,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const opacity = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const advanceTo = (next: number) => {
    if (next >= TOTAL) {
      onDismiss();
    } else {
      setCurrentSlide(next);
    }
  };

  const handleNext = () => {
    lightHaptic();
    const next = currentSlide + 1;
    opacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(advanceTo)(next);
      opacity.value = withTiming(1, { duration: 180 });
    });
  };

  const slide = SLIDES[currentSlide];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleNext}
    >
      <TouchableWithoutFeedback onPress={handleNext}>
        <View style={styles.overlay}>
          {/* Card — tapping it also advances via the outer TWF */}
          <Animated.View
            style={[
              styles.card,
              { paddingBottom: Math.max(insets.bottom + 16, 32) },
              contentStyle,
            ]}
          >
            {/* Progress dots */}
            <StyledView className="flex-row justify-center gap-2 mb-8">
              {SLIDES.map((_, i) => (
                <StyledView
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === currentSlide ? '#437FFF' : '#D1D5DB' },
                  ]}
                />
              ))}
            </StyledView>

            {/* Icon */}
            <StyledView className="items-center mb-6">
              <StyledView
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: '#EEF3FF' }}
              >
                <EvaIcon name={slide.icon} variant="outline" size={40} color="#437FFF" />
              </StyledView>
            </StyledView>

            {/* Title */}
            <H2 className="text-center font-bold text-neutral-900 mb-4 px-2">
              {slide.title}
            </H2>

            {/* Body */}
            <Body className="text-center text-neutral-600 leading-6 px-2 mb-8">
              {slide.body}
            </Body>

            {/* CTA button — inner Button handles own press; outer TWF handles backdrop */}
            <StyledView className="px-2">
              <Button
                onPress={handleNext}
                variant="primary"
                size="lg"
                fullWidth
              >
                {slide.cta}
              </Button>
            </StyledView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
