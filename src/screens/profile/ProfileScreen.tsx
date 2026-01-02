/**
 * Unified Profile Screen
 *
 * Displays user profiles in two distinct modes:
 * 1. 'preview' - View your own profile as others see it
 * 2. 'view' - View another user's profile (friends, proposals, matches)
 *
 * Design Philosophy:
 * - Full-bleed photos with tap-to-navigate zones
 * - Immersive content interleaved with photos
 * - Premium typography with text shadows for legibility
 * - Smooth entrance animations and micro-interactions
 * - Deep question cards with elevated visual hierarchy
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Dimensions,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { H3, Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile, DeepQuestionAnswer } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/profileService';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { TIER_CONFIG } from '../../utils/questionTiers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Unified props supporting both modes
interface ProfileScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'ProfilePreview'> | RouteProp<RootStackParamList, 'ProfileView'>;
  mode?: 'preview' | 'view'; // Explicitly pass mode or infer from route
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledAnimatedView = styled(Animated.View);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, SCREEN_WIDTH * 1.25);
const TAP_ZONE_WIDTH = SCREEN_WIDTH * 0.35;

// Format lifestyle frequency values nicely
const formatFrequency = (value?: string): string | null => {
  if (!value) return null;
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Loading skeleton
const LoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <StyledView className="flex-1 bg-black">
      <Animated.View style={{ opacity: pulseAnim, height: PHOTO_HEIGHT, backgroundColor: '#1a1a1a' }} />
      <StyledView className="px-4 py-6 bg-white -mt-8 rounded-t-3xl">
        <Animated.View style={{ opacity: pulseAnim }}>
          <StyledView className="h-8 bg-neutral-200 rounded-lg mb-3 w-40" />
          <StyledView className="h-4 bg-neutral-200 rounded mb-2 w-32" />
          <StyledView className="h-4 bg-neutral-200 rounded w-48" />
        </Animated.View>
      </StyledView>
    </StyledView>
  );
};

// Category-specific styling for info pills - ALL UNIQUE COLORS (widely spread spectrum)
const PILL_STYLES: Record<string, { bg: string; iconColor: string; textColor: string }> = {
  'location-outline': { bg: 'bg-red-50', iconColor: '#DC2626', textColor: 'text-red-700' },
  'home-outline': { bg: 'bg-indigo-50', iconColor: '#6366F1', textColor: 'text-indigo-700' },
  'resize-outline': { bg: 'bg-lime-50', iconColor: '#84CC16', textColor: 'text-lime-700' },
  'person-outline': { bg: 'bg-purple-50', iconColor: '#9333EA', textColor: 'text-purple-700' },
  'chatbubble-outline': { bg: 'bg-yellow-50', iconColor: '#EAB308', textColor: 'text-yellow-700' },
  'globe-outline': { bg: 'bg-slate-100', iconColor: '#475569', textColor: 'text-slate-700' },
  'sparkles-outline': { bg: 'bg-cyan-50', iconColor: '#06B6D4', textColor: 'text-cyan-700' },
  'flag-outline': { bg: 'bg-blue-50', iconColor: '#3B82F6', textColor: 'text-blue-700' },
  default: { bg: 'bg-neutral-100', iconColor: '#667085', textColor: 'text-neutral-700' },
};

// Enhanced info pill with category-specific colors
const InfoPill: React.FC<{ icon: string; text: string }> = React.memo(({ icon, text }) => {
  const style = PILL_STYLES[icon] || PILL_STYLES.default;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <StyledView
          className={`flex-row items-center ${style.bg} rounded-full px-3.5 py-2 mr-2 mb-2`}
          style={{
            shadowColor: style.iconColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <Ionicons name={icon as any} size={15} color={style.iconColor} />
          <Body className={`${style.textColor} text-sm font-medium ml-1.5`}>{text}</Body>
        </StyledView>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Animated section with icon header
const Section: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  delay?: number;
}> = React.memo(({ title, icon, children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      animation = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      animation?.stop();
    };
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginBottom: 24,
      }}
    >
      <StyledView className="flex-row items-center mb-3">
        <StyledView
          className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center"
          style={{
            shadowColor: '#437FFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name={icon as any} size={16} color="#437FFF" />
        </StyledView>
        <Body className="text-neutral-900 font-bold text-base ml-2.5">{title}</Body>
      </StyledView>
      {children}
    </Animated.View>
  );
});

// Enhanced tag chip with warm, vibrant shadows
const Tag: React.FC<{ label: string; variant?: 'default' | 'primary' | 'success'; icon?: string }> = ({
  label,
  variant = 'default',
  icon,
}) => {
  const styles = {
    default: {
      bg: 'bg-neutral-100',
      border: 'border-neutral-200/50',
      text: 'text-neutral-700',
      iconColor: '#525252',
      shadowColor: '#3D2817',  // Warm brown shadow
    },
    primary: {
      bg: 'bg-amber-50',
      border: 'border-amber-200/50',
      text: 'text-amber-700',
      iconColor: '#F59E0B',
      shadowColor: '#D97706',  // Deep amber shadow
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/50',
      text: 'text-emerald-700',
      iconColor: '#10B981',
      shadowColor: '#0A8A5E',  // Rich emerald shadow
    },
  };
  const style = styles[variant];

  return (
    <StyledView
      className={`rounded-2xl px-4 py-2.5 mr-2 mb-2.5 border ${style.bg} ${style.border}`}
      style={{
        shadowColor: style.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <StyledView className="flex-row items-center">
        {icon && <Ionicons name={icon as any} size={14} color={style.iconColor} style={{ marginRight: 6 }} />}
        <Body className={`text-sm font-semibold ${style.text}`}>{label}</Body>
      </StyledView>
    </StyledView>
  );
};

// Get frequency level for visual indicator
const getFrequencyLevel = (value: string): number => {
  const lower = value.toLowerCase();
  if (lower.includes('never') || lower.includes('no')) return 0;
  if (lower.includes('rarely') || lower.includes('sometimes')) return 1;
  if (lower.includes('socially') || lower.includes('occasional')) return 2;
  if (lower.includes('often') || lower.includes('regular')) return 3;
  if (lower.includes('daily') || lower.includes('yes') || lower.includes('frequently')) return 4;
  return 2;
};

// Enhanced lifestyle row with visual frequency indicator
const LifestyleRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
  const level = getFrequencyLevel(value);
  const colors = ['#10B981', '#84CC16', '#F59E0B', '#F97316', '#EF4444'];

  return (
    <StyledView className="flex-row items-center justify-between py-3.5 border-b border-neutral-100/80">
      <StyledView className="flex-row items-center flex-1">
        <StyledView className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
          <Ionicons name={icon as any} size={18} color="#525252" />
        </StyledView>
        <Body className="text-neutral-700 ml-3 font-medium">{label}</Body>
      </StyledView>
      <StyledView className="flex-row items-center">
        {/* Visual frequency dots */}
        <StyledView className="flex-row mr-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <StyledView
              key={i}
              className="w-2 h-2 rounded-full mx-0.5"
              style={{
                backgroundColor: i <= level ? colors[level] : '#E5E7EB',
              }}
            />
          ))}
        </StyledView>
        <Body className="text-neutral-900 font-semibold text-sm" style={{ minWidth: 80, textAlign: 'right' }}>
          {value}
        </Body>
      </StyledView>
    </StyledView>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route, mode: explicitMode }) => {
  const insets = useSafeAreaInsets();

  // Determine mode from explicit prop or route params
  const inferredMode = ('previewProfile' in (route.params || {})) ? 'preview' :
                       ('userId' in (route.params || {})) ? 'view' : 'preview';
  const mode = explicitMode || inferredMode;

  // Extract params based on mode
  const previewParams = mode === 'preview' ? ((route.params as any) || {}) : {};
  const viewParams = mode === 'view' ? ((route.params as any) || {}) : {};

  const passedProfile = mode === 'preview' ? previewParams.previewProfile : viewParams.profile;
  const userId = mode === 'view' ? viewParams.userId : undefined;
  const showActions = mode === 'view' ? viewParams.showActions : false;
  const onAccept = mode === 'view' ? viewParams.onAccept : undefined;
  const onPass = mode === 'view' ? viewParams.onPass : undefined;

  const [profile, setProfile] = useState<UserProfile | null>(passedProfile || null);
  const [loading, setLoading] = useState(!passedProfile);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isResponding, setIsResponding] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!passedProfile) {
      if (mode === 'preview') {
        loadOwnProfile();
      } else {
        // TODO: Fetch profile by userId in view mode
        Alert.alert('Error', 'Profile loading by userId not yet implemented');
        navigation.goBack();
      }
    }
  }, [mode, passedProfile]);

  const loadOwnProfile = async () => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        Alert.alert('Error', 'User not authenticated');
        navigation.goBack();
        return;
      }

      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
      } else {
        Alert.alert('Error', 'Failed to load profile');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentPhotoIndex) {
      setCurrentPhotoIndex(index);
    }
  };

  const goToPhoto = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentPhotoIndex(index);
    lightHaptic();
  };

  const handleAccept = async () => {
    if (!onAccept || isResponding) return;
    setIsResponding(true);
    mediumHaptic();

    try {
      await onAccept();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept');
      setIsResponding(false);
    }
  };

  const handlePass = async () => {
    if (!onPass || isResponding) return;
    setIsResponding(true);
    lightHaptic();

    try {
      await onPass();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to pass');
      setIsResponding(false);
    }
  };

  if (loading) {
    return (
      <StyledView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <LoadingSkeleton />
      </StyledView>
    );
  }

  if (!profile) {
    return (
      <StyledView className="flex-1 bg-neutral-50 items-center justify-center px-6">
        <StatusBar barStyle="dark-content" />
        <Ionicons name="person-outline" size={64} color="#D0D5DD" />
        <Body className="text-neutral-600 mt-4 text-center">Profile not found</Body>
        <StyledTouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4 bg-primary-500 px-6 py-3 rounded-full"
        >
          <Body className="text-white font-semibold">Go Back</Body>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  const photos = profile.photos || [];
  const displayedQuestions = (profile.displayedQuestions || [])
    .map(id => profile.deepQuestions?.find(q => q.questionId === id))
    .filter((q): q is DeepQuestionAnswer => q !== undefined)
    .sort((a, b) => (a.tier || 0) - (b.tier || 0));

  const hasLifestyleInfo = profile.drinkingFrequency || profile.cannabisFrequency ||
    profile.tobaccoFrequency || profile.otherDrugsFrequency;

  // Get visibility settings (only apply in preview mode)
  const visibility = mode === 'preview' ? {
    religion: profile.sectionVisibility?.religion ?? true,
    politics: profile.sectionVisibility?.politics ?? true,
    family: profile.sectionVisibility?.family ?? true,
    lifestyle: profile.sectionVisibility?.lifestyle ?? true,
  } : {
    religion: true,
    politics: true,
    family: true,
    lifestyle: true,
  };

  // Build basic info pills
  const basicInfoPills: Array<{ icon: string; text: string }> = [];
  if (profile.gender && profile.gender.length > 0) {
    const capitalizeGender = (g: string) => g.charAt(0).toUpperCase() + g.slice(1);
    const genderText = profile.gender.length === 1
      ? capitalizeGender(profile.gender[0])
      : profile.gender.map(capitalizeGender).join(', ');
    basicInfoPills.push({ icon: 'person-outline', text: genderText });
  }
  if (profile.pronounsList && profile.pronounsList.length > 0) {
    basicInfoPills.push({ icon: 'chatbubble-outline', text: profile.pronounsList.join('/') });
  }
  if (profile.height) basicInfoPills.push({ icon: 'resize-outline', text: profile.height });
  if (profile.location) basicInfoPills.push({ icon: 'location-outline', text: profile.location });
  if (profile.hometown) basicInfoPills.push({ icon: 'home-outline', text: `From ${profile.hometown}` });
  if (profile.ethnicity) basicInfoPills.push({ icon: 'globe-outline', text: profile.ethnicity });
  if (visibility.religion && profile.religion) {
    basicInfoPills.push({ icon: 'sparkles-outline', text: profile.religion });
  }
  if (visibility.politics && profile.politicalLeaning) {
    basicInfoPills.push({ icon: 'flag-outline', text: formatFrequency(profile.politicalLeaning) || '' });
  }

  return (
    <StyledView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Fixed Header - Close (preview) or Back (view) button */}
      <StyledTouchableOpacity
        onPress={() => {
          lightHaptic();
          navigation.goBack();
        }}
        className="absolute z-50 bg-black/50 rounded-full p-2.5"
        style={{ top: insets.top + 8, left: 16 }}
        activeOpacity={0.8}
      >
        <Ionicons name={mode === 'preview' ? 'close' : 'arrow-back'} size={24} color="white" />
      </StyledTouchableOpacity>

      {mode === 'preview' && (
        <StyledView
          className="absolute z-50 bg-black/50 rounded-full px-4 py-2"
          style={{ top: insets.top + 8, left: 64 }}
        >
          <Body className="text-white font-medium">Preview Profile</Body>
        </StyledView>
      )}

      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Photo Section with Tap Zones */}
        <StyledView style={{ height: PHOTO_HEIGHT }} className="bg-black">
          {photos.length > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handlePhotoScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <StyledImage
                    source={{ uri: item.url }}
                    style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
                    resizeMode="cover"
                  />
                )}
              />

              {/* Invisible Tap Zones for Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      if (currentPhotoIndex > 0) {
                        goToPhoto(currentPhotoIndex - 1);
                        mediumHaptic();
                      }
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: TAP_ZONE_WIDTH,
                      }}
                    />
                  </TouchableWithoutFeedback>

                  <TouchableWithoutFeedback
                    onPress={() => {
                      if (currentPhotoIndex < photos.length - 1) {
                        goToPhoto(currentPhotoIndex + 1);
                        mediumHaptic();
                      }
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: TAP_ZONE_WIDTH,
                      }}
                    />
                  </TouchableWithoutFeedback>
                </>
              )}

              {/* Photo Progress Bars */}
              {photos.length > 1 && (
                <StyledView
                  className="absolute left-4 right-4 flex-row"
                  style={{ top: insets.top + 56 }}
                >
                  {photos.map((_, index) => (
                    <StyledTouchableOpacity
                      key={index}
                      onPress={() => goToPhoto(index)}
                      className="flex-1 mx-1"
                      activeOpacity={0.8}
                    >
                      <StyledView
                        className={`h-1 rounded-full ${
                          index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              )}

              {/* Gradient overlays */}
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent']}
                className="absolute top-0 left-0 right-0 h-28"
                pointerEvents="none"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                className="absolute bottom-0 left-0 right-0 h-44"
                pointerEvents="none"
              />

              {/* Name Overlay */}
              <StyledView className="absolute bottom-12 left-5 right-5">
                <StyledView className="flex-row items-center flex-wrap mb-2">
                  <Body
                    className="text-white font-bold"
                    style={{
                      fontSize: 32,
                      lineHeight: 38,
                      textShadowColor: 'rgba(0, 0, 0, 0.75)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {profile.firstName}, {profile.age}
                  </Body>
                  {profile.isVerified && (
                    <StyledView className="ml-2 bg-primary-500 rounded-full p-1">
                      <Ionicons name="checkmark" size={16} color="white" />
                    </StyledView>
                  )}
                </StyledView>

                {/* Professional Info */}
                {(profile.currentJob || profile.companyPosition) && (
                  <StyledView className="flex-row items-center mb-1">
                    <Ionicons name="briefcase-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Body
                      className="text-white/90 ml-1.5"
                      style={{ fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {profile.currentJob}{profile.companyPosition ? ` at ${profile.companyPosition}` : ''}
                    </Body>
                  </StyledView>
                )}

                {/* School Info */}
                {profile.school && (
                  <StyledView className="flex-row items-center">
                    <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Body
                      className="text-white/90 ml-1.5"
                      style={{ fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {profile.school}
                    </Body>
                  </StyledView>
                )}
              </StyledView>
            </>
          ) : (
            <StyledView className="flex-1 items-center justify-center bg-neutral-900">
              <StyledView className="w-32 h-32 rounded-full bg-neutral-800 items-center justify-center mb-4">
                <Ionicons name="camera-outline" size={48} color="#525252" />
              </StyledView>
              <Body className="text-neutral-400 font-medium">No photos yet</Body>
              <Body className="text-neutral-500 text-sm mt-1">Add photos to preview your profile</Body>
            </StyledView>
          )}
        </StyledView>

        {/* Content Section */}
        <StyledView className="bg-white px-4 pt-6 pb-12 -mt-4 rounded-t-3xl" style={{ paddingBottom: showActions ? 120 : 48 }}>

          {/* Basic Info Pills */}
          {basicInfoPills.length > 0 && (
            <StyledView className="flex-row flex-wrap mb-6">
              {basicInfoPills.map((pill, index) => (
                <InfoPill key={index} icon={pill.icon} text={pill.text} />
              ))}
            </StyledView>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <Section title="Interests" icon="heart-outline" delay={50}>
              <StyledView className="flex-row flex-wrap">
                {profile.interests.map((interest, index) => (
                  <Tag key={index} label={interest} variant="primary" />
                ))}
              </StyledView>
            </Section>
          )}

          {/* Values */}
          {profile.values && profile.values.length > 0 && (
            <Section title="Values" icon="diamond-outline" delay={100}>
              <StyledView className="flex-row flex-wrap">
                {profile.values.map((value, index) => (
                  <Tag key={index} label={value} variant="success" />
                ))}
              </StyledView>
            </Section>
          )}

          {/* Family & Future */}
          {visibility.family && (profile.hasChildren || profile.familyPlans) && (
            <Section title="Family" icon="people-outline" delay={150}>
              <StyledView className="bg-neutral-50 rounded-xl p-4">
                {profile.hasChildren && (
                  <StyledView className="flex-row items-center mb-2 last:mb-0">
                    <Ionicons name="person-outline" size={18} color="#667085" />
                    <Body className="text-neutral-700 ml-2.5">{formatFrequency(profile.hasChildren)}</Body>
                  </StyledView>
                )}
                {profile.familyPlans && (
                  <StyledView className="flex-row items-center">
                    <Ionicons name="heart-outline" size={18} color="#667085" />
                    <Body className="text-neutral-700 ml-2.5">{formatFrequency(profile.familyPlans)}</Body>
                  </StyledView>
                )}
              </StyledView>
            </Section>
          )}

          {/* Lifestyle */}
          {visibility.lifestyle && hasLifestyleInfo && (
            <Section title="Lifestyle" icon="leaf-outline" delay={200}>
              <StyledView className="bg-neutral-50 rounded-2xl px-4 py-1">
                {profile.drinkingFrequency && (
                  <LifestyleRow icon="wine-outline" label="Drinking" value={formatFrequency(profile.drinkingFrequency) || ''} />
                )}
                {profile.cannabisFrequency && (
                  <LifestyleRow icon="leaf-outline" label="Cannabis" value={formatFrequency(profile.cannabisFrequency) || ''} />
                )}
                {profile.tobaccoFrequency && (
                  <LifestyleRow icon="flame-outline" label="Tobacco" value={formatFrequency(profile.tobaccoFrequency) || ''} />
                )}
                {profile.otherDrugsFrequency && (
                  <LifestyleRow icon="medical-outline" label="Other" value={formatFrequency(profile.otherDrugsFrequency) || ''} />
                )}
              </StyledView>
            </Section>
          )}

          {/* Deep Questions */}
          {displayedQuestions.length > 0 && (
            <Section title="Deep Questions" icon="chatbubble-ellipses-outline" delay={250}>
              {displayedQuestions.map((qa) => {
                const config = TIER_CONFIG[qa.tier as 1 | 2 | 3];

                return (
                  <StyledView
                    key={qa.questionId}
                    className="rounded-2xl p-4 mb-3"
                    style={{
                      backgroundColor: config.bg,
                      borderWidth: 1.5,
                      borderColor: config.border,
                      shadowColor: config.color || '#3D2817',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Body
                      className="text-neutral-800 font-semibold mb-2"
                      style={{ fontSize: 15, lineHeight: 21 }}
                    >
                      {qa.question}
                    </Body>
                    <Body
                      className="text-neutral-700"
                      style={{ fontSize: 15, lineHeight: 22 }}
                    >
                      {qa.answer}
                    </Body>
                  </StyledView>
                );
              })}
            </Section>
          )}
        </StyledView>
      </Animated.ScrollView>

      {/* Action Buttons (view mode only) */}
      {mode === 'view' && showActions && (
        <StyledView
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-6 py-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <StyledView className="flex-row gap-x-3">
            <StyledTouchableOpacity
              onPress={handlePass}
              disabled={isResponding}
              className="flex-1 bg-neutral-100 rounded-xl py-4 items-center justify-center"
              activeOpacity={0.7}
            >
              <Body className="text-neutral-700 font-semibold">
                {isResponding ? 'Processing...' : '✗ Pass'}
              </Body>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleAccept}
              disabled={isResponding}
              className="flex-1 bg-rose-500 rounded-xl py-4 items-center justify-center"
              activeOpacity={0.8}
            >
              <Body className="text-white font-semibold">
                {isResponding ? 'Processing...' : '✓ Accept'}
              </Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}
    </StyledView>
  );
};

export default ProfileScreen;
