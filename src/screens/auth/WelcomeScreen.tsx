import React from 'react';
import { View, SafeAreaView, StatusBar, Text, Image } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { styled } from 'nativewind';
import { FONTS } from '../../constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { lightHaptic } from '../../utils/haptics';
import { SHADOWS } from '../../theme/shadows';


interface WelcomeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Welcome'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledLinearGradient = styled(LinearGradient);
const StyledText = styled(Text);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    lightHaptic();
    navigation.navigate('Onboarding');
  };

  return (
    <StyledView className="flex-1">
      <StyledLinearGradient
        colors={['#2D2420', '#3D4A6B', '#5B8FFF', '#FFF9F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.25, 0.55, 1]}
        className="flex-1"
      >
        <StyledSafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <StyledView className="flex-1 px-8 justify-between pt-12">
            {/* Hero Section - Left Aligned */}
            <StyledView className="flex-1 justify-center">
              {/* Logo — drops in from above */}
              <Animated.Image
                entering={FadeInUp.duration(600).delay(100)}
                source={require('../../../assets/BridgeAppLogo.png')}
                className="w-48 h-24 mb-2"
                resizeMode="contain"
                style={{ tintColor: '#FFFFFF' }}
              />
              {/* Tagline — fades up after logo */}
              <Animated.View entering={FadeInUp.duration(500).delay(800)}>
                <StyledText className="text-white/90 text-base font-normal leading-relaxed" style={{ fontFamily: FONTS.regular }}>
                  The community finds the fit.{'\n'}We bridge the gap.
                </StyledText>
              </Animated.View>
            </StyledView>

            {/* CTA Section — slides up from bottom */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(800)}
              className="mb-8"
            >
              {/* Primary Button - Large White Pill */}
              <AnimatedPressable
                onPress={handleGetStarted}
                scale="standard"
                className="bg-white rounded-full py-4 px-8 mb-4 items-center"
                style={SHADOWS.lg}
              >
                <StyledText className="text-neutral-900 text-center text-lg font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                  Get started
                </StyledText>
              </AnimatedPressable>

              {/* Secondary Action - Text Button */}
              <AnimatedPressable
                onPress={() => {
                  lightHaptic();
                  navigation.navigate('Login');
                }}
                scale="pronounced"
                className="py-3 items-center"
              >
                <StyledText className="text-white/80 text-center text-base font-medium" style={{ fontFamily: FONTS.medium }}>
                  Sign in
                </StyledText>
              </AnimatedPressable>
            </Animated.View>
          </StyledView>
        </StyledSafeAreaView>
      </StyledLinearGradient>
    </StyledView>
  );
};
