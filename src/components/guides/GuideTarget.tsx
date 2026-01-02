/**
 * GuideTarget Component
 *
 * Wrapper component that registers element positions for guide highlighting.
 * Wraps any component that should be targetable by a guide step.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, LayoutChangeEvent, ViewStyle } from 'react-native';
import { useGuideContext } from '../../contexts/GuideContext';

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
  const { registerTarget, unregisterTarget } = useGuideContext();
  const viewRef = useRef<View>(null);

  /**
   * Measure element position relative to window
   */
  const measurePosition = useCallback(() => {
    if (disabled || !viewRef.current) {
      console.log('[GuideTarget] Not measuring:', id, 'disabled:', disabled, 'hasRef:', !!viewRef.current);
      return;
    }

    viewRef.current.measureInWindow((x, y, width, height) => {
      console.log('[GuideTarget] Measured:', id, { x, y, width, height });
      // Only register if we got valid measurements
      if (width > 0 && height > 0) {
        registerTarget(id, { x, y, width, height });
        console.log('[GuideTarget] Registered:', id);
      } else {
        console.log('[GuideTarget] Invalid measurements for:', id);
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
