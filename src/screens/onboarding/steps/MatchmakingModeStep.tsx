import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { DURATIONS } from '../../../constants/animations';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H1, Body, H3, AnimatedPressable } from '../../../components/ui';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../../components/icons';
import { InfoModal, InfoSection } from '../../../components/ui/InfoModal';

interface MatchmakingModeStepProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

type Role = 'dater' | 'matchmaker';

export const MatchmakingModeStep: React.FC<MatchmakingModeStepProps> = ({
  data,
  updateData,
  onNext,
}) => {
  // Use existing role if it exists, otherwise default to dater
  const [selectedRole, setSelectedRole] = useState<Role>(data.role || 'dater');
  const [showMatchmakerInfo, setShowMatchmakerInfo] = useState(false);

  const handleContinue = () => {
    updateData({ role: selectedRole });
    onNext();
  };

  const renderOption = (
    role: Role,
    icon: string,
    title: string,
    description: string,
    delayMs: number,
    onPressExtra?: () => void
  ) => {
    const isSelected = selectedRole === role;
    return (
      <Animated.View entering={FadeInUp.duration(DURATIONS.normal).delay(delayMs)}>
        <StyledTouchableOpacity
          onPress={() => {
            setSelectedRole(role);
            if (onPressExtra) onPressExtra();
          }}
          className={`rounded-2xl p-5 mb-4 border-2 ${
            isSelected
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 bg-white'
          }`}
          activeOpacity={0.8}
        >
          <StyledView className="flex-row items-start">
            <StyledView
              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                isSelected ? 'bg-primary-500' : 'bg-neutral-100'
              }`}
            >
              <EvaIcon
                name={icon}
                variant="outline"
                size={24}
                color={isSelected ? COLORS.card : COLORS.text.label}
              />
            </StyledView>
            <StyledView className="flex-1 mt-1">
              <H3 className={isSelected ? 'text-primary-700' : 'text-neutral-900'}>
                {title}
              </H3>
              <Body className="text-neutral-500 text-sm mt-1">
                {description}
              </Body>
            </StyledView>
            <StyledView className="mt-2">
              <EvaIcon
                name={isSelected ? 'checkmark-circle-2' : 'radio-button-off'}
                variant={isSelected ? 'fill' : 'outline'}
                size={24}
                color={isSelected ? COLORS.primaryAccent : COLORS.borderDivider}
              />
            </StyledView>
          </StyledView>
        </StyledTouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1 bg-neutral-50">
      <StyledView className="flex-1 px-6 justify-between">
        {/* Header */}
        <StyledView className="flex-1 justify-center">
          <Animated.View entering={FadeInUp.duration(DURATIONS.slow)}>
            <StyledView className="items-center mb-6">
              <StyledImage
                source={require('../../../../assets/favicon.png')}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            </StyledView>
            <H1 className="text-center mb-10">How do you want to use Bridge?</H1>
          </Animated.View>

          {renderOption(
            'dater',
            'person',
            'Find my person',
            'Build your profile and start matching.',
            300
          )}

          {renderOption(
            'matchmaker',
            'people',
            'Be a matchmaker',
            "Set up your friends. You won't appear in anyone's stack.",
            450,
            () => setShowMatchmakerInfo(true)
          )}
        </StyledView>

        {/* Continue Button */}
        <Animated.View
          entering={FadeIn.duration(DURATIONS.normal).delay(600)}
          style={{ paddingBottom: 24 }}
        >
          <AnimatedPressable
            onPress={handleContinue}
            scale="standard"
            className="bg-primary-500 rounded-full py-4 px-8 items-center"
          >
            <Body className="text-white text-center text-lg font-semibold">
              Continue
            </Body>
          </AnimatedPressable>
        </Animated.View>
      </StyledView>

      {/* Matchmaker Info Explainer Bottom Sheet */}
      <InfoModal
        visible={showMatchmakerInfo}
        onClose={() => setShowMatchmakerInfo(false)}
        title="Be a Matchmaker"
        icon="people"
      >
        <InfoSection>
          As a matchmaker, you'll build profiles for your friends and browse candidates on their behalf. You can suggest introductions and track how they go. You won't have a dating profile yourself.
        </InfoSection>
        <StyledView className="mt-4">
          <AnimatedPressable
            onPress={() => setShowMatchmakerInfo(false)}
            scale="standard"
            className="bg-primary-500 rounded-full py-4 px-8 items-center"
          >
            <Body className="text-white text-center font-semibold">
              Got it, let's go
            </Body>
          </AnimatedPressable>
        </StyledView>
      </InfoModal>
    </StyledSafeAreaView>
  );
};
