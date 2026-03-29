import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { sendLoginOtpToEmail, isAllowedEmailDomain } from '../../services/authService';
import { createLogger } from '../../utils/secureLogger';
import { EvaIcon } from '../../components/icons';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS, TEXT_STYLES } from '../../constants/typography';

const logger = createLogger('LoginScreen');

interface LoginScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndContinue = async () => {
    setError('');

    if (!email.trim()) {
      setError('Pop in your Rice email so we can find you.');
      return;
    }
    if (!email.includes('@')) {
      setError('Hmm, that doesn\'t look like an email. Double-check and try again.');
      return;
    }
    if (!isAllowedEmailDomain(email)) {
      setError('Bridge is only open to Rice students right now — use your @rice.edu email.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendLoginOtpToEmail(email.trim().toLowerCase());

      if (result.ok) {
        navigation.navigate('EmailVerification', {
          email: email,
        });
      } else {
        setError(result.error?.message || 'We couldn\'t send your code. Give it another try.');
      }
      setIsLoading(false);
    } catch (error: any) {
      logger.error('Login error:', error);
      setError('Something went wrong on our end. Try again in a sec.');
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      onContinue={validateAndContinue}
      hasTextInput={true}
      keyboardPersistent={true}
      topPadding={20}
    >
      {/* Back Button — icon only, 44px min touch target per iOS HIG */}
      <StyledTouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          minHeight: 44,
          minWidth: 44,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: COLORS.backgroundGray,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <EvaIcon name="arrow-back" variant="outline" size={22} color={COLORS.text.heading} />
      </StyledTouchableOpacity>

      <StyledView>
        {/* Title — bold 700 at 28px per .impeccable.md screen title standard */}
        <StyledText
          style={{
            ...TEXT_STYLES.displaySm,
            fontWeight: '700',
            color: COLORS.text.heading,
            marginBottom: 6,
          }}
        >
          Hey, welcome back
        </StyledText>

        {/* Subtitle — tighter spacing to title */}
        <StyledText
          style={{
            ...TEXT_STYLES.bodyMd,
            color: COLORS.text.secondary,
            marginBottom: 20,
          }}
        >
          Log in with your Rice email and we'll get you right back in.
        </StyledText>

        <Input
          label="Rice Email"
          placeholder="netid@rice.edu"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
          autoFocus={true}
        />

        {/* Helper text — tighter to input */}
        <StyledText
          style={{
            fontFamily: FONTS.regular,
            fontSize: FONT_SIZES.sm,
            lineHeight: LINE_HEIGHTS.sm,
            color: COLORS.text.light,
            marginTop: 8,
          }}
        >
          {isLoading ? 'Sending your code...' : "We'll send a quick code to your inbox to make sure it's you."}
        </StyledText>

        {/* Sign Up row — vertically centered, tighter gap */}
        <StyledView
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 20,
          }}
        >
          <StyledText
            style={{
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.base,
              lineHeight: LINE_HEIGHTS.base,
              color: COLORS.text.secondary,
            }}
          >
            Don't have an account?{' '}
          </StyledText>
          <StyledTouchableOpacity
            onPress={() => navigation.navigate('Onboarding')}
            style={{ minHeight: 44, justifyContent: 'center' }}
            accessibilityLabel="Sign Up"
            accessibilityRole="button"
          >
            <StyledText
              style={{
                fontFamily: FONTS.semiBold,
                fontSize: FONT_SIZES.base,
                lineHeight: LINE_HEIGHTS.base,
                color: COLORS.primaryButton,
              }}
            >
              Sign Up
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </OnboardingLayout>
  );
};
