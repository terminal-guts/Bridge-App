/**
 * GuideOverlay Component
 *
 * Main overlay component that renders the spotlight, tooltip, and progress indicator.
 * Renders as a Modal above all content when a guide is active.
 */

import React, { useMemo } from 'react';
import { Modal, View, TouchableWithoutFeedback, StatusBar, Dimensions } from 'react-native';
import { useGuideContext } from '../../contexts/GuideContext';
import { Spotlight } from './Spotlight';
import { Tooltip } from './Tooltip';
import { ProgressIndicator } from './ProgressIndicator';
import { SpotlightDimensions } from '../../types/guides';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const GuideOverlay: React.FC = () => {
  const {
    activeGuide,
    currentStep,
    isPlaying,
    targetLayouts,
    nextStep,
    previousStep,
    skipGuide,
  } = useGuideContext();

  /**
   * Get current step configuration
   */
  const step = useMemo(() => {
    if (!activeGuide || !activeGuide.steps[currentStep]) return null;
    return activeGuide.steps[currentStep];
  }, [activeGuide, currentStep]);

  /**
   * Get target element layout
   */
  const targetLayout = useMemo(() => {
    if (!step?.targetElement) {
      console.log('[GuideOverlay] No targetElement for step:', step?.id);
      return null;
    }
    const layout = targetLayouts.get(step.targetElement) || null;
    console.log('[GuideOverlay] Target layout for', step.targetElement, ':', layout);
    console.log('[GuideOverlay] All registered targets:', Array.from(targetLayouts.keys()));
    return layout;
  }, [step, targetLayouts]);

  /**
   * Calculate spotlight dimensions
   */
  const spotlightDimensions = useMemo((): SpotlightDimensions | null => {
    if (step?.highlightType === 'none') {
      console.log('[GuideOverlay] No spotlight - highlightType:', step?.highlightType);
      return null;
    }

    // Check for custom spotlight region first
    if (step?.customSpotlightRegion) {
      const region = step.customSpotlightRegion;

      // Helper to parse string or number values
      const parseValue = (value: number | string | undefined, screenDimension: number): number => {
        if (value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value.endsWith('%')) {
          const percentage = parseFloat(value) / 100;
          return screenDimension * percentage;
        }
        return parseFloat(value) || 0;
      };

      const x = parseValue(region.left, SCREEN_WIDTH);
      const y = parseValue(region.top, SCREEN_HEIGHT);
      const width = region.width ? parseValue(region.width, SCREEN_WIDTH) : SCREEN_WIDTH - x;
      const height = region.height ? parseValue(region.height, SCREEN_HEIGHT) : SCREEN_HEIGHT - y;

      const dimensions = {
        x,
        y,
        width,
        height,
        borderRadius: region.borderRadius || 12,
      };

      console.log('[GuideOverlay] Custom spotlight dimensions:', dimensions);
      return dimensions;
    }

    // Fall back to target element layout
    if (!targetLayout) {
      console.log('[GuideOverlay] No spotlight - no targetLayout or customSpotlightRegion');
      return null;
    }

    const padding = step?.spotlightPadding || 12;
    const shape = step?.spotlightShape || 'rounded-rect';

    const spotlightWidth = targetLayout.width + padding * 2;
    const spotlightHeight = targetLayout.height + padding * 2;

    const dimensions = {
      x: targetLayout.x - padding,
      y: targetLayout.y - padding,
      width: spotlightWidth,
      height: spotlightHeight,
      borderRadius:
        shape === 'circle'
          ? spotlightWidth / 2 // Circular
          : 12, // Rounded rectangle
    };

    console.log('[GuideOverlay] Spotlight dimensions calculated:', dimensions);
    return dimensions;
  }, [targetLayout, step]);

  // Don't render if no active guide
  if (!isPlaying || !activeGuide || !step) {
    return null;
  }

  return (
    <Modal visible={isPlaying} transparent animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" />

      {/* Full-screen container - tap to skip */}
      <TouchableWithoutFeedback onPress={nextStep}>
        <View style={{ flex: 1 }} pointerEvents="box-none">
          {/* Spotlight overlay (if highlighting an element) */}
          {spotlightDimensions && step.highlightType === 'spotlight' && (
            <Spotlight dimensions={spotlightDimensions} shape={step.spotlightShape || 'rounded-rect'} />
          )}

          {/* Dark overlay for modal-style steps (no highlight) */}
          {(!spotlightDimensions || step.highlightType === 'none') && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)', // 55% for better visibility
              }}
              pointerEvents="none"
            />
          )}

        {/* Tooltip */}
        <Tooltip
          title={step.title}
          message={step.message}
          primaryButtonText={step.primaryButtonText}
          secondaryButtonText={step.secondaryButtonText}
          onPrimary={step.onPrimary || nextStep}
          onSecondary={step.onSecondary}
          targetDimensions={
            step.customSpotlightRegion && spotlightDimensions
              ? spotlightDimensions
              : targetLayout || undefined
          }
          preferredPosition={step.tooltipPosition}
        />

        {/* Progress indicator */}
        <ProgressIndicator
          current={currentStep}
          total={activeGuide.steps.length}
          onSkip={skipGuide}
          onBack={currentStep > 0 ? previousStep : undefined}
        />
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
