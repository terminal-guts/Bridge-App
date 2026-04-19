import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, TouchableWithoutFeedback, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H2, Body } from '../ui/Typography';
import { Button } from '../ui/Button';
import { EvaIcon } from '../icons';
import { lightHaptic } from '../../utils/haptics';
import { OVERLAYS } from '../../theme/shadows';
import { DURATIONS } from '../../constants/animations';

interface OnboardingVotingTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

const StyledView = styled(View);

const SLIDES = [
  {
    icon: 'people' as const,
    title: "No swiping here.",
    body: "Help others find their match.",
    cta: 'Next',
  },
  {
    icon: 'eye' as const,
    title: "Get to know the pair.",
    body: "Browse their photos and characteristics to see if they'd click.",
    cta: 'Next',
  },
  {
    icon: 'heart' as const,
    title: "Your votes matter.",
    body: "If the community approves a match,\nthey decide.\n\nIf not, it disappears.",
    cta: "Let's go!",
  },
] as const;

const TOTAL = SLIDES.length;

export const OnboardingVotingTutorial: React.FC<OnboardingVotingTutorialProps> = ({
  visible,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);
  // Ref so PanResponder (created once) always reads current index
  const currentSlideRef = useRef(0);
  const opacity = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Cancel fade animation on unmount to prevent runOnJS(updateSlide) firing into destroyed fiber
  useEffect(() => {
    return () => { cancelAnimation(opacity); };
  }, []);

  const updateSlide = (n: number) => {
    currentSlideRef.current = n;
    setCurrentSlide(n);
  };

  // navigateRef so PanResponder can call the latest version of navigate
  const navigateRef = useRef<(next: number) => void>(() => {});
  navigateRef.current = (next: number) => {
    if (next < 0) return;
    if (next >= TOTAL) { onDismiss(); return; }
    lightHaptic();
    if (reduceMotion) {
      updateSlide(next);
      opacity.value = 1;
      return;
    }
    opacity.value = withTiming(0, { duration: DURATIONS.micro }, () => {
      runOnJS(updateSlide)(next);
      opacity.value = withTiming(1, { duration: DURATIONS.micro });
    });
  };

  const handleNext = () => navigateRef.current(currentSlide + 1);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -50) navigateRef.current(currentSlideRef.current + 1);
        else if (dx > 50) navigateRef.current(currentSlideRef.current - 1);
      },
    })
  ).current;

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
            {...panResponder.panHandlers}
          >
            {/* Progress dots — tappable to jump to any slide */}
            <StyledView className="flex-row justify-center gap-2 mb-10">
              {SLIDES.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => navigateRef.current(i)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: i === currentSlide ? '#437FFF' : '#D1D5DB' },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </StyledView>

            {/* Icon */}
            <StyledView className="items-center mb-5">
              <StyledView
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: '#EEF3FF' }}
              >
                <EvaIcon name={slide.icon} variant="outline" size={40} color="#437FFF" />
              </StyledView>
            </StyledView>

            {/* Title */}
            <H2 className="text-center font-bold text-neutral-900 mb-3 px-4">
              {slide.title}
            </H2>

            {/* Body */}
            <Body className="text-center text-neutral-600 leading-6 px-4 mb-10">
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
    backgroundColor: OVERLAYS.heavy,
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
