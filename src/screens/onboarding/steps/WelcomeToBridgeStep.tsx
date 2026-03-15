import React from 'react';
import { View, Image } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';

interface WelcomeToBridgeStepProps {
  onNext: () => void;
  onBack: () => void;
}

const StyledView = styled(View);
const StyledImage = styled(Image);

export const WelcomeToBridgeStep: React.FC<WelcomeToBridgeStepProps> = ({
  onNext,
  onBack,
}) => {
  return (
    <OnboardingLayout
      onContinue={onNext}
      onBack={onBack}
      continueLabel="Go to Bridge"
      hasTextInput={false}
    >
      <StyledView>
      {/* Header */}
      <StyledView className="items-center mb-6">
        <StyledImage
          source={require('../../../../assets/favicon.png')}
          style={{ width: 104, height: 104 }}
          resizeMode="contain"
        />
        <H1 className="text-center mt-1">Welcome to Bridge!</H1>
      </StyledView>

      {/* Feature 1: One Best Match */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="sun" variant="outline" size={24} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">One Best Match, Every Day</H3>
            <Body className="text-neutral-600 text-sm">
              One thoughtful pairing picked for you each evening.
            </Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Feature 2: Friends Vote */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="message-circle" variant="outline" size={24} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">Your Friends Weigh In</H3>
            <Body className="text-neutral-600 text-sm">
              Your community votes before a match is ever sent.
            </Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Feature 3: Low time */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="flash" variant="outline" size={24} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">Done in 5 Minutes</H3>
            <Body className="text-neutral-600 text-sm">
              No endless feed.
            </Body>
          </StyledView>
        </StyledView>
      </Card>
      </StyledView>
    </OnboardingLayout>
  );
};
