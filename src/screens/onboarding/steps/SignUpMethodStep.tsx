import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';

interface SignUpMethodStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const SignUpMethodStep: React.FC<SignUpMethodStepProps> = ({
  updateData,
  onNext,
}) => {
  const handleSelect = (method: 'phone' | 'email') => {
    updateData({ signupMethod: method });
    onNext();
  };

  return (
    <OnboardingLayout
      showBackButton={false}
      hasTextInput={false}
      hideContinueButton={true}
    >
      <H1 className="mb-3">Create your account</H1>
      <Body className="text-neutral-600 mb-10">
        How would you like to sign up?
      </Body>

      <StyledView className="gap-4">
        <StyledTouchableOpacity
          onPress={() => handleSelect('phone')}
          className="flex-row items-center bg-white border-2 border-neutral-200 rounded-2xl p-5 active:border-primary-500"
          activeOpacity={0.7}
        >
          <StyledView className="w-12 h-12 bg-primary-50 rounded-full items-center justify-center mr-4">
            <EvaIcon name="phone-call" variant="outline" size={24} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <Body className="text-neutral-900 font-semibold text-base">Phone Number</Body>
            <Body className="text-neutral-500 text-sm mt-0.5">Sign up with your phone number</Body>
          </StyledView>
          <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color={COLORS.text.disabled} />
        </StyledTouchableOpacity>

        <StyledTouchableOpacity
          onPress={() => handleSelect('email')}
          className="flex-row items-center bg-white border-2 border-neutral-200 rounded-2xl p-5 active:border-primary-500"
          activeOpacity={0.7}
        >
          <StyledView className="w-12 h-12 bg-primary-50 rounded-full items-center justify-center mr-4">
            <EvaIcon name="email" variant="outline" size={24} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <Body className="text-neutral-900 font-semibold text-base">Rice Email</Body>
            <Body className="text-neutral-500 text-sm mt-0.5">Sign up with your @rice.edu email</Body>
          </StyledView>
          <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color={COLORS.text.disabled} />
        </StyledTouchableOpacity>
      </StyledView>
    </OnboardingLayout>
  );
};
