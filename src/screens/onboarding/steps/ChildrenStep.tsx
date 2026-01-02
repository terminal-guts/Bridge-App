import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

interface ChildrenStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

const CHILDREN_STATUS_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const FAMILY_PLANS_OPTIONS = [
  { value: 'want_children', label: 'Want children' },
  { value: 'dont_want_children', label: "Don't want children" },
  { value: 'not_sure', label: 'Not sure yet' },
];

export const ChildrenStep: React.FC<ChildrenStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [childrenStatus, setChildrenStatus] = useState<string>(
    data.hasChildren || ''
  );
  const [familyPlans, setFamilyPlans] = useState<string>(
    data.familyPlans || ''
  );
  const [errors, setErrors] = useState<{ children?: string; plans?: string }>({});

  const validateAndContinue = () => {
    const newErrors: { children?: string; plans?: string } = {};

    if (!childrenStatus) {
      newErrors.children = 'Please select an option';
    }

    if (!familyPlans) {
      newErrors.plans = 'Please select an option';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateData({
      hasChildren: childrenStatus,
      familyPlans: familyPlans,
    });
    onNext();
  };

  const OptionButton = ({
    label,
    selected,
    onPress
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <StyledTouchableOpacity
      onPress={onPress}
      className={`px-4 py-3 rounded-lg border mb-3 ${
        selected
          ? 'bg-primary-500 border-primary-500'
          : 'bg-white border-neutral-300'
      }`}
    >
      <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
        {label}
      </Body>
    </StyledTouchableOpacity>
  );

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      onSkip={onNext}
      hasTextInput={false}
    >
      <StyledView className="mt-8">
        <H1 className="mb-3">Family & Children</H1>
        <Body className="text-neutral-600 mb-8">
          Help us understand your current family status and future plans.
        </Body>

        {/* Do you have children? */}
        <Card className="mb-5 p-5">
          <H3 className="mb-3">Do you have children?</H3>
          <StyledView>
            {CHILDREN_STATUS_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                selected={childrenStatus === option.value}
                onPress={() => {
                  setChildrenStatus(option.value);
                  setErrors({ ...errors, children: undefined });
                }}
              />
            ))}
          </StyledView>
          {errors.children && (
            <Body className="text-error text-sm mt-2">{errors.children}</Body>
          )}
        </Card>

        {/* Family Plans */}
        <Card className="mb-5 p-5">
          <H3 className="mb-3">Family Plans</H3>
          <Body className="text-neutral-600 text-sm mb-3">
            Are you open to having children in the future?
          </Body>
          <StyledView>
            {FAMILY_PLANS_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                selected={familyPlans === option.value}
                onPress={() => {
                  setFamilyPlans(option.value);
                  setErrors({ ...errors, plans: undefined });
                }}
              />
            ))}
          </StyledView>
          {errors.plans && (
            <Body className="text-error text-sm mt-2">{errors.plans}</Body>
          )}
        </Card>
      </StyledView>
    </OnboardingLayout>
  );
};
