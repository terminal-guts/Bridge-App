/**
 * Screen Transition Configurations
 *
 * Custom React Navigation screen transitions using Reanimated-backed
 * CardStyleInterpolators. These replace the default iOS slide with
 * smoother, more intentional motion.
 */

import { StackCardInterpolationProps, TransitionPresets } from '@react-navigation/stack';
import { DURATIONS, EASINGS } from '../constants/animations';

/**
 * Horizontal slide with subtle fade — the primary push/pop transition.
 * Faster and tighter than the default iOS slide.
 */
export const slideWithFade = {
  gestureDirection: 'horizontal' as const,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: DURATIONS.normal,
        easing: EASINGS.enter,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: DURATIONS.normal,
        easing: EASINGS.exit,
      },
    },
  },
  cardStyleInterpolator: ({ current, next, layouts }: StackCardInterpolationProps) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
    });

    // The screen underneath slides slightly left and dims
    const overlayOpacity = next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.08],
        })
      : 0;

    const behindTranslateX = next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -layouts.screen.width * 0.3],
        })
      : 0;

    return {
      cardStyle: {
        transform: [{ translateX }],
        opacity,
      },
      overlayStyle: {
        opacity: overlayOpacity,
        backgroundColor: '#000',
      },
    };
  },
};

/**
 * Modal slide-up — for screens that conceptually sit above the main flow.
 * Used for Chat, ProfileMatch, etc.
 */
export const modalSlideUp = {
  gestureDirection: 'vertical' as const,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: {
        damping: 22,
        stiffness: 200,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: DURATIONS.normal,
        easing: EASINGS.exit,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
    });

    return {
      cardStyle: {
        transform: [{ translateY }],
      },
    };
  },
};

/**
 * Fade transition — for conceptual state changes (not spatial navigation).
 * Used for auth flow transitions.
 */
export const fadeTransition = {
  gestureDirection: 'horizontal' as const,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: DURATIONS.normal,
        easing: EASINGS.enter,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: DURATIONS.micro,
        easing: EASINGS.exit,
      },
    },
  },
  cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return {
      cardStyle: {
        opacity,
      },
    };
  },
};
