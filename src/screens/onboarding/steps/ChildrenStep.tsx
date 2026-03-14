import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

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
  { value: 'want_children', label: 'Want Children' },
  { value: 'dont_want_children', label: "Don't Want Children" },
  { value: 'not_sure', label: 'Not Sure Yet' },
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

    // Validate children status
    if (!childrenStatus) {
      newErrors.children = 'Please select an option';
    } else if (!CHILDREN_STATUS_OPTIONS.some(opt => opt.value === childrenStatus)) {
      newErrors.children = 'Invalid option selected';
    }

    // Validate family plans
    if (!familyPlans) {
      newErrors.plans = 'Please select an option';
    } else if (!FAMILY_PLANS_OPTIONS.some(opt => opt.value === familyPlans)) {
      newErrors.plans = 'Invalid option selected';
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
      className={`px-4 py-2.5 rounded-lg border mb-2.5 ${
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
      <StyledView className="mt-6">
        <H1 className="mb-2">What are your family plans?</H1>
        <Body className="text-neutral-600 mb-6">Tell us about your family goals.</Body>

        {/* Do you have children? */}
        <Card className="mb-4 p-4">
          <H3 className="mb-2.5">Do you have children?</H3>
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
        <Card className="mb-4 p-4">
          <H3 className="mb-2.5">Family Plans</H3>
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
