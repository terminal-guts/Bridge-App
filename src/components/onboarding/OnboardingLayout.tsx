import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { Button } from '../ui';
import { EvaIcon } from '../../components/icons';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void; // Optional skip callback
  continueLabel?: string;
  continueDisabled?: boolean;
  showBackButton?: boolean;
  hideContinueButton?: boolean; // Hide the continue button entirely (for custom navigation)
  hasTextInput?: boolean; // New prop to differentiate typing vs non-typing questions
  keyboardPersistent?: boolean; // New prop to prevent keyboard dismissal
  topPadding?: number; // Optional top padding override
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);
const StyledRNTouchableOpacity = styled(RNTouchableOpacity);

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  onBack,
  onContinue,
  onSkip,
  continueLabel = 'Continue',
  continueDisabled = false,
  showBackButton = true,
  hideContinueButton = false,
  hasTextInput = false,
  keyboardPersistent = false,
  topPadding,
}) => {
  // Start with keyboard visible for persistent keyboard pages to prevent layout shift
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(keyboardPersistent);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleContinue = () => {
    if (!keyboardPersistent) {
      Keyboard.dismiss();
    }
    onContinue?.();
  };

  if (hasTextInput) {
    // TYPING QUESTIONS LAYOUT
    // - Button sits above keyboard in fixed position
    // - Auto-focus handled in individual step components
    return (
      <StyledSafeAreaView edges={['top']} className="flex-1 bg-neutral-50">
        <StyledKeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={0}
          enabled={true}
        >
          <StyledView className="flex-1">
            {/* Back Button */}
            {showBackButton && onBack && (
              <StyledRNTouchableOpacity
                onPress={onBack}
                className="absolute top-4 left-4 z-50 p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <EvaIcon name="arrow-back" size={24} color="#101828" />
              </StyledRNTouchableOpacity>
            )}

            {/* Scrollable Content */}
            <StyledScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: topPadding ?? 64,
                paddingBottom: 16,
                flexGrow: 1,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={keyboardPersistent ? "none" : "interactive"}
            >
              {keyboardPersistent ? (
                <TouchableWithoutFeedback onPress={() => { }} accessible={false}>
                  <StyledView className="flex-1">
                    {children}
                  </StyledView>
                </TouchableWithoutFeedback>
              ) : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                  <StyledView className="flex-1">
                    {children}
                  </StyledView>
                </TouchableWithoutFeedback>
              )}
            </StyledScrollView>

            {/* Continue Button - Fixed position above keyboard */}
            {!hideContinueButton && (
              <StyledView
                className="px-6 bg-neutral-50"
                style={{
                  paddingTop: 16,
                  paddingBottom: 16,  // Let KeyboardAvoidingView handle positioning naturally
                  borderTopWidth: 1,
                  borderTopColor: '#F3F4F6',
                }}
              >
                <Button
                  onPress={handleContinue}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={continueDisabled}
                >
                  {continueLabel}
                </Button>
                {onSkip && (
                  <Button
                    onPress={onSkip}
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="mt-3"
                  >
                    Skip for now
                  </Button>
                )}
              </StyledView>
            )}
          </StyledView>
        </StyledKeyboardAvoidingView>
      </StyledSafeAreaView>
    );
  }

  // NON-TYPING QUESTIONS LAYOUT
  // - Button pinned to bottom as sticky footer
  // - No keyboard considerations
  return (
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1 bg-neutral-50">
      <StyledView className="flex-1">
        {/* Back Button */}
        {showBackButton && onBack && (
          <StyledRNTouchableOpacity
            onPress={onBack}
            className="absolute top-4 left-4 z-50 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <EvaIcon name="arrow-back" size={24} color="#101828" />
          </StyledRNTouchableOpacity>
        )}

        {/* Scrollable Content */}
        <StyledScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: topPadding ?? 64,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <StyledView className="flex-1">
            {children}
          </StyledView>
        </StyledScrollView>

        {/* Continue Button - Sticky footer at bottom */}
        {!hideContinueButton && (
          <StyledView
            className="px-6 py-6 bg-neutral-50"
            style={{
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
            }}
          >
            <Button
              onPress={handleContinue}
              variant="primary"
              size="lg"
              fullWidth
              disabled={continueDisabled}
            >
              {continueLabel}
            </Button>
            {onSkip && (
              <Button
                onPress={onSkip}
                variant="ghost"
                size="lg"
                fullWidth
                className="mt-3"
              >
                Skip for now
              </Button>
            )}
          </StyledView>
        )}
      </StyledView>
    </StyledSafeAreaView>
  );
};
