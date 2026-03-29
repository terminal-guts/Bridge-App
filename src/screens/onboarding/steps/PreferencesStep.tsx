import React, { useEffect, useRef } from 'react';
import { OnboardingData } from '../../../types';

interface PreferencesStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

/**
 * PreferencesStep — auto-selects "relationship" (the only commitment level)
 * and immediately advances. Bridge is relationship-only, so no user choice needed.
 */
export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  data,
  updateData,
  onNext,
}) => {
  const hasAdvanced = useRef(false);

  useEffect(() => {
    if (hasAdvanced.current) return;
    hasAdvanced.current = true;

    updateData({
      preferences: {
        ageMin: data.preferences?.ageMin ?? 18,
        ageMax: data.preferences?.ageMax ?? 99,
        gender: data.preferences?.gender ?? 'both',
        ...data.preferences,
        lookingFor: 'relationship' as any,
      },
    });
    onNext();
  }, []);

  // Nothing to render — step auto-advances
  return null;
};
