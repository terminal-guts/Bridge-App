import React from 'react';
import { View, SafeAreaView, StatusBar, Text, Dimensions, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { FONTS, TEXT_STYLES, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { lightHaptic } from '../../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Welcome'>;
}

const StyledView = styled(View);
const StyledLinearGradient = styled(LinearGradient);
const StyledText = styled(Text);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive logo: ~48% screen width, 2:1 aspect — scales from SE (180px) to Pro Max (206px)
const logoWidth = Math.round(screenWidth * 0.48);
const logoHeight = Math.round(logoWidth * 0.3);

// Top padding: proportional to screen height instead of fixed pt-12 (48px)
const heroTopPadding = Math.round(screenHeight * 0.04);

// Button max width: caps at 380px so pill shape holds on Pro Max (430pt wide)
const buttonMaxWidth = Math.min(screenWidth - 48, 380);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    lightHaptic();
    navigation.navigate('Onboarding');
  };

  // Bottom padding: respects home indicator on notched phones, 16pt floor on SE
  const bottomPadding = Math.max(insets.bottom, 16) + 16;

  return (
    <StyledView className="flex-1" style={{ backgroundColor: '#0D0D1A' }}>
      {/* Layer 1: Constellation pattern — fades in behind gradient */}
      <Animated.View
        entering={FadeIn.duration(1200).delay(300)}
        style={[StyleSheet.absoluteFill, { opacity: 0.30 }]}
        pointerEvents="none"
      >
        <Image
          source={require('../../../assets/Constellation.jpg')}
          style={{ width: '100%', height: '120%', top: 143 }}
          contentFit="cover"
          cachePolicy="memory"
        />
      </Animated.View>

      {/* Layer 2: Gradient overlay — stars peek through subtly */}
      <StyledLinearGradient
        colors={['rgba(26,23,20,0.85)', 'rgba(42,51,80,0.8)', 'rgba(59,111,232,0.88)', 'rgba(90,139,240,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2, 0.5, 0.95]}
        className="flex-1"
      >

        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <StyledView
            className="flex-1 px-6 justify-between"
            style={{ paddingTop: heroTopPadding }}
          >
            <StyledView className="flex-1 justify-center">
              {/* Logo — proportional to screen width */}
              <Animated.Image
                entering={FadeInUp.duration(600).delay(100)}
                source={require('../../../assets/BridgeAppLogo.png')}
                style={{
                  width: logoWidth,
                  height: logoHeight,
                  tintColor: COLORS.card,
                  marginBottom: 16,
                }}
                resizeMode="contain"
              />
              <Animated.View entering={FadeInUp.duration(500).delay(800)}>
                <StyledText
                  style={{
                    ...TEXT_STYLES.displayMd,
                    color: COLORS.card,
                    textShadowColor: 'rgba(0, 0, 0, 0.35)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  Your people help you{'\n'}find your person.
                </StyledText>
                <StyledText
                  style={{
                    ...TEXT_STYLES.bodyLg,
                    color: 'rgba(255,255,255,0.65)',
                    marginTop: 12,
                    textShadowColor: 'rgba(0, 0, 0, 0.25)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  No more endless swiping!
                </StyledText>
              </Animated.View>

            </StyledView>

            {/* CTA Section — centered with capped width */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(800)}
              style={{ paddingBottom: bottomPadding, alignItems: 'center' }}
            >
              <AnimatedPressable
                onPress={handleGetStarted}
                scale="standard"
                className="rounded-full items-center"
                style={{
                  backgroundColor: COLORS.card,
                  paddingVertical: 16,
                  width: buttonMaxWidth,
                  marginBottom: 16,
                  ...SHADOWS.lg,
                }}
              >
                <StyledText
                  style={{
                    ...TEXT_STYLES.buttonLg,
                    color: COLORS.text.primary,
                    textAlign: 'center',
                  }}
                >
                  Join the Community
                </StyledText>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => {
                  lightHaptic();
                  navigation.navigate('Login');
                }}
                scale="pronounced"
                className="items-center"
                style={{ paddingVertical: 12, width: buttonMaxWidth }}
              >
                <StyledText
                  style={{
                    ...TEXT_STYLES.labelLg,
                    color: 'rgba(255,255,255,0.85)',
                    textAlign: 'center',
                  }}
                >
                  Sign In
                </StyledText>
              </AnimatedPressable>
            </Animated.View>
          </StyledView>
        </SafeAreaView>
      </StyledLinearGradient>
    </StyledView>
  );
};
