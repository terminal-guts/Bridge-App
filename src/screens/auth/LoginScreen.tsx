import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { sendLoginOtpToEmail, isAllowedEmailDomain, signInWithGoogle } from '../../services/authService';
import { fetchAndSetUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { BackHeader } from '../../components/ui/BackHeader';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS, TEXT_STYLES } from '../../constants/typography';
import { showToast } from '../../utils/toast';
import { EvaIcon } from '../../components/icons';
import { lightHaptic } from '../../utils/haptics';

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
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    if (signingInGoogle) return;
    lightHaptic();
    setSigningInGoogle(true);

    const result = await signInWithGoogle();

    if (!result.ok) {
      setSigningInGoogle(false);
      if (result.error?.code === 'CANCELLED') return;
      showToast.error('Sign In Failed', result.error?.message || 'Please try again.');
      return;
    }

    const profileResult = await fetchAndSetUserProfile(result.data!.id);
    setSigningInGoogle(false);

    if (profileResult.ok && profileResult.data?.profileCompleted) {
      (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } else {
      navigation.navigate('Onboarding', { skipAuth: true });
    }
  };

  const validateAndContinue = async () => {
    if (isLoading) return;
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
          email: email.trim().toLowerCase(),
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
      <BackHeader title="Hey, welcome back" showBorder={false} />

      <StyledView>
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
            setEmail(text.toLowerCase());
            if (error) setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
          autoFocus={true}
        />

        {/* Helper text — tighter to input */}
        <StyledText
          style={{
            fontFamily: FONTS.regular,
            fontSize: FONT_SIZES.sm,
            lineHeight: LINE_HEIGHTS.sm,
            color: COLORS.text.tertiary,
            marginTop: 8,
          }}
        >
          {isLoading ? 'Sending your code...' : "We'll send a quick code to your inbox to make sure it's you."}
        </StyledText>

        {/* Divider */}
        <StyledView
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 24,
            marginBottom: 16,
          }}
        >
          <StyledView style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          <StyledText
            style={{
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.sm,
              color: COLORS.text.tertiary,
              marginHorizontal: 12,
            }}
          >
            or
          </StyledText>
          <StyledView style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        </StyledView>

        {/* Google Sign In */}
        <StyledTouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={signingInGoogle}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: COLORS.border,
            backgroundColor: COLORS.card,
            opacity: signingInGoogle ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Continue with Rice Google"
        >
          <EvaIcon name="google" variant="outline" size={20} color={COLORS.text.primary} style={{ marginRight: 10 }} />
          <StyledText
            style={{
              fontFamily: FONTS.semiBold,
              fontSize: FONT_SIZES.base,
              lineHeight: LINE_HEIGHTS.base,
              color: COLORS.text.primary,
            }}
          >
            {signingInGoogle ? 'Signing in...' : 'Continue with Rice Google'}
          </StyledText>
        </StyledTouchableOpacity>

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
                color: COLORS.primary,
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
