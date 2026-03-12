import React from 'react';
import { View, Image } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card } from '../../../components/ui';
import { EvaIcon  } from '../../../components/icons';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface WelcomeToBridgeStepProps {
  onNext: () => void;
}

const StyledView = styled(View);
const StyledImage = styled(Image);

export const WelcomeToBridgeStep: React.FC<WelcomeToBridgeStepProps> = ({
  onNext,
}) => {
  return (
    <OnboardingLayout
      onContinue={onNext}
      continueLabel="Go to Bridge"
      showBackButton={false}
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

      {/* Feature 1: Community Matching */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="people" size={24} color="#7C3AED" variant="fill" />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">Smarter Matches, Powered By Community</H3>
            <Body className="text-neutral-600 text-sm">
              Daily matchmaking grids fuel Bridge's algorithm with real human insight.
            </Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Feature 2: Friend Network */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="link" size={24} color="#7C3AED" variant="outline" />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">Your People Help You Find Your Person</H3>
            <Body className="text-neutral-600 text-sm">
              Nominate matches for friends, endorse their profile, and celebrate their wins.
            </Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Feature 3: 5 minutes a day */}
      <Card className="mb-5 p-5">
        <StyledView className="flex-row items-start mb-2">
          <StyledView className="bg-primary-100 p-2 rounded-full mr-3">
            <EvaIcon name="trending-up" size={24} color="#7C3AED" variant="outline" />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="mb-2">5 minutes a day</H3>
            <Body className="text-neutral-600 text-sm">
              No more endless swiping!
            </Body>
          </StyledView>
        </StyledView>
      </Card>
      </StyledView>
    </OnboardingLayout>
  );
};
