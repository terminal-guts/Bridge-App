import React, { useState } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import Slider from '@react-native-community/slider';

interface DatingDistanceStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

const MIN_DISTANCE = 1;
const MAX_DISTANCE = 200;

export const DatingDistanceStep: React.FC<DatingDistanceStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  // Initialize: if maxDistance is null (don't care), set slider to 200, otherwise use the value
  const initialDistance = data.preferences?.maxDistance === null
    ? MAX_DISTANCE
    : data.preferences?.maxDistance ?? 50;

  const [distance, setDistance] = useState<number>(initialDistance);

  const validateAndContinue = () => {
    updateData({
      preferences: {
        ageMin: data.preferences?.ageMin ?? 18,
        ageMax: data.preferences?.ageMax ?? 99,
        gender: data.preferences?.gender ?? 'both',
        lookingFor: data.preferences?.lookingFor ?? 'relationship',
        ...data.preferences,
        // If distance is 200, save as null (don't care), otherwise save the value
        maxDistance: distance === MAX_DISTANCE ? null : distance,
      },
    });
    onNext();
  };

  const getDisplayText = () => {
    if (distance === MAX_DISTANCE) {
      return "Distance doesn't matter";
    }
    return `${distance} miles`;
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Dating Distance</H1>
        <Body className="text-neutral-600 mb-8">
          How far would you be willing to date?
        </Body>

        <StyledView style={{ flex: 1, justifyContent: 'center' }}>
          {/* Distance Preference */}
          <Card className="mb-6 p-6">
            <H3 className="mb-4 text-center">Maximum distance</H3>
            <Body className="text-center text-3xl font-semibold text-primary-500 mb-6">
              {getDisplayText()}
            </Body>
            <StyledView className="px-4">
              <Slider
                value={distance}
                onValueChange={setDistance}
                minimumValue={MIN_DISTANCE}
                maximumValue={MAX_DISTANCE}
                step={1}
                minimumTrackTintColor="#7C3AED"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#7C3AED"
              />
              <StyledView className="flex-row justify-between mt-2">
                <Body className="text-xs text-neutral-500">1 mi</Body>
                <Body className="text-xs text-neutral-500">No limit</Body>
              </StyledView>
            </StyledView>
          </Card>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
