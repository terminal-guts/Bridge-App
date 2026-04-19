import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { Button } from '../ui';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../icons';

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
  showBackButton = false,
  hideContinueButton = false,
  hasTextInput = false,
  keyboardPersistent = false,
  topPadding,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Progress bar header height: 6px bar + ~22px label = 28px from safe area top
  const HEADER_HEIGHT = 28;
  const footerPaddingBottom = Math.max(16, Math.round(screenHeight * 0.069) - insets.bottom);

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
      <StyledSafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
        <StyledKeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0}
          enabled={true}
        >
          <StyledView className="flex-1">
            {/* Back Button — auth screens only */}
            {showBackButton && onBack && (
              <StyledRNTouchableOpacity
                onPress={onBack}
                className="absolute left-4 p-2"
                style={{ top: HEADER_HEIGHT + 4, zIndex: 60 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.primary} />
              </StyledRNTouchableOpacity>
            )}
            {/* Scrollable Content */}
            <StyledScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: topPadding ?? (showBackButton && onBack ? HEADER_HEIGHT + 48 : HEADER_HEIGHT + 16),
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
                className="px-6"
                style={{
                  backgroundColor: COLORS.screenBackground,
                  paddingTop: 16,
                  paddingBottom: isKeyboardVisible ? 16 : footerPaddingBottom + insets.bottom,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border,
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
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      <StyledView className="flex-1">
        {/* Back Button — auth screens only */}
        {showBackButton && onBack && (
          <StyledRNTouchableOpacity
            onPress={onBack}
            className="absolute left-4 p-2"
            style={{ top: HEADER_HEIGHT + 4, zIndex: 60 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.primary} />
          </StyledRNTouchableOpacity>
        )}
        {/* Scrollable Content */}
        <StyledScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: topPadding ?? (showBackButton && onBack ? HEADER_HEIGHT + 48 : HEADER_HEIGHT + 16),
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
        {/* SafeAreaView edges={['bottom']} already handles safe area — use fixed padding only */}
        {!hideContinueButton && (
          <StyledView
            className="px-6"
            style={{
              backgroundColor: COLORS.screenBackground,
              paddingTop: 16,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
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
