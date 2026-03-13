/**
 * useHapticFeedback Hook
 *
 * Convenience hook that pairs haptic feedback with a visual trigger.
 * Calling `trigger()` fires the haptic and sets `isActive` to true
 * for a configurable duration, making it easy to synchronize haptic
 * with visual feedback (glow, scale, etc.).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  lightHaptic,
  mediumHaptic,
  heavyHaptic,
  successHaptic,
  warningHaptic,
  errorHaptic,
  selectionHaptic,
} from '../utils/haptics';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const HAPTIC_MAP: Record<HapticType, () => Promise<void>> = {
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,
  success: successHaptic,
  warning: warningHaptic,
  error: errorHaptic,
  selection: selectionHaptic,
};

interface UseHapticFeedbackOptions {
  activeDuration?: number;
  cooldown?: number;
}

export function useHapticFeedback(
  type: HapticType,
  options: UseHapticFeedbackOptions = {},
) {
  const { activeDuration = 300, cooldown = 0 } = options;
  const [isActive, setIsActive] = useState(false);
  const lastTriggerRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback(() => {
    const now = Date.now();
    if (cooldown > 0 && now - lastTriggerRef.current < cooldown) return;
    lastTriggerRef.current = now;

    HAPTIC_MAP[type]().catch(() => {});
    setIsActive(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, activeDuration);
  }, [type, activeDuration, cooldown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { trigger, isActive };
}
