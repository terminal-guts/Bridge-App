/**
 * Match Proposal Screen
 *
 * Displays a prospective match's profile with privacy restrictions.
 * Information is partially obscured until both parties accept the match.
 *
 * Privacy Restrictions:
 * - Name: Only first initial + age shown (e.g., "S, 27")
 * - Photos: Progressive blur (first less, others more)
 * - Hidden: School, Company, Job Title
 *
 * Features:
 * - "Why This Match" explainability section
 * - Mutual interests/values highlighting
 * - Animated community score
 * - Swipe gestures for Accept/Pass
 * - Pass feedback for better recommendations
 *
 * Design Philosophy: Calm, warm, inviting - consistent with Bridge visual identity
 * Follows Bridge Design & Technical Specifications
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile, DeepQuestionAnswer } from '../../types';
import { lightHaptic, mediumHaptic, successHaptic, warningHaptic, selectionHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { TIER_CONFIG } from '../../utils/questionTiers';
import { computeApprovalPercent } from '../../utils/matchCardGenerator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { DURATIONS, SPRINGS } from '../../constants/animations';
import { COLORS as THEME_COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon, PillIcon } from '../../components/icons/Icons';
import { SHADOWS, OVERLAYS } from '../../theme/shadows';
import { ProfileBadgesSection } from '../../components/badges/ProfileBadgesSection';

// Extracted components
import {
  COLORS,
  formatFrequency,
  getFirstInitial,
  getEndorsementData,
  LoadingSkeleton,
  ExpirationTimer,
  CommunityScore,
  WhyThisMatch,
  BlurredPhoto,
  InfoPill,
  Section,
  Tag,
  LifestyleRow,
  PassFeedbackModal,
  PassConfirmModal,
  CelebrationOverlay,
} from './MatchProposalScreen.components';

const logger = createLogger('MatchProposalScreen');

// ============================================================================
// Styled Components
// ============================================================================

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

// ============================================================================
// Constants - Design Tokens
// ============================================================================

// Dimensions migrated into the component via useWindowDimensions() so they
// reflow on rotation / iPad split-view / different devices.

// Photo section dark backgrounds (dark surfaces, not in warm COLORS palette)
const PHOTO_BG = '#111111';
const PHOTO_EMPTY_BG = '#1A1A1A';
const PHOTO_EMPTY_CIRCLE_BG = '#262626';
const PHOTO_EMPTY_ICON_COLOR = '#525252';

// Header button overlay (semi-transparent over photos)
const HEADER_BUTTON_BG = OVERLAYS.heavy;

// Photo indicator inactive state
const INDICATOR_INACTIVE = 'rgba(255, 255, 255, 0.4)';
const TEXT_ON_PHOTO_MUTED = 'rgba(255, 255, 255, 0.7)';

// ============================================================================
// Types
// ============================================================================

interface MatchProposalScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'MatchProposal'>;
}

// ============================================================================
// Main Component
// ============================================================================

export const MatchProposalScreen: React.FC<MatchProposalScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Responsive derivations: reflow on rotation / iPad split-view / different devices.
  const PHOTO_HEIGHT = useMemo(() => Math.min(SCREEN_HEIGHT * 0.48, SCREEN_WIDTH * 1.12), [SCREEN_WIDTH, SCREEN_HEIGHT]);
  const TAP_ZONE_WIDTH = useMemo(() => SCREEN_WIDTH * 0.35, [SCREEN_WIDTH]);
  const SWIPE_THRESHOLD = useMemo(() => SCREEN_WIDTH * 0.25, [SCREEN_WIDTH]);
  // Scale factor: 1.0 on iPhone SE 375pt, ~1.15 on Pro Max 430pt
  const SCALE = useMemo(() => SCREEN_WIDTH / 375, [SCREEN_WIDTH]);
  const TOP_GRADIENT_HEIGHT = useMemo(() => Math.round(PHOTO_HEIGHT * 0.24), [PHOTO_HEIGHT]);
  const BOTTOM_GRADIENT_HEIGHT = useMemo(() => Math.round(PHOTO_HEIGHT * 0.35), [PHOTO_HEIGHT]);

  const { match, profile: passedProfile } = route.params || {};

  const effectiveProfile = useMemo(() => {
    if (passedProfile) return passedProfile;
    if (match) return match.currentUserId === match.user1Id ? match.user2Profile : match.user1Profile;
    return null;
  }, [passedProfile, match]);

  // Guard: if no real profile, the fallback UI below handles it (no auto-navigate — causes jarring flash)

  const [loading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [showPassFeedback, setShowPassFeedback] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPassedThresholdRef = useRef(false);
  const acceptingRef = useRef(false);
  const passingRef = useRef(false);

  const profile = effectiveProfile;
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    let cancelled = false;
    getUserProfile().then((res) => {
      if (!cancelled && res.ok && res.data) setCurrentUserProfile(res.data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const userInterests = useMemo(() => currentUserProfile?.interests || [], [currentUserProfile]);
  const userValues = useMemo(() => currentUserProfile?.values || [], [currentUserProfile]);

  const mutualInterests = useMemo(() => profile?.interests?.filter(i => userInterests.includes(i)).slice(0, 3) || [], [profile, userInterests]);
  const mutualValues = useMemo(() => profile?.values?.filter(v => userValues.includes(v)).slice(0, 3) || [], [profile, userValues]);
  const compatibilityHighlights = useMemo(() => {
    const h: string[] = [];
    if (mutualInterests.length >= 2) h.push('Strong interest alignment');
    if (mutualValues.length >= 2) h.push('Core values align');
    return h;
  }, [mutualInterests, mutualValues, profile]);

  const endorsement = useMemo(() => getEndorsementData(match?.communityScore || 0.75), [match?.communityScore]);

  const handlePassInitiate = useCallback(() => { lightHaptic(); setShowPassConfirm(true); }, []);

  // Accept immediately without confirmation - reduced friction
  const handleAcceptInitiate = useCallback(async () => {
    if (acceptingRef.current) return;
    acceptingRef.current = true;

    // Guard: don't allow accept on expired proposals
    const expiresAt = route.params?.match?.expiresAt;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      showToast.error('Time\'s up', 'This match is no longer available');
      navigation.goBack();
      return;
    }

    setIsAccepting(true);
    mediumHaptic();

    // Record acceptance in community service
    if (route.params?.proposalId) {
      try {
        await communityService.respondToMatchProposal(route.params.proposalId, true);
        logger.info('[MatchProposalScreen] Proposal accepted:', route.params.proposalId);
      } catch (error: any) {
        logger.error('[MatchProposalScreen] Error accepting proposal:', error);
        acceptingRef.current = false;
        if (isMountedRef.current) {
          setIsAccepting(false);
          swipeX.setValue(0);
          swipeOpacity.setValue(1);
          const errMsg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
          if (errMsg.includes('expired') || errMsg.includes('no longer available')) {
            showToast.error('Time\'s up', 'This match has expired');
          } else {
            showToast.error('Something went wrong', 'This match may no longer be available. Head back and try again.');
          }
        }
        return;
      }
    }

    successHaptic();
    setShowCelebration(true);
  }, [route.params, navigation]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 50,
    onPanResponderMove: (_, gs) => {
      swipeX.setValue(gs.dx);
      const pastThreshold = Math.abs(gs.dx) > SWIPE_THRESHOLD;
      if (pastThreshold && !hasPassedThresholdRef.current) {
        hasPassedThresholdRef.current = true;
        mediumHaptic();
      } else if (!pastThreshold && hasPassedThresholdRef.current) {
        hasPassedThresholdRef.current = false;
      }
    },
    onPanResponderRelease: (_, gs) => {
      hasPassedThresholdRef.current = false;
      if (gs.dx > SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: SCREEN_WIDTH, duration: DURATIONS.normal, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: DURATIONS.normal, useNativeDriver: true }),
        ]).start(() => handleAcceptInitiate());
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: -SCREEN_WIDTH, duration: DURATIONS.normal, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: DURATIONS.normal, useNativeDriver: true }),
        ]).start(() => handlePassInitiate());
      } else {
        Animated.spring(swipeX, { toValue: 0, damping: SPRINGS.snappy.damping, stiffness: SPRINGS.snappy.stiffness, mass: SPRINGS.snappy.mass, useNativeDriver: true }).start();
      }
    },
  }), [swipeX, swipeOpacity, handleAcceptInitiate, handlePassInitiate, SWIPE_THRESHOLD, SCREEN_WIDTH]);

  const handlePhotoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentPhotoIndex) { setCurrentPhotoIndex(index); selectionHaptic(); }
  }, [currentPhotoIndex, SCREEN_WIDTH]);

  const goToPhoto = useCallback((index: number) => { flatListRef.current?.scrollToIndex({ index, animated: true }); setCurrentPhotoIndex(index); lightHaptic(); }, []);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setIsAccepting(false);
    if (match) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Love' } }, { name: 'Chat', params: { matchId: match.id, recipientName: profile?.firstName || 'Match' } }] });
    } else {
      navigation.goBack();
    }
  }, [navigation, match, profile]);

  const handlePassConfirmed = useCallback(() => { setShowPassConfirm(false); setShowPassFeedback(true); }, []);
  const handlePassFeedbackSubmit = useCallback(async (_feedbackId?: string) => {
    if (passingRef.current) return;
    passingRef.current = true;
    setShowPassFeedback(false);
    setIsPassing(true);

    if (route.params?.proposalId) {
      try {
        await communityService.respondToMatchProposal(route.params.proposalId, false, {
          name: profile?.firstName || 'Unknown',
          photoUrl: profile?.photos?.[0]?.url,
        });
        logger.info('[MatchProposalScreen] Proposal passed:', route.params.proposalId);
      } catch (error) {
        logger.error('[MatchProposalScreen] Error passing proposal:', error);
        passingRef.current = false;
        if (isMountedRef.current) {
          setIsPassing(false);
          showToast.error('Could not submit feedback. Try again.');
        }
        return;
      }
    }

    if (!isMountedRef.current) return;
    warningHaptic();
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsPassing(false);
      navigation.goBack();
      navigationTimerRef.current = null;
    }, 500);
  }, [navigation, route.params, profile]);

  const handleOptionsMenu = useCallback(() => {
    lightHaptic();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', 'Block User'], destructiveButtonIndex: 1, cancelButtonIndex: 0 }, (i) => {
        if (i === 1) Alert.alert('Block User', 'Are you sure? You will not see this user again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => navigation.goBack() }]);
      });
    } else {
      Alert.alert('Options', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block User', style: 'destructive', onPress: () => Alert.alert('Block User', 'Are you sure? You will not see this user again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => navigation.goBack() }]) }
      ]);
    }
  }, [navigation]);

  // Memoized derivations -- computed once per profile load, not on every scroll/state change
  const displayedQuestions = useMemo(() => {
    if (!profile) return [];
    return (profile.displayedQuestions || [])
      .map(id => profile.deepQuestions?.find(q => q.questionId === id))
      .filter((q): q is DeepQuestionAnswer => q !== undefined)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0));
  }, [profile]);

  const basicInfoPills = useMemo(() => {
    if (!profile) return [] as Array<{ icon: string; text: string }>;
    const pills: Array<{ icon: string; text: string }> = [];
    if (profile.gender?.length) pills.push({ icon: 'person', text: profile.gender.join(', ') });
    if (profile.height) pills.push({ icon: 'maximize', text: profile.height });
    if (profile.ethnicity) pills.push({ icon: 'globe', text: profile.ethnicity });
    if (profile.religion) pills.push({ icon: 'star', text: profile.religion });
    if (profile.politicalLeaning) pills.push({ icon: 'flag', text: formatFrequency(profile.politicalLeaning) || '' });
    return pills;
  }, [profile]);

  // Cleanup navigation timer on unmount
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
    };
  }, []);

  if (loading) return <StyledView className="flex-1 bg-black"><StatusBar barStyle="light-content" /><LoadingSkeleton /></StyledView>;

  if (!profile) {
    return (
      <StyledView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: COLORS.neutral50 }}>
        <StatusBar barStyle="dark-content" />
        <EvaIcon name="person" variant="outline" size={64} color={COLORS.neutral300} />
        <Body className="mt-4 text-center" style={{ color: COLORS.neutral600 }}>We couldn't load this profile right now</Body>
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mt-4 px-6 py-3 rounded-full" style={{ backgroundColor: COLORS.primary500, minHeight: 44 }}>
          <Body className="font-semibold" style={{ color: COLORS.white }}>Go Back</Body>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  const photos = profile.photos || [];
  // Hash-based decorative score (70-99) seeded by proposal ID -- see CLAUDE.md
  const communityScore = computeApprovalPercent(match?.id || '') / 100;
  const expiresAt = match?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const hasLifestyleInfo = profile.drinkingFrequency || profile.cannabisFrequency || profile.tobaccoFrequency || profile.otherDrugsFrequency;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" />

      {/* Swipe Indicators */}
      <Animated.View style={{ position: 'absolute', top: '33%', left: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1.2, 0.8], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.error }}><EvaIcon name="close" variant="fill" size={32} color={COLORS.white} /></StyledView>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: '33%', right: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0.8, 1.2], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.error }}><EvaIcon name="heart" variant="fill" size={32} color={COLORS.white} /></StyledView>
      </Animated.View>

      {/* Fixed Header */}
      <StyledView className="absolute z-50 flex-row items-center justify-between px-4" style={{ top: insets.top + 8, left: 0, right: 0 }}>
        <StyledTouchableOpacity onPress={() => { lightHaptic(); navigation.goBack(); }} style={{ backgroundColor: HEADER_BUTTON_BG, borderRadius: 999, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close proposal">
          <EvaIcon name="close" variant="outline" size={22} color={COLORS.white} />
        </StyledTouchableOpacity>
        <StyledView className="flex-row items-center">
          <ExpirationTimer expiresAt={expiresAt} />
          <StyledTouchableOpacity onPress={handleOptionsMenu} style={{ backgroundColor: HEADER_BUTTON_BG, borderRadius: 999, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="More options">
            <EvaIcon name="more-vertical" variant="outline" size={18} color={COLORS.white} />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: Math.round(80 * SCALE) + insets.bottom + 32 }}>
        {/* Photo Section */}
        <View style={{ height: PHOTO_HEIGHT, backgroundColor: PHOTO_BG }}>
          {photos.length > 0 ? (
            <>
              <FlatList ref={flatListRef} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handlePhotoScroll} scrollEventThrottle={16} keyExtractor={(item, index) => item.id || `photo-${index}`} renderItem={({ item, index }) => <BlurredPhoto uri={getOptimizedPhotoUrl(item.url, 'profile') ?? item.url} style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }} index={index} />} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3} getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })} />
              {photos.length > 1 && (
                <>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex > 0) { goToPhoto(currentPhotoIndex - 1); mediumHaptic(); } }}><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex < photos.length - 1) { goToPhoto(currentPhotoIndex + 1); mediumHaptic(); } }}><View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                </>
              )}
              {photos.length > 1 && (
                <StyledView className="absolute left-5 right-5 flex-row" style={{ top: insets.top + 56 }}>
                  {photos.map((photo, index) => (
                    <StyledTouchableOpacity key={photo.id || `indicator-${index}`} onPress={() => goToPhoto(index)} className="flex-1 mx-1" activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}>
                      <StyledView className="h-1 rounded-full" style={{ backgroundColor: index === currentPhotoIndex ? COLORS.white : INDICATOR_INACTIVE }} />
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              )}
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TOP_GRADIENT_HEIGHT }} pointerEvents="none" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_GRADIENT_HEIGHT }} pointerEvents="none" />
              <StyledView style={{ position: 'absolute', bottom: Math.round(36 * SCALE), left: Math.round(20 * SCALE), right: Math.round(20 * SCALE) }}>
                <StyledView className="flex-row items-center flex-wrap mb-2">
                  <Body className="text-white font-bold" style={{ fontSize: Math.round(FONT_SIZES['6xl'] * SCALE), lineHeight: Math.round(LINE_HEIGHTS['6xl'] * SCALE), letterSpacing: -0.5, textShadowColor: OVERLAYS.medium, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}>{getFirstInitial(profile.firstName)}, {profile.age}</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <EvaIcon name="shield" variant="outline" size={13} color={TEXT_ON_PHOTO_MUTED} />
                  <Body className="ml-1.5" style={{ fontSize: FONT_SIZES.md, lineHeight: LINE_HEIGHTS.md, color: TEXT_ON_PHOTO_MUTED }}>Full profile revealed after matching</Body>
                </StyledView>
              </StyledView>
            </>
          ) : (
            <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: PHOTO_EMPTY_BG }}>
              <StyledView className="w-32 h-32 rounded-full items-center justify-center mb-4" style={{ backgroundColor: PHOTO_EMPTY_CIRCLE_BG }}><EvaIcon name="camera" variant="outline" size={48} color={PHOTO_EMPTY_ICON_COLOR} /></StyledView>
              <Body className="font-medium" style={{ color: COLORS.neutral500 }}>No photos available</Body>
            </StyledView>
          )}
        </View>

        {/* Content Section */}
        <StyledView className="bg-white -mt-5" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Math.round(20 * SCALE), paddingTop: Math.round(28 * SCALE) }}>
          <CommunityScore score={communityScore} endorsement={endorsement} />
          <WhyThisMatch mutualInterests={mutualInterests} mutualValues={mutualValues} compatibilityHighlights={compatibilityHighlights} />
          {basicInfoPills.length > 0 && <StyledView className="flex-row flex-wrap mb-6">{basicInfoPills.map((pill) => <InfoPill key={`${pill.icon}-${pill.text}`} icon={pill.icon} text={pill.text} />)}</StyledView>}
          {profile.userId && (
            <ProfileBadgesSection userId={profile.userId} revealAuthor={false} />
          )}
          {profile.interests?.length > 0 && <Section title="Interests" icon="heart" delay={50}>
            {mutualInterests.length > 0 && <Body className="text-xs font-semibold mb-2" style={{ color: COLORS.primary500 }}>Filled = you both picked this</Body>}
            <StyledView className="flex-row flex-wrap">{profile.interests.map((interest) => <Tag key={interest} label={interest} iconName={interestIconName(interest)} variant="primary" isMutual={mutualInterests.includes(interest)} />)}</StyledView>
          </Section>}
          {profile.values?.length > 0 && <Section title="Values" icon="award" delay={100}>
            {mutualValues.length > 0 && <Body className="text-xs font-semibold mb-2" style={{ color: COLORS.success }}>Filled = you both picked this</Body>}
            <StyledView className="flex-row flex-wrap">{profile.values.map((value) => <Tag key={value} label={value} iconName={valueIconName(value)} variant="success" isMutual={mutualValues.includes(value)} />)}</StyledView>
          </Section>}
          {hasLifestyleInfo && (
            <Section title="Lifestyle" icon="trending-up" delay={200}>
              <StyledView className="rounded-2xl px-4 py-1" style={{ backgroundColor: COLORS.neutral50 }}>
                {profile.drinkingFrequency && <LifestyleRow customIcon={<WineGlassIcon size={17} color={COLORS.neutral500} />} label="Drinking" value={formatFrequency(profile.drinkingFrequency) || ''} />}
                {profile.cannabisFrequency && <LifestyleRow customIcon={<LeafIcon size={17} color={COLORS.neutral500} />} label="Cannabis" value={formatFrequency(profile.cannabisFrequency) || ''} />}
                {profile.tobaccoFrequency && <LifestyleRow customIcon={<CigaretteIcon size={17} color={COLORS.neutral500} />} label="Tobacco" value={formatFrequency(profile.tobaccoFrequency) || ''} />}
                {profile.otherDrugsFrequency && <LifestyleRow customIcon={<PillIcon size={17} color={COLORS.neutral500} />} label="Other" value={formatFrequency(profile.otherDrugsFrequency) || ''} />}
              </StyledView>
            </Section>
          )}
          {displayedQuestions.length > 0 && (
            <Section title="Questions" icon="message-circle" delay={250}>
              {displayedQuestions.map((qa) => {
                const config = TIER_CONFIG[qa.tier as 1 | 2 | 3];
                return (
                  <StyledView key={qa.questionId} className="rounded-2xl p-5 mb-3" style={{ backgroundColor: config.bg, borderWidth: 1, borderColor: config.border }}>
                    <Body className="font-semibold mb-3" style={{ fontSize: FONT_SIZES.lg, lineHeight: LINE_HEIGHTS.xl, color: COLORS.neutral800 }} numberOfLines={3}>{qa.question}</Body>
                    <Body style={{ fontSize: FONT_SIZES.lg, lineHeight: LINE_HEIGHTS['2xl'], color: COLORS.neutral600 }} numberOfLines={6}>{qa.answer}</Body>
                  </StyledView>
                );
              })}
            </Section>
          )}
          <StyledView className="items-center py-5"><Body className="text-sm" style={{ color: COLORS.neutral300 }}>Swipe right to accept, left to pass</Body></StyledView>
          <StyledView className="h-4" />
        </StyledView>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <StyledView className="absolute bottom-0 left-0 right-0 bg-white" style={{ paddingBottom: insets.bottom + 8, paddingTop: 12, paddingHorizontal: Math.round(16 * SCALE), borderTopWidth: 1, borderTopColor: COLORS.neutral200 }}>
        <StyledView className="flex-row" style={{ gap: Math.round(12 * SCALE) }}>
          <StyledTouchableOpacity onPress={handlePassInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center" activeOpacity={0.8} style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 14, opacity: isPassing || isAccepting ? 0.6 : 1, minHeight: 48 }} accessibilityRole="button" accessibilityLabel={isPassing ? 'Passing on proposal' : 'Pass on proposal'} accessibilityState={{ disabled: isPassing || isAccepting }}>
            <EvaIcon name="close" variant="outline" size={18} color={COLORS.neutral600} />
            <Body style={{ color: COLORS.neutral600, fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, lineHeight: LINE_HEIGHTS.xl, marginLeft: 8 }}>{isPassing ? 'Passing...' : 'Pass'}</Body>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={handleAcceptInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center" activeOpacity={0.8} style={{ backgroundColor: COLORS.primary500, borderRadius: 14, opacity: isPassing || isAccepting ? 0.6 : 1, minHeight: 48, ...SHADOWS.sm }} accessibilityRole="button" accessibilityLabel={isAccepting ? 'Accepting proposal' : 'Accept proposal'} accessibilityState={{ disabled: isPassing || isAccepting }}>
            <EvaIcon name="heart" variant="outline" size={18} color={COLORS.white} />
            <Body style={{ color: COLORS.white, fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, lineHeight: LINE_HEIGHTS.xl, marginLeft: 8 }}>{isAccepting ? 'Accepting...' : 'Accept'}</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Modals */}
      <PassConfirmModal visible={showPassConfirm} onConfirm={handlePassConfirmed} onCancel={() => setShowPassConfirm(false)} />
      <PassFeedbackModal visible={showPassFeedback} onClose={() => handlePassFeedbackSubmit()} onSubmit={(id) => handlePassFeedbackSubmit(id)} />
      <CelebrationOverlay visible={showCelebration} recipientName={profile.firstName} onComplete={handleCelebrationComplete} />
    </View>
  );
};
