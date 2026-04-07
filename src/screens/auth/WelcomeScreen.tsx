import React, { useEffect } from 'react';
import { View, SafeAreaView, StatusBar, Text, Dimensions, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { styled } from 'nativewind';
import { TEXT_STYLES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { lightHaptic } from '../../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Welcome'>;
}

const StyledView = styled(View);
const StyledText = styled(Text);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive logo: ~48% screen width, 2:1 aspect — scales from SE (180px) to Pro Max (206px)
const logoWidth = Math.round(screenWidth * 0.48);
const logoHeight = Math.round(logoWidth * 0.3);

// Button max width: caps at 380px so pill shape holds on Pro Max (430pt wide)
const buttonMaxWidth = Math.min(screenWidth - 48, 380);

// ── Mesh gradient orb config ────────────────────────────────────────────────
// Each orb is a large blurred circle that drifts slowly to create an
// organic, shifting gradient. No image assets — pure View + blur.

const ORB_SIZE = Math.round(screenWidth * 0.85);

interface OrbConfig {
  color: string;
  startX: number;
  startY: number;
  driftX: number;   // how far it moves horizontally
  driftY: number;   // how far it moves vertically
  duration: number;  // full cycle duration (ms)
  size: number;
  opacity: number;
}

const ORBS: OrbConfig[] = [
  {
    // Sky blue — anchors top, bright and airy
    color: '#5B9CF5',
    startX: -ORB_SIZE * 0.2,
    startY: -ORB_SIZE * 0.2,
    driftX: 25,
    driftY: 15,
    duration: 8000,
    size: ORB_SIZE * 1.1,
    opacity: 0.85,
  },
  {
    // Vivid blue — center-right hero glow
    color: '#437FFF',
    startX: screenWidth * 0.3,
    startY: screenHeight * 0.25,
    driftX: -20,
    driftY: 25,
    duration: 10000,
    size: ORB_SIZE * 1.2,
    opacity: 0.8,
  },
  {
    // Light periwinkle — bottom-left softness
    color: '#7BA3F7',
    startX: -ORB_SIZE * 0.15,
    startY: screenHeight * 0.5,
    driftX: 30,
    driftY: -15,
    duration: 12000,
    size: ORB_SIZE,
    opacity: 0.7,
  },
  {
    // White-blue — bottom glow, keeps it light
    color: '#A8C8FF',
    startX: screenWidth * 0.4,
    startY: screenHeight * 0.65,
    driftX: -15,
    driftY: -20,
    duration: 9000,
    size: ORB_SIZE * 0.9,
    opacity: 0.6,
  },
];

const MeshOrb = ({ config }: { config: OrbConfig }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
      -1,   // infinite
      true,  // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [0, config.driftX]);
    const translateY = interpolate(progress.value, [0, 1], [0, config.driftY]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.startX,
          top: config.startY,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  );
};

// Blue-tinted button shadow (not warm brown) for use on blue backgrounds
const BUTTON_SHADOW = Platform.select({
  ios: {
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
});

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const logoTapCount = React.useRef(0);
  const logoTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hidden reviewer entry: tap logo 5 times to access OTP login
  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 3000);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      navigation.navigate('Login');
    }
  };

  // Bottom padding: respects home indicator on notched phones, 16pt floor on SE
  const bottomPadding = Math.max(insets.bottom, 16) + 16;

  return (
    <StyledView className="flex-1" style={{ backgroundColor: COLORS.primary }}>
      {/* Layer 1: Mesh gradient orbs — no fade-in, present from first frame
           so there's no bare-blue flash after splash hides */}
      <View
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        pointerEvents="none"
      >
        {ORBS.map((orb, i) => (
          <MeshOrb key={i} config={orb} />
        ))}
        {/* BlurView softens the hard-edged orbs into a smooth mesh */}
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Layer 2: Slight darkening at top for status bar readability */}
      <LinearGradient
        colors={['rgba(30,64,175,0.25)', 'rgba(37,99,235,0.0)', 'rgba(37,99,235,0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <StyledView className="flex-1 px-6 justify-between">
          {/* Logo + tagline group — pushed slightly below center for visual weight */}
          <StyledView style={{ flex: 1, justifyContent: 'center', paddingTop: screenHeight * 0.06 }}>
            {/* Logo — proportional to screen width. 5x tap = reviewer login */}
            <AnimatedPressable
              onPress={handleLogoTap}
              scale="subtle"
              style={{ alignSelf: 'flex-start' }}
              accessibilityLabel="Bridge logo"
            >
              <Animated.Image
                entering={FadeInUp.duration(600).delay(100)}
                source={require('../../../assets/BridgeAppLogo.png')}
                style={{
                  width: logoWidth,
                  height: logoHeight,
                  tintColor: COLORS.card,
                  marginBottom: 22,
                }}
                resizeMode="contain"
                accessibilityRole="image"
              />
            </AnimatedPressable>
            <Animated.View entering={FadeInUp.duration(500).delay(500)}>
              <StyledText
                style={{
                  ...TEXT_STYLES.bodyLg,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                Your people help you{'\n'}find your person.
              </StyledText>
            </Animated.View>
          </StyledView>

          {/* CTA Section — centered with capped width */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(800)}
            style={{ paddingBottom: bottomPadding, alignItems: 'center' }}
          >
            <AnimatedPressable
              onPress={() => {
                lightHaptic();
                navigation.navigate('Onboarding', { skipAuth: false });
              }}
              scale="standard"
              className="rounded-full items-center justify-center"
              style={{
                backgroundColor: COLORS.card,
                paddingVertical: 16,
                width: buttonMaxWidth,
                ...BUTTON_SHADOW,
              }}
              accessibilityRole="button"
              accessibilityLabel="Join the Community"
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
              scale="standard"
              className="items-center justify-center"
              style={{
                paddingVertical: 14,
                marginTop: 12,
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <StyledText
                style={{
                  ...TEXT_STYLES.buttonLg,
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'center',
                }}
              >
                Sign In
              </StyledText>
            </AnimatedPressable>
          </Animated.View>
        </StyledView>
      </SafeAreaView>
    </StyledView>
  );
};
