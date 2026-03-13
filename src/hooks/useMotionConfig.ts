/**
 * Motion Configuration Hook
 *
 * Wraps Reanimated's useReducedMotion() and provides helpers
 * to gracefully degrade animations when the user has enabled
 * "Reduce Motion" in system accessibility settings.
 */

import { useReducedMotion } from 'react-native-reanimated';
import type { WithTimingConfig, WithSpringConfig } from 'react-native-reanimated';

/**
 * Returns reduced-motion-aware animation configs.
 *
 * - `reducedMotion`: boolean — true when iOS "Reduce Motion" or Android
 *   "Animator duration scale 0x" is active.
 * - `getTimingConfig(config)`: returns config as-is, or `{ duration: 0 }` when reduced.
 * - `getSpringConfig(config)`: returns config as-is, or instant (stiff) spring when reduced.
 */
export function useMotionConfig() {
  const reducedMotion = useReducedMotion();

  const getTimingConfig = (config: WithTimingConfig): WithTimingConfig => {
    if (reducedMotion) return { duration: 0 };
    return config;
  };

  const getSpringConfig = (config: WithSpringConfig): WithSpringConfig => {
    if (reducedMotion) return { duration: 0 };
    return config;
  };

  return { reducedMotion, getTimingConfig, getSpringConfig };
}
