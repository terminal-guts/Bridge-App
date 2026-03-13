import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Image } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H1, Body, H3, AnimatedPressable } from '../../../components/ui';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../../components/icons';

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

type Mode = 'full' | 'match_others_only';

export const MatchmakingModeStep: React.FC<MatchmakingModeStepProps> = ({
  updateData,
  onNext,
}) => {
  const [selectedMode, setSelectedMode] = useState<Mode>('full');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(150, [
        Animated.timing(card1Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card2Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    // matchmakingOnly = true means "match others only" (NOT in the pool to be matched themselves)
    updateData({ matchmakingOnly: selectedMode === 'match_others_only' });
    onNext();
  };

  const renderOption = (
    mode: Mode,
    icon: string,
    title: string,
    description: string,
    animValue: Animated.Value,
  ) => {
    const isSelected = selectedMode === mode;
    return (
      <Animated.View style={{ opacity: animValue }}>
        <StyledTouchableOpacity
          onPress={() => setSelectedMode(mode)}
          className={`rounded-2xl p-5 mb-4 border-2 ${
            isSelected
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 bg-white'
          }`}
          activeOpacity={0.8}
        >
          <StyledView className="flex-row items-start">
            <StyledView
              className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                isSelected ? 'bg-primary-500' : 'bg-neutral-100'
              }`}
            >
              <EvaIcon
                name={icon}
                variant="outline"
                size={20}
                color={isSelected ? '#FFFFFF' : COLORS.text.label}
              />
            </StyledView>
            <StyledView className="flex-1">
              <H3 className={isSelected ? 'text-primary-700' : 'text-neutral-900'}>
                {title}
              </H3>
              <Body className="text-neutral-500 text-sm mt-1">
                {description}
              </Body>
            </StyledView>
            <StyledView className="mt-1">
              <EvaIcon
                name={isSelected ? 'checkmark-circle-2' : 'radio-button-off'}
                variant={isSelected ? 'fill' : 'outline'}
                size={24}
                color={isSelected ? COLORS.primaryAccent : '#D0D5DD'}
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
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <StyledView className="items-center mb-2">
              <StyledImage
                source={require('../../../../assets/favicon.png')}
                style={{ width: 64, height: 64 }}
                resizeMode="contain"
              />
            </StyledView>
            <H1 className="text-center mb-2">How do you want to use Bridge?</H1>
            <Body className="text-center text-neutral-500 mb-8">
              You can always change this later in Settings.
            </Body>
          </Animated.View>

          {renderOption(
            'full',
            'people',
            'Find My Match',
            'Enter the matching pool so the community can find your match. You\'ll also vote on matches for others.',
            card1Anim,
          )}

          {renderOption(
            'match_others_only',
            'hand-left',
            'Match Others Only',
            'Help the community by voting on matches for others. You won\'t appear in the matching pool yourself.',
            card2Anim,
          )}
        </StyledView>

        {/* Continue Button */}
        <Animated.View
          style={{
            opacity: buttonAnim,
            paddingBottom: 24,
          }}
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
    </StyledSafeAreaView>
  );
};
