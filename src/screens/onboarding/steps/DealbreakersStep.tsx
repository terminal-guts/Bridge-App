import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body, Card } from '../../../components/ui';
import { OnboardingData, Dealbreaker } from '../../../types';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface DealbreakersStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);

const DEALBREAKER_OPTIONS = [
  { id: 'smoking', label: 'Smoking', icon: '🚬' },
  { id: 'heavy_drinking', label: 'Heavy Drinking', icon: '🍺' },
  { id: 'drugs', label: 'Drug Use', icon: '💊' },
  { id: 'no_children', label: "Doesn't Want Children", icon: '👶' },
  { id: 'has_children', label: 'Already Has Children', icon: '👨‍👩‍👦' },
  { id: 'different_religion', label: 'Different Religion', icon: '🙏' },
  { id: 'different_politics', label: 'Opposing Politics', icon: '🗳️' },
  { id: 'no_ambition', label: 'Lack of Ambition', icon: '📉' },
  { id: 'poor_hygiene', label: 'Poor Hygiene', icon: '🧼' },
  { id: 'rudeness', label: 'Rudeness/Disrespect', icon: '😤' },
  { id: 'dishonesty', label: 'Dishonesty', icon: '🤥' },
];

export const DealbreakersStep: React.FC<DealbreakersStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedDealbreakers, setSelectedDealbreakers] = useState<Dealbreaker[]>(
    data.dealbreakers || []
  );

  const toggleDealbreaker = (dealbreakerId: string) => {
    const exists = selectedDealbreakers.find(d => d.type === dealbreakerId);

    if (exists) {
      setSelectedDealbreakers(
        selectedDealbreakers.filter(d => d.type !== dealbreakerId)
      );
    } else {
      const newDealbreaker: Dealbreaker = {
        id: `db_${Date.now()}`,
        type: dealbreakerId,
        value: true,
      };
      setSelectedDealbreakers([...selectedDealbreakers, newDealbreaker]);
    }
  };

  const validateAndContinue = () => {
    updateData({ dealbreakers: selectedDealbreakers });
    onNext();
  };

  const isSelected = (dealbreakerId: string) => {
    return selectedDealbreakers.some(d => d.type === dealbreakerId);
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Dealbreakers</H1>
        <Body className="text-neutral-600 mb-8">
          Select things that are absolute no-gos for you.
        </Body>

        {/* Dealbreakers List */}
        <StyledView>
          {DEALBREAKER_OPTIONS.map(option => (
            <Card
              key={option.id}
              onPress={() => toggleDealbreaker(option.id)}
              className={`mb-2 ${
                isSelected(option.id)
                  ? 'border border-error bg-error/5'
                  : ''
              }`}
            >
              <StyledView className="flex-row items-center justify-between">
                <StyledView className="flex-row items-center flex-1">
                  <Body className="text-2xl mr-3">{option.icon}</Body>
                  <Body
                    className={`flex-1 ${
                      isSelected(option.id)
                        ? 'text-neutral-900 font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </Body>
                </StyledView>
                <StyledView
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected(option.id)
                      ? 'bg-error border-error'
                      : 'border-neutral-300'
                  }`}
                >
                  {isSelected(option.id) && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledView>
            </Card>
          ))}
        </StyledView>

        <Body className="text-neutral-500 text-sm mt-4">
          {selectedDealbreakers.length} dealbreakers selected
        </Body>
      </StyledView>
    </OnboardingLayout>
  );
};