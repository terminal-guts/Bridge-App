/**
 * GuideTarget Component
 *
 * Wrapper component that registers element positions for guide highlighting.
 * Wraps any component that should be targetable by a guide step.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, LayoutChangeEvent, ViewStyle, InteractionManager } from 'react-native';
import { useGuideContext } from '../../contexts/GuideContext';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('GuideTarget');

interface GuideTargetProps {
  /** Unique identifier for this target element */
  id: string;

  /** Child components to wrap */
  children: React.ReactNode;

  /** Disable target registration (useful for conditional rendering) */
  disabled?: boolean;

  /** Optional style for the wrapper View (use when children need specific layout behavior) */
  style?: ViewStyle;
}

export const GuideTarget: React.FC<GuideTargetProps> = ({ id, children, disabled = false, style }) => {
  const { registerTarget, unregisterTarget, isPlaying, currentStep } = useGuideContext();
  const viewRef = useRef<View>(null);

  /**
   * Measure element position relative to window
   */
  const measurePosition = useCallback(() => {
    if (disabled || !viewRef.current) {
      logger.info('[GuideTarget] Not measuring:', id, 'disabled:', disabled, 'hasRef:', !!viewRef.current);
      return;
    }

    viewRef.current.measureInWindow((x, y, width, height) => {
      // Only register if we got valid measurements
      if (width > 0 && height > 0) {
        registerTarget(id, { x, y, width, height });
      } else {
        logger.warn('[GuideTarget] Invalid measurements for:', id);
      }
    });
  }, [id, disabled, registerTarget]);

  /**
   * Handle layout changes
   */
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // Delay measurement slightly to ensure layout is finalized
      setTimeout(() => {
        measurePosition();
      }, 100);
    },
    [measurePosition]
  );

  /**
   * Unregister on unmount
   */
  useEffect(() => {
    return () => {
      unregisterTarget(id);
    };
  }, [id, unregisterTarget]);

  /**
   * Re-measure when disabled state changes
   */
  useEffect(() => {
    if (!disabled) {
      measurePosition();
    } else {
      unregisterTarget(id);
    }
  }, [disabled, id, measurePosition, unregisterTarget]);

  /**
   * Re-measure when guide step changes (ensures targets are fresh for spotlight)
   */
  useEffect(() => {
    if (isPlaying && !disabled) {
      InteractionManager.runAfterInteractions(() => {
        measurePosition();
      });
    }
  }, [isPlaying, currentStep, disabled, measurePosition]);

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      collapsable={false}
      pointerEvents="box-none"
      style={style}
    >
      {children}
    </View>
  );
};
