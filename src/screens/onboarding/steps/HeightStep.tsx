import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { COLORS } from '../../../theme/colors';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import Slider from '@react-native-community/slider';
import RangeSlider from 'rn-range-slider';

interface HeightStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

// Height in inches (4'0" = 48" to 7'0" = 84")
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 84;

const inchesToFeetInches = (inches: number): string => {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
};

export const HeightStep: React.FC<HeightStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  // Parse existing height or use minimum (no default assumption)
  const parseHeight = (heightStr?: string): number => {
    if (!heightStr) return MIN_HEIGHT; // Start at minimum if no data

    // Try parsing as inches first (e.g., "68")
    const inchesValue = parseInt(heightStr, 10);
    if (!isNaN(inchesValue) && inchesValue >= MIN_HEIGHT && inchesValue <= MAX_HEIGHT) {
      return inchesValue;
    }

    // Fall back to parsing formatted string (e.g., "5'8"")
    const match = heightStr.match(/(\d+)'(\d+)"/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseInt(match[2], 10);
      return feet * 12 + inches;
    }

    return MIN_HEIGHT;
  };

  const [myHeight, setMyHeight] = useState<number>(
    data.height ? parseHeight(data.height) : MIN_HEIGHT // No default - start at minimum
  );
  const [minHeight, setMinHeight] = useState<number>(
    data.preferences?.heightMin || MIN_HEIGHT
  );
  const [maxHeight, setMaxHeight] = useState<number>(
    data.preferences?.heightMax || MAX_HEIGHT
  );

  const validateAndContinue = () => {
    // Save height as inches string to match ProfileEditScreen format
    updateData({
      height: myHeight.toString(),
      preferences: {
        ageMin: data.preferences?.ageMin ?? 18,
        ageMax: data.preferences?.ageMax ?? 99,
        gender: data.preferences?.gender ?? 'both',
        lookingFor: data.preferences?.lookingFor ?? 'relationship',
        ...data.preferences,
        heightMin: minHeight,
        heightMax: maxHeight,
      },
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
      <H1 className="mb-3">Height Preferences</H1>
      <Body className="text-neutral-600 mb-8">
        Share your height and preferred height range.
      </Body>

      {/* My Height */}
      <Card className="mb-6 p-6">
        <H3 className="mb-4 text-center">My height</H3>
        <Body className="text-center text-3xl font-semibold text-primary-500 mb-6">
          {inchesToFeetInches(myHeight)}
        </Body>
        <StyledView className="px-4">
          <Slider
            value={myHeight}
            onValueChange={setMyHeight}
            minimumValue={MIN_HEIGHT}
            maximumValue={MAX_HEIGHT}
            step={1}
            minimumTrackTintColor="#7C3AED"
            maximumTrackTintColor={COLORS.backgroundGrayMedium}
            thumbTintColor="#7C3AED"
          />
          <StyledView className="flex-row justify-between mt-2">
            <Body className="text-xs text-neutral-500">4'0"</Body>
            <Body className="text-xs text-neutral-500">7'0"</Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Preferred Height Range */}
      <Card className="mb-5 p-5">
        <H3 className="mb-3">Preferred height range</H3>
        <Body className="text-neutral-600 text-sm mb-6">
          {inchesToFeetInches(minHeight)} - {inchesToFeetInches(maxHeight)}
        </Body>

        <StyledView className="px-2">
          <RangeSlider
            style={{ width: '100%', height: 40 }}
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
            step={1}
            low={minHeight}
            high={maxHeight}
            floatingLabel={false}
            renderThumb={() => (
              <StyledView
                className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: '#7C3AED' }}
              />
            )}
            renderRail={() => (
              <StyledView className="flex-1 h-1 rounded-full bg-neutral-200" />
            )}
            renderRailSelected={() => (
              <StyledView
                className="h-1 rounded-full"
                style={{ backgroundColor: '#7C3AED' }}
              />
            )}
            onValueChanged={(low, high) => {
              setMinHeight(low);
              setMaxHeight(high);
            }}
          />
        </StyledView>

        <Body className="text-neutral-500 text-xs mt-4">
          Drag the handles to set your preferred height range.
        </Body>
      </Card>
      </StyledView>
    </OnboardingLayout>
  );
};
