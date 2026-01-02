import React, { useEffect, useRef, useState } from 'react';
import { View, SafeAreaView, StatusBar, Image, Text, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { supabase } from '../../lib/supabase';
interface WelcomeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Welcome'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledLinearGradient = styled(LinearGradient);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // 1. Logo fades in first (medium speed - 600ms)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Small delay, then subheading and buttons fade in together
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    setIsLoading(true);

    try {
      // Create anonymous user session before starting onboarding
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('Anonymous auth error:', error);
        Alert.alert(
          'Authentication Error',
          'Unable to create user session. Please try again or check your internet connection.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        console.error('No user returned from anonymous auth');
        Alert.alert(
          'Authentication Error',
          'Failed to create user session. Please try again.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // User session created successfully
      console.log('Anonymous user created:', data.user.id);

      // Navigate to onboarding
      navigation.navigate('Onboarding');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Unexpected error during authentication:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }
  };

  return (
    <StyledView className="flex-1">
      <StyledLinearGradient
        colors={['#2D2420', '#5B8FFF', '#FFF9F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.45, 1]}
        className="flex-1"
      >
        <StyledSafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <StyledView className="flex-1 px-8 justify-between pt-12">
            {/* Hero Section - Left Aligned */}
            <StyledView className="flex-1 justify-center">
              <Animated.Image
                source={require('../../../Images/BridgeAppLogo.png')}
                className="w-48 h-24 mb-2"
                resizeMode="contain"
                style={{
                  tintColor: '#FFFFFF',
                  opacity: logoOpacity,
                  transform: [{ translateY: logoTranslateY }],
                }}
              />
              <Animated.View
                style={{
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                }}
              >
                <StyledText className="text-white/90 text-base font-normal leading-relaxed mb-2">
                  The community finds the fit.
                </StyledText>
                <StyledText className="text-white/90 text-base font-normal leading-relaxed">
                  We bridge the gap.
                </StyledText>
              </Animated.View>
            </StyledView>

            {/* CTA Section */}
            <Animated.View
              style={{
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              }}
              className="mb-8"
            >
              {/* Primary Button - Large White Pill */}
              <StyledTouchableOpacity
                onPress={handleGetStarted}
                className="bg-white rounded-full py-4 px-8 mb-4 shadow-lg active:scale-[0.98]"
                activeOpacity={0.9}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#1D2939" size="small" />
                ) : (
                  <StyledText className="text-neutral-900 text-center text-lg font-semibold">
                    Get started
                  </StyledText>
                )}
              </StyledTouchableOpacity>

              {/* Secondary Action - Text Button */}
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('Login')}
                className="py-3 active:opacity-70"
                activeOpacity={0.7}
              >
                <StyledText className="text-white/80 text-center text-base font-medium">
                  Sign in
                </StyledText>
              </StyledTouchableOpacity>
            </Animated.View>
          </StyledView>
        </StyledSafeAreaView>
      </StyledLinearGradient>
    </StyledView>
  );
};