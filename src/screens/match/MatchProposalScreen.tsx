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
 * Design Philosophy: Calm, premium, romantic - consistent with Bridge visual identity
 * Follows Bridge Design & Technical Specifications
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Modal,
  Alert,
  ActionSheetIOS,
  Platform,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { styled } from 'nativewind';
import { Body } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile, DeepQuestionAnswer, Match } from '../../types';
import { lightHaptic, mediumHaptic, successHaptic, warningHaptic, selectionHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { TIER_CONFIG } from '../../utils/questionTiers';
import { computeApprovalPercent } from '../../utils/matchCardGenerator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile } from '../../services/profileService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS } from '../../constants/typography';
import { COLORS as THEME_COLORS } from '../../theme/colors';
import { EvaIcon, IconScoutIcon } from '../../components/icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon, PillIcon } from '../../components/icons/Icons';
import { SHADOWS } from '../../theme/shadows';

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
  RecommendToFriendModal,
  PassConfirmModal,
  CelebrationOverlay,
} from './MatchProposalScreen.components';

const logger = createLogger('MatchProposalScreen');

// ============================================================================
// Styled Components
// ============================================================================

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

// ============================================================================
// Constants - Design Tokens
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.48, SCREEN_WIDTH * 1.12);
const TAP_ZONE_WIDTH = SCREEN_WIDTH * 0.35;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// ============================================================================
// Types
// ============================================================================

interface MatchProposalScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'MatchProposal'>;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_PROFILE: UserProfile = {
  id: 'mock-1',
  userId: 'mock-user-1',
  firstName: 'Sarah',
  lastName: 'M',
  age: 27,
  gender: ['Woman'],
  pronouns: 'she/her',
  pronounsList: ['she', 'her'],
  currentJob: 'Product Designer',
  companyPosition: 'Senior Designer',
  educationLevel: 'bachelors',
  school: 'NYU',
  height: "5'7\"",
  ethnicity: 'East Asian',
  religion: 'Spiritual',
  politicalLeaning: 'liberal',
  location: 'Brooklyn, NY',
  hometown: 'Boston, MA',
  photos: [
    { id: '1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', isMain: true, order: 0 },
    { id: '2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', isMain: false, order: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', isMain: false, order: 2 },
  ],
  interests: ['Travel', 'Photography', 'Hiking', 'Music', 'Art', 'Cooking'],
  values: ['Honesty', 'Growth', 'Adventure', 'Family', 'Creativity'],
  lifestyle: { drinking: 'socially', smoking: 'never', exercise: 'often' },
  nonNegotiables: [],
  preferences: { ageMin: 25, ageMax: 35, gender: 'male', lookingFor: 'relationship' },
  hasChildren: 'no',
  familyPlans: 'want_someday',
  drinkingFrequency: 'socially',
  cannabisFrequency: 'never',
  tobaccoFrequency: 'never',
  deepQuestions: [
    { questionId: 1, tier: 1, question: "What's your idea of a perfect weekend?", answer: "Exploring a new neighborhood, finding a cozy coffee shop, and ending with dinner at a restaurant I've been wanting to try." },
    { questionId: 2, tier: 2, question: "What are you most passionate about?", answer: "Creating beautiful, functional designs that make people's lives easier. I love the problem-solving aspect of my work." },
    { questionId: 3, tier: 3, question: "What's a life lesson that took you a while to learn?", answer: "That it's okay to change your mind about what you want. Growth means evolving, and your past decisions don't have to define your future." },
  ],
  displayedQuestions: [1, 2, 3],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Main Component
// ============================================================================

export const MatchProposalScreen: React.FC<MatchProposalScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { match, profile: passedProfile } = route.params || {};

  const effectiveProfile = useMemo(() => {
    if (passedProfile) return passedProfile;
    if (match) return match.currentUserId === match.user1Id ? match.user2Profile : match.user1Profile;
    return MOCK_PROFILE;
  }, [passedProfile, match]);

  const [loading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [showPassFeedback, setShowPassFeedback] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [passFeedbackId, setPassFeedbackId] = useState<string | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPassedThresholdRef = useRef(false);

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
    if (profile?.familyPlans) h.push('Similar life goals');
    return h;
  }, [mutualInterests, mutualValues, profile]);

  const endorsement = useMemo(() => getEndorsementData(match?.communityScore || 0.75), [match?.communityScore]);

  const handlePassInitiate = useCallback(() => { lightHaptic(); setShowPassConfirm(true); }, []);

  // Accept immediately without confirmation - reduced friction!
  const handleAcceptInitiate = useCallback(async () => {
    // Guard: don't allow accept on expired proposals
    const expiresAt = route.params?.match?.expiresAt;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      showToast.error('Proposal expired', 'This proposal is no longer available');
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
      } catch (error) {
        logger.error('[MatchProposalScreen] Error accepting proposal:', error);
        if (isMountedRef.current) {
          setIsAccepting(false);
          showToast.error('Could not accept', 'This proposal may have expired');
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
        lightHaptic();
      } else if (!pastThreshold && hasPassedThresholdRef.current) {
        hasPassedThresholdRef.current = false;
      }
    },
    onPanResponderRelease: (_, gs) => {
      hasPassedThresholdRef.current = false;
      if (gs.dx > SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: SCREEN_WIDTH, duration: 200, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => handleAcceptInitiate());
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        Animated.parallel([
          Animated.timing(swipeX, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }),
          Animated.timing(swipeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => handlePassInitiate());
      } else {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  }), [swipeX, swipeOpacity, handleAcceptInitiate, handlePassInitiate]);

  const handlePhotoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentPhotoIndex) { setCurrentPhotoIndex(index); selectionHaptic(); }
  }, [currentPhotoIndex]);

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
  const handlePassFeedbackSubmit = useCallback((feedbackId?: string) => { setShowPassFeedback(false); setPassFeedbackId(feedbackId); setShowRecommendModal(true); }, []);
  const handleRecommendToFriend = useCallback((friendId: string) => {
    setShowRecommendModal(false);
    setIsPassing(true);
    Alert.alert('Recommendation Sent!', 'Your friend will see this match in their recommendations.', [{ text: 'OK', onPress: () => { setIsPassing(false); navigation.navigate('MainTabs', { screen: 'Matches' }); } }]);
  }, [navigation]);

  const handleSkipRecommend = useCallback(async () => {
    setShowRecommendModal(false);
    setIsPassing(true);

    // Record pass in community service
    if (route.params?.proposalId) {
      try {
        await communityService.respondToMatchProposal(route.params.proposalId, false, {
          name: profile?.firstName || 'Unknown',
          photoUrl: profile?.photos?.[0]?.url,
        });
        logger.info('[MatchProposalScreen] Proposal passed:', route.params.proposalId);
      } catch (error) {
        logger.error('[MatchProposalScreen] Error passing proposal:', error);
      }
    }

    if (!isMountedRef.current) return;
    warningHaptic();
    // Clear any existing navigation timer
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }
    navigationTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsPassing(false);
      navigation.navigate('MainTabs', { screen: 'Matches' });
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

  const handleViewDeepQuestions = useCallback(() => { /* Deep Questions screen removed */ }, []);

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
        <Body className="mt-4 text-center" style={{ color: COLORS.neutral600 }}>Profile not found</Body>
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mt-4 px-6 py-3 rounded-full" style={{ backgroundColor: COLORS.primary500 }}>
          <Body className="font-semibold" style={{ color: COLORS.white }}>Go Back</Body>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  const photos = profile.photos || [];
  // Hash-based decorative score (70–99) seeded by proposal ID — see CLAUDE.md
  const communityScore = computeApprovalPercent(match?.id || '') / 100;
  const expiresAt = match?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const displayedQuestions = (profile.displayedQuestions || []).map(id => profile.deepQuestions?.find(q => q.questionId === id)).filter((q): q is DeepQuestionAnswer => q !== undefined).sort((a, b) => (a.tier || 0) - (b.tier || 0));
  const hasLifestyleInfo = profile.drinkingFrequency || profile.cannabisFrequency || profile.tobaccoFrequency || profile.otherDrugsFrequency;
  const basicInfoPills: Array<{ icon: string; text: string }> = [];
  if (profile.gender?.length) basicInfoPills.push({ icon: 'person', text: profile.gender.join(', ') });
  if (profile.pronounsList?.length) basicInfoPills.push({ icon: 'message-circle', text: profile.pronounsList.join('/') });
  if (profile.height) basicInfoPills.push({ icon: 'maximize', text: profile.height });
  if (profile.location) basicInfoPills.push({ icon: 'pin', text: profile.location });
  if (profile.ethnicity) basicInfoPills.push({ icon: 'globe', text: profile.ethnicity });
  if (profile.religion) basicInfoPills.push({ icon: 'star', text: profile.religion });
  if (profile.politicalLeaning) basicInfoPills.push({ icon: 'flag', text: formatFrequency(profile.politicalLeaning) || '' });

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="light-content" />

      {/* Swipe Indicators */}
      <Animated.View style={{ position: 'absolute', top: '33%', left: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [-100, 0], outputRange: [1.2, 0.8], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.error }}><EvaIcon name="close" variant="outline" size={32} color="white" /></StyledView>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: '33%', right: 32, zIndex: 40, opacity: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: swipeX.interpolate({ inputRange: [0, 100], outputRange: [0.8, 1.2], extrapolate: 'clamp' }) }] }}>
        <StyledView className="rounded-full p-4" style={{ backgroundColor: COLORS.success }}><EvaIcon name="heart" variant="outline" size={32} color="white" /></StyledView>
      </Animated.View>

      {/* Fixed Header */}
      <StyledView className="absolute z-50 flex-row items-center justify-between px-4" style={{ top: insets.top + 8, left: 0, right: 0 }}>
        <StyledTouchableOpacity onPress={() => { lightHaptic(); navigation.goBack(); }} className="rounded-full p-2.5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close proposal">
          <EvaIcon name="close" variant="outline" size={22} color="white" />
        </StyledTouchableOpacity>
        <StyledView className="flex-row items-center">
          <ExpirationTimer expiresAt={expiresAt} />
          <StyledTouchableOpacity onPress={handleOptionsMenu} className="rounded-full p-2.5 ml-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="More options">
            <EvaIcon name="more-vertical" variant="outline" size={18} color="white" />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Photo Section */}
        <View style={{ height: PHOTO_HEIGHT, backgroundColor: '#111' }}>
          {photos.length > 0 ? (
            <>
              <FlatList ref={flatListRef} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handlePhotoScroll} scrollEventThrottle={16} keyExtractor={(item, index) => item.id || `photo-${index}`} renderItem={({ item, index }) => <BlurredPhoto uri={item.url} style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }} index={index} />} />
              {photos.length > 1 && (
                <>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex > 0) { goToPhoto(currentPhotoIndex - 1); mediumHaptic(); } }}><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                  <TouchableWithoutFeedback onPress={() => { if (currentPhotoIndex < photos.length - 1) { goToPhoto(currentPhotoIndex + 1); mediumHaptic(); } }}><View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: TAP_ZONE_WIDTH }} /></TouchableWithoutFeedback>
                </>
              )}
              {photos.length > 1 && (
                <StyledView className="absolute left-5 right-5 flex-row" style={{ top: insets.top + 56 }}>
                  {photos.map((photo, index) => (
                    <StyledTouchableOpacity key={photo.id || `indicator-${index}`} onPress={() => goToPhoto(index)} className="flex-1 mx-1" activeOpacity={0.8}>
                      <StyledView className="h-1 rounded-full" style={{ backgroundColor: index === currentPhotoIndex ? COLORS.white : 'rgba(255, 255, 255, 0.4)' }} />
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              )}
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute top-0 left-0 right-0 h-32" pointerEvents="none" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} className="absolute bottom-0 left-0 right-0 h-44" pointerEvents="none" />
              <StyledView className="absolute bottom-10 left-5 right-5">
                <StyledView className="flex-row items-center flex-wrap mb-2">
                  <Body className="text-white font-bold" style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.5, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}>{getFirstInitial(profile.firstName)}, {profile.age}</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <EvaIcon name="shield" variant="outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Body className="ml-1.5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Full profile revealed after matching</Body>
                </StyledView>
              </StyledView>
            </>
          ) : (
            <StyledView className="flex-1 items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
              <StyledView className="w-32 h-32 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#262626' }}><EvaIcon name="camera" variant="outline" size={48} color="#525252" /></StyledView>
              <Body className="font-medium" style={{ color: COLORS.neutral500 }}>No photos available</Body>
            </StyledView>
          )}
        </View>

        {/* Content Section */}
        <StyledView className="bg-white px-5 pt-8 -mt-5" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <CommunityScore score={communityScore} endorsement={endorsement} />
          <WhyThisMatch mutualInterests={mutualInterests} mutualValues={mutualValues} compatibilityHighlights={compatibilityHighlights} />
          {basicInfoPills.length > 0 && <StyledView className="flex-row flex-wrap mb-6">{basicInfoPills.map((pill) => <InfoPill key={`${pill.icon}-${pill.text}`} icon={pill.icon} text={pill.text} />)}</StyledView>}
          {profile.interests?.length > 0 && <Section title="Interests" icon="heart" delay={50}><StyledView className="flex-row flex-wrap">{profile.interests.map((interest) => <Tag key={interest} label={interest} iconName={interestIconName(interest)} variant="primary" isMutual={mutualInterests.includes(interest)} />)}</StyledView></Section>}
          {profile.values?.length > 0 && <Section title="Values" icon="award" delay={100}><StyledView className="flex-row flex-wrap">{profile.values.map((value) => <Tag key={value} label={value} iconName={valueIconName(value)} variant="success" isMutual={mutualValues.includes(value)} />)}</StyledView></Section>}
          {(profile.hasChildren || profile.familyPlans) && (
            <Section title="Family" icon="people" delay={150}>
              <StyledView className="rounded-2xl p-4" style={{ backgroundColor: COLORS.neutral50 }}>
                {profile.hasChildren && <StyledView className="flex-row items-center mb-2.5"><EvaIcon name="people" variant="outline" size={17} color={COLORS.neutral400} /><Body className="ml-2.5" style={{ color: COLORS.neutral600 }}>{formatFrequency(profile.hasChildren)}</Body></StyledView>}
                {profile.familyPlans && <StyledView className="flex-row items-center"><EvaIcon name="heart" variant="outline" size={17} color={COLORS.neutral400} /><Body className="ml-2.5" style={{ color: COLORS.neutral600 }}>{formatFrequency(profile.familyPlans)}</Body></StyledView>}
              </StyledView>
            </Section>
          )}
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
                    <Body className="font-semibold mb-3" style={{ fontSize: 15, lineHeight: 22, color: COLORS.neutral800 }}>{qa.question}</Body>
                    <Body style={{ fontSize: 15, lineHeight: 24, color: COLORS.neutral600 }}>{qa.answer}</Body>
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
      <StyledView className="absolute bottom-0 left-0 right-0 bg-white" style={{ paddingBottom: insets.bottom + 8, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: COLORS.neutral200 }}>
        <StyledView className="flex-row" style={{ gap: 12 }}>
          <StyledTouchableOpacity onPress={handlePassInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center py-3.5" activeOpacity={0.8} style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.neutral300, borderRadius: 8, opacity: isPassing || isAccepting ? 0.6 : 1 }} accessibilityRole="button" accessibilityLabel={isPassing ? 'Passing on proposal' : 'Pass on proposal'} accessibilityState={{ disabled: isPassing || isAccepting }}>
            <EvaIcon name="close" variant="outline" size={18} color={COLORS.neutral600} />
            <Body style={{ color: COLORS.neutral600, fontWeight: '600', fontFamily: FONTS.semiBold, fontSize: 16, marginLeft: 8 }}>{isPassing ? 'Passing...' : 'Pass'}</Body>
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={handleAcceptInitiate} disabled={isPassing || isAccepting} className="flex-1 flex-row items-center justify-center py-3.5" activeOpacity={0.8} style={{ backgroundColor: COLORS.primary500, borderRadius: 8, opacity: isPassing || isAccepting ? 0.6 : 1, ...SHADOWS.sm }} accessibilityRole="button" accessibilityLabel={isAccepting ? 'Accepting proposal' : 'Accept proposal'} accessibilityState={{ disabled: isPassing || isAccepting }}>
            <EvaIcon name="heart" variant="outline" size={18} color="white" />
            <Body style={{ color: COLORS.white, fontWeight: '600', fontFamily: FONTS.semiBold, fontSize: 16, marginLeft: 8 }}>{isAccepting ? 'Accepting...' : 'Accept'}</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Modals */}
      <PassConfirmModal visible={showPassConfirm} onConfirm={handlePassConfirmed} onCancel={() => setShowPassConfirm(false)} />
      <PassFeedbackModal visible={showPassFeedback} onClose={() => handlePassFeedbackSubmit()} onSubmit={(id) => handlePassFeedbackSubmit(id)} />
      <RecommendToFriendModal visible={showRecommendModal} profileName={getFirstInitial(profile.firstName)} onClose={() => setShowRecommendModal(false)} onRecommend={handleRecommendToFriend} onSkip={handleSkipRecommend} navigation={navigation} />
      <CelebrationOverlay visible={showCelebration} recipientName={profile.firstName} onComplete={handleCelebrationComplete} />
    </View>
  );
};
