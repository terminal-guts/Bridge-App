/**
 * ProposalReviewView Component
 *
 * Sequential proposal voting interface matching Figma design.
 *
 * Features:
 * - Shows ONE proposal per screen (sequential flow)
 * - Progress indicator (1 of 3, 2 of 3, 3 of 3)
 * - Split photo header with compatibility badge
 * - Live vote bar with animated counts
 * - Deep Questions section with card-reveal mechanic
 * - Smart pill matching for Interests & Values
 * - Section cards: Questions, Interests, Values, Lifestyle, Beliefs
 * - Vote buttons: Yes (primary) + No / For Friend / Not Sure (secondary)
 * - Auto-advances after each vote, navigates to Friends Area after 3rd vote
 */

import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { EmptyState } from '../../ui/EmptyState';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  UIManager,
  Dimensions,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { GuideTarget } from '../../guides';
import { UserProfile } from '../../../types';
import { Proposal, CommunityTask } from '../../../types/community';
import { MatchResult } from '../../../utils/proposalMatching';
import { RateLimiter } from '../../../utils/inputValidation';
import { showToast } from '../../../utils/toast';
import {
  matchAge,
  matchHeight,
  matchEthnicity,
  matchPolitics,
  matchReligion,
  matchDrinking,
  matchCannabis,
  matchTobacco,
  matchOtherSubstances,
  matchValues,
  matchInterests,
} from '../../../utils/proposalMatching';
import { communityService } from '../../../services/communityServiceIndex';
import { createLogger } from '../../../utils/secureLogger';
import { OVERLAYS } from '../../../theme/shadows';
import { getQuestionById } from '../../../utils/deepQuestions';
import { EvaIcon } from '../../icons';

// Sub-components (extracted)
import { countMatch, countKnown, computeSmartPills, INTERESTS_SIMILARITY, VALUES_SIMILARITY } from './proposalHelpers';
import type { DeepQuestionData, SmartPillResult } from './proposalHelpers';
export type { DeepQuestionData } from './proposalHelpers';
import { SectionCard, MatchIcon, ValueBox, ComparisonValueRow, EthnicityComparisonRow, SmartPillCloudSection } from './SmartPillCloud';
import { ProposalPhotoCard, PHOTO_HEIGHT, PHOTO_RADIUS } from './ProposalPhotoCard';
import { QuestionCarousel } from './QuestionCarousel';
import { LiveVoteBar } from './LiveVoteBar';
import { BadgeComparisonSection } from '../../badges/BadgeComparisonSection';

const logger = createLogger('ProposalReviewView');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Layout constants ────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const DIVIDER_WIDTH = 13;
const PHOTO_WIDTH = (SCREEN_WIDTH - 32 - DIVIDER_WIDTH) / 2;

// ─── Design tokens (aliased from theme) ──────────────────────────────────────
const BLUE = COLORS.primary;
const BOX_BG = 'rgba(1, 1, 1, 0.02)';
const BOX_BORDER = 'rgba(1, 1, 1, 0.04)';
const SCROLL_CONTENT_STYLE = { paddingHorizontal: 16, paddingBottom: 160 } as const;

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProposalReviewViewProps {
  onVotesComplete?: () => void;
  taskProgress?: CommunityTask | null;
  goToPage?: (page: number) => void;
  isActive?: boolean;
  initialProposals?: Proposal[];
  showBackButton?: boolean;
  onBack?: () => void;
  onVoteComplete?: () => void;
  deepQuestions?: DeepQuestionData[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProposalReviewView({
  onVotesComplete,
  taskProgress,
  goToPage,
  isActive = false,
  initialProposals,
  showBackButton = false,
  onBack,
  onVoteComplete,
  deepQuestions,
}: ProposalReviewViewProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialProposals);
  const [voting, setVoting] = useState(false);

  // Vote flash overlay
  const [voteFlashColor, setVoteFlashColor] = useState<string | null>(null);
  const flashOpacity = useSharedValue(0);

  // Entrance animation for new proposals
  const entranceOpacity = useSharedValue(1);
  const entranceTranslateX = useSharedValue(0);

  // Vote button micro-interaction scales
  const yesButtonScale = useSharedValue(1);
  const noButtonScale = useSharedValue(1);
  const recommendButtonScale = useSharedValue(1);
  const unsureButtonScale = useSharedValue(1);

  // ── Animated styles ────────────────────────────────────────────────────────
  const entranceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateX: entranceTranslateX.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const yesButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: yesButtonScale.value }],
  }));

  const noButtonAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: noButtonScale.value }],
  }));

  const recommendButtonAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: recommendButtonScale.value }],
  }));

  const unsureButtonAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: unsureButtonScale.value }],
  }));

  // For Friend modal state
  const [showForFriendModal, setShowForFriendModal] = useState(false);
  const [forFriendStep, setForFriendStep] = useState<1 | 2>(1);
  const [selectedPersonSide, setSelectedPersonSide] = useState<'userA' | 'userB' | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const rateLimiterRef = useRef(new RateLimiter());
  const isMountedRef = useRef(true);
  const voteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    };
  }, []);

  // Trigger entrance animation when advancing to a new proposal
  useEffect(() => {
    entranceOpacity.value = 0;
    entranceTranslateX.value = 30;
    entranceOpacity.value = withTiming(1, { duration: 250 });
    entranceTranslateX.value = withTiming(0, { duration: 250 });
  }, [currentIndex]);

  useEffect(() => {
    if (initialProposals) return; // skip fetch if proposals provided externally
    const load = async () => {
      try {
        setLoading(true);
        const result = await communityService.getProposalsToVote();
        if (isMountedRef.current) {
          setProposals(result);
        }
      } catch (error) {
        logger.error('[ProposalReviewView] Error loading proposals:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    load();
  }, []);

  // Vote button press animation
  const animateButtonPress = useCallback((scale: { value: number }, type: 'yes' | 'no' | 'unsure' | 'recommend') => {
    if (type === 'yes') {
      // Pulse up then settle
      scale.value = withSequence(
        withSpring(0.95, { damping: 20, stiffness: 400, mass: 0.8 }),
        withSpring(1.03, { damping: 10, stiffness: 200, mass: 0.8 }),
        withSpring(1, { damping: 15, stiffness: 300, mass: 0.8 }),
      );
    } else {
      // Quick press down and back
      scale.value = withSequence(
        withSpring(0.93, { damping: 20, stiffness: 400, mass: 0.8 }),
        withSpring(1, { damping: 12, stiffness: 300, mass: 0.8 }),
      );
    }
  }, []);

  // Vote flash overlay animation
  const triggerVoteFlash = useCallback((color: string) => {
    setVoteFlashColor(color);
    flashOpacity.value = withSequence(
      withTiming(0.5, { duration: 0 }),
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(setVoteFlashColor)(null);
      }),
    );
  }, []);

  // Advance to the next proposal or trigger completion callbacks.
  // Used by both handleVote and handleForFriendConfirm.
  const advanceProposal = useCallback(() => {
    if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    voteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setVoting(false);
      if (currentIndex >= proposals.length - 1) {
        // Single-proposal (friend) mode: go back; otherwise complete voting gate
        if (onVoteComplete) {
          onVoteComplete();
        } else if (onBack) {
          onBack();
        } else {
          setTimeout(() => onVotesComplete?.(), 500);
        }
      } else {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setCurrentIndex(prev => prev + 1);
      }
    }, 1000);
  }, [currentIndex, proposals.length, onVoteComplete, onBack, onVotesComplete]);

  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'unsure') => {
    if (voting || currentIndex >= proposals.length) return;
    const current = proposals[currentIndex];
    if (!current) return;

    if (!rateLimiterRef.current.isAllowed('vote', 20, 60000)) {
      showToast.info('Slow down!', 'Please wait a moment before voting again');
      return;
    }

    setVoting(true);

    // Button micro-interaction
    if (vote === 'yes') animateButtonPress(yesButtonScale, 'yes');
    else if (vote === 'no') animateButtonPress(noButtonScale, 'no');
    else animateButtonPress(unsureButtonScale, 'unsure');

    // Haptics — distinct feel per vote type, fire and forget
    if (vote === 'yes') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (vote === 'no') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Vote flash
    if (vote === 'yes') triggerVoteFlash(COLORS.emerald);
    else if (vote === 'no') triggerVoteFlash(COLORS.error);
    else triggerVoteFlash(COLORS.warning.icon);

    // Submit vote — wait for server confirmation before advancing
    try {
      await communityService.submitProposalVote(current.id, vote);
    } catch (err: any) {
      logger.error('[ProposalReviewView] Vote submission failed:', err);
      if (isMountedRef.current) {
        setVoting(false);
        showToast.error('Vote failed', 'Check your connection and try again');
      }
      return;
    }

    if (!isMountedRef.current) return;

    // Update local vote counts after confirmed
    setProposals(prev => prev.map((p, i) => {
      if (i !== currentIndex) return p;
      return {
        ...p,
        yesVotes: vote === 'yes' ? (p.yesVotes ?? 0) + 1 : (p.yesVotes ?? 0),
        noVotes: vote === 'no' ? (p.noVotes ?? 0) + 1 : (p.noVotes ?? 0),
        totalVotes: (p.totalVotes ?? 0) + 1,
      };
    }));

    // Advance after confirmed
    advanceProposal();
  }, [voting, currentIndex, proposals, advanceProposal, triggerVoteFlash]);

  // ── For Friend handlers ───────────────────────────────────────────────────
  const handleForFriendPress = useCallback(() => {
    if (voting) return;
    animateButtonPress(recommendButtonScale, 'recommend');
    setShowForFriendModal(true);
    setForFriendStep(1);
    setSelectedPersonSide(null);
    setSelectedFriendId(null);
  }, [voting]);

  const handlePersonSelect = useCallback(async (side: 'userA' | 'userB') => {
    setSelectedPersonSide(side);
    setForFriendStep(2);
    if (friendsList.length === 0) {
      setLoadingFriends(true);
      try {
        const data = await communityService.getFriendsAreaData();
        if (isMountedRef.current) {
          setFriendsList(data.friends);
        }
      } catch (err) {
        logger.error('[ProposalReviewView] Error loading friends for recommendation:', err);
      } finally {
        if (isMountedRef.current) {
          setLoadingFriends(false);
        }
      }
    }
  }, [friendsList]);

  const handleForFriendCancel = useCallback(() => {
    setShowForFriendModal(false);
    setForFriendStep(1);
    setSelectedPersonSide(null);
    setSelectedFriendId(null);
  }, []);

  const handleForFriendConfirm = useCallback(async () => {
    if (!selectedFriendId) return;
    const current = proposals[currentIndex];
    if (current) {
      const recommendedPersonId = selectedPersonSide === 'userA' ? current.userA.id : current.userB.id;

      logger.info('[ProposalReviewView] Friend recommendation submitted:', {
        proposalId: current.id,
        recommendedPersonId,
        toFriendId: selectedFriendId,
      });

      // Await recommendation so DB row exists before friends area queries
      try {
        await communityService.submitRecommendation(recommendedPersonId, selectedFriendId, current.id);
      } catch (err: any) {
        logger.error('[ProposalReviewView] Friend recommendation error:', err);
      }
    }
    setShowForFriendModal(false);
    // Haptics for recommendation confirmation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    // Advance to next proposal — recommendation counts as a completed action
    advanceProposal();
  }, [selectedFriendId, proposals, currentIndex, selectedPersonSide, advanceProposal]);

  // ── Match computations (memoized) ────────────────────────────────────────
  const matchData = useMemo(() => {
    if (proposals.length === 0 || currentIndex >= proposals.length) return null;
    const proposal = proposals[currentIndex];
    const userA = proposal.userA;
    const userB = proposal.userB;
    const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
    const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];
    const heightResult = matchHeight(userA, userB);
    const ethnicityResult = matchEthnicity(userA, userB);
    const politicsResult = matchPolitics(userA, userB);
    const religionResult = matchReligion(userA, userB);
    const drinkResult = matchDrinking(userA, userB);
    const weedResult = matchCannabis(userA, userB);
    const tobaccoResult = matchTobacco(userA, userB);
    const otherSubstancesResult = matchOtherSubstances(userA, userB);
    const valuesResult = matchValues(userA, userB);
    const interestsResult = matchInterests(userA, userB);
    const beliefsResults = [politicsResult, religionResult];
    const lifestyleResults = [drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const allResults = [heightResult, ethnicityResult, politicsResult, religionResult, drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const totalKnown = countKnown(allResults);
    const totalMatch = countMatch(allResults);

    // Compatibility score: display-only value, seeded by proposal ID for render stability.
    // This is intentionally decorative and has no connection to the matchmaking algorithm.
    const idHash = proposal.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const compatScore = 70 + (idHash % 30);

    // Smart pill matching for values & interests
    const valuesPillResult = computeSmartPills(
      userA.values || [],
      userB.values || [],
      VALUES_SIMILARITY,
    );
    const interestsPillResult = computeSmartPills(
      userA.interests || [],
      userB.interests || [],
      INTERESTS_SIMILARITY,
    );

    // x/4 tracker: 4 core compatibility dimensions — age, religion, politics, lifestyle(drinking)
    const coreResults = [
      matchAge(userA, userB),
      religionResult,
      politicsResult,
      drinkResult,
    ];
    const userATrackerCount = coreResults.filter(
      r => r.status === 'both_happy' || r.status === 'left_happy',
    ).length;
    const userBTrackerCount = coreResults.filter(
      r => r.status === 'both_happy' || r.status === 'right_happy',
    ).length;

    return {
      proposal, userA, userB, photoA, photoB,
      heightResult, ethnicityResult, politicsResult, religionResult,
      drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
      beliefsResults, lifestyleResults,
      compatScore, valuesPillResult, interestsPillResult,
      userATrackerCount, userBTrackerCount,
    };
  }, [currentIndex, proposals]);

  const progressDots = useMemo(() => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {proposals.map((_, i) => (
        <View
          key={`dot-${i}`}
          style={{
            height: 10,
            width: 40,
            borderRadius: 5,
            backgroundColor: i === currentIndex ? BLUE : i < currentIndex ? COLORS.primaryAccent : COLORS.tier1.bg,
          }}
        />
      ))}
      {proposals.length > 1 && (
        <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs, color: COLORS.text.disabled, marginLeft: 4 }}>
          {currentIndex + 1} of {proposals.length}
        </Text>
      )}
    </View>
  ), [proposals, currentIndex]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.card }}>
        <Text style={{ fontSize: FONT_SIZES.xl, color: COLORS.text.subtle, fontFamily: FONTS.regular }}>Loading proposals...</Text>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (proposals.length === 0 || currentIndex >= proposals.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: COLORS.card }}>
        <EmptyState
          variant="illustrated"
          icon={<EvaIcon name="heart" variant="outline" size={40} color={COLORS.primary} />}
          title="No proposals today"
          description="Check back tomorrow — your friends will propose new matches for you."
        />
      </View>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  if (!matchData) return null;
  const {
    proposal, userA, userB, photoA, photoB,
    heightResult, ethnicityResult, politicsResult, religionResult,
    drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
    beliefsResults, lifestyleResults,
    compatScore, valuesPillResult, interestsPillResult,
    userATrackerCount, userBTrackerCount,
  } = matchData;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.card }}>
      {!showBackButton && !loading && proposals.length > 0 && (
        <View style={{ backgroundColor: COLORS.backgroundBlueTint, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.md, color: COLORS.primaryButton, textAlign: 'center' }}>
            Vote on {proposals.length} proposal{proposals.length > 1 ? 's' : ''} to unlock the Friends Area
          </Text>
        </View>
      )}

      {/* Header row */}
      {showBackButton ? (
        // Friend proposal mode: back button only, no progress dots
        <View style={{
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.heading} />
          </TouchableOpacity>
        </View>
      ) : (
        // Community voting mode: centered progress dots, no back button
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <GuideTarget id="matching-gates">
              {progressDots}
            </GuideTarget>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Scrollable content */}
      <Animated.View style={[{ flex: 1 }, entranceAnimatedStyle]}>
      <ScrollView
        ref={scrollViewRef}
        key={proposal.id}
        style={{ flex: 1 }}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile header ─────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ position: 'relative' }}>
            {/* Two independent photo cards — no outer wrapper so each card
                clips its own corners at all 4 sides via overflow:hidden + borderRadius.
                borderRadius is also set directly on the Image style to ensure
                the native image layer is rounded independently. */}
            <View style={{ flexDirection: 'row' }}>

              {/* Left photo card */}
              <ProposalPhotoCard
                photos={userA.photos || []}
                name={userA.firstName}
                age={userA.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="left"
                proposalId={proposal.id}
              />

              {/* Gap between cards */}
              <View style={{ width: DIVIDER_WIDTH }} />

              {/* Right photo card */}
              <ProposalPhotoCard
                photos={userB.photos || []}
                name={userB.firstName}
                age={userB.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="right"
                proposalId={proposal.id}
              />
            </View>

            {/* Compatibility badge — centered between photos */}
            <View style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              alignItems: 'center',
              zIndex: 10,
              transform: [{ translateY: -18 }],
            }}>
              <View style={{
                backgroundColor: BLUE,
                borderRadius: 28,
                paddingHorizontal: 10,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 3,
                borderColor: COLORS.card,
              }}>
                <EvaIcon name="star" variant="outline" size={16} color={COLORS.card} />
                <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.xl, color: COLORS.card }}>
                  {compatScore}%
                </Text>
              </View>
            </View>
          </View>

          {/* Friend suggestion banner — anonymous, never reveals who suggested */}
          {proposal.creationType === 'friend_proposal' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 }}>
              <EvaIcon name="people" variant="outline" size={14} color={COLORS.primaryAccent} />
              <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.md, color: COLORS.primaryAccent }}>
                A friend suggested this match
              </Text>
            </View>
          )}

          {/* Live Vote Bar — replaces "Are they a match?" subtitle */}
          <View style={{ position: 'relative' }}>
            <LiveVoteBar
              yesVotes={proposal.yesVotes ?? 0}
              noVotes={proposal.noVotes ?? 0}
              totalVotes={proposal.totalVotes ?? 0}
            />

          </View>
        </View>

        {/* ── Friend Badges (side-by-side comparison) ─────────────── */}
        <BadgeComparisonSection
          userAId={userA.userId}
          userBId={userB.userId}
        />

        {/* ── Questions (Deep Questions with card reveal) ─────────────── */}
        {deepQuestions && deepQuestions.length > 0 && (
          <SectionCard title="Questions" matched={undefined} total={undefined} accentColor={COLORS.primary}>
            <QuestionCarousel
              questions={deepQuestions}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Interests (Smart Pills) ─────────────────────────────────── */}
        {((userA.interests?.length ?? 0) > 0 || (userB.interests?.length ?? 0) > 0) && (
          <SectionCard
            title="Interests"
            percentBadge={interestsPillResult.percentMatch}
            accentColor={COLORS.emerald}
          >
            <SmartPillCloudSection
              pillResult={interestsPillResult}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Values (Smart Pills) ────────────────────────────────────── */}
        {((userA.values?.length ?? 0) > 0 || (userB.values?.length ?? 0) > 0) && (
          <SectionCard
            title="Values"
            percentBadge={valuesPillResult.percentMatch}
            accentColor={COLORS.purple}
          >
            <SmartPillCloudSection
              pillResult={valuesPillResult}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Lifestyle ──────────────────────────────────────────────── */}
        <SectionCard
          title="Lifestyle"
          matched={countMatch(lifestyleResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(lifestyleResults)}
          accentColor={COLORS.warning.icon}
        >
          {drinkResult.status !== 'unknown' && (
            <ComparisonValueRow result={drinkResult} label="Drink" />
          )}
          {weedResult.status !== 'unknown' && (
            <ComparisonValueRow result={weedResult} label="Weed" />
          )}
          {tobaccoResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ValueBox label="Tobacco" value={tobaccoResult.leftValue} />
              <MatchIcon status={tobaccoResult.status} />
              <ValueBox label="Tobacco" value={tobaccoResult.rightValue} />
            </View>
          )}
          {otherSubstancesResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ValueBox label="Other Substances" value={otherSubstancesResult.leftValue} />
              <MatchIcon status={otherSubstancesResult.status} />
              <ValueBox label="Other Substances" value={otherSubstancesResult.rightValue} />
            </View>
          )}
        </SectionCard>

        {/* ── Beliefs ────────────────────────────────────────────────── */}
        <SectionCard
          title="Beliefs"
          matched={countMatch(beliefsResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(beliefsResults)}
          accentColor={COLORS.primary}
        >
          {politicsResult.status !== 'unknown' && (
            <ComparisonValueRow result={politicsResult} label="Politics" />
          )}
          {religionResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ValueBox label="Religion" value={religionResult.leftValue} />
              <MatchIcon status={religionResult.status} />
              <ValueBox label="Religion" value={religionResult.rightValue} />
            </View>
          )}
        </SectionCard>

      </ScrollView>
      </Animated.View>

      {/* ── Fixed bottom vote buttons ───────────────────────────────── */}
      <View style={styles.voteContainer}>
        {/* Yes button — primary action, largest touch target */}
        <Animated.View style={yesButtonAnimatedStyle}>
          <TouchableOpacity
            onPress={() => handleVote('yes')}
            disabled={voting}
            activeOpacity={0.85}
            style={{
              backgroundColor: voting ? COLORS.tier1.border : BLUE,
              borderRadius: 12,
              height: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              shadowColor: BLUE,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: voting ? 0 : 0.3,
              shadowRadius: 8,
              elevation: voting ? 0 : 4,
            }}
          >
            <EvaIcon name="checkmark" variant="outline" size={20} color={COLORS.card} />
            <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.xl, color: COLORS.card }}>Yes</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* No / Recommend / Not Sure — secondary row, horizontal layout */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* No */}
          <Animated.View style={noButtonAnimatedStyle}>
            <TouchableOpacity
              onPress={() => handleVote('no')}
              disabled={voting}
              activeOpacity={0.8}
              style={styles.secondaryButton}
            >
              <EvaIcon name="close" variant="outline" size={16} color={COLORS.navInactiveIcon} />
              <Text style={styles.secondaryButtonText}>No</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Recommend */}
          <Animated.View style={recommendButtonAnimatedStyle}>
            <TouchableOpacity
              onPress={handleForFriendPress}
              disabled={voting}
              activeOpacity={0.8}
              style={styles.secondaryButton}
            >
              <EvaIcon name="person-add" variant="outline" size={16} color={COLORS.navInactiveIcon} />
              <Text style={styles.secondaryButtonText}>Recommend</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Not Sure */}
          <Animated.View style={unsureButtonAnimatedStyle}>
            <TouchableOpacity
              onPress={() => handleVote('unsure')}
              disabled={voting}
              activeOpacity={0.8}
              style={styles.secondaryButton}
          >
            <EvaIcon name="info" variant="outline" size={16} color={COLORS.navInactiveIcon} />
            <Text style={styles.secondaryButtonText}>Not Sure</Text>
          </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* ── For Friend Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showForFriendModal}
        transparent
        animationType="fade"
        onRequestClose={handleForFriendCancel}
      >
        <View style={{
          ...styles.modalOverlay,
          backgroundColor: OVERLAYS.medium,
        }}>
          <View style={styles.modalCard}>

            {forFriendStep === 1 ? (
              /* ── Step 1: Pick which person to recommend ── */
              <View style={{ padding: 24 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES['3xl'], color: COLORS.text.black, textAlign: 'center', marginBottom: 6 }}>
                  Recommend
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, color: COLORS.text.black, opacity: 0.6, textAlign: 'center', marginBottom: 20 }}>
                  Who would you like to recommend?
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* UserA card */}
                  <TouchableOpacity
                    onPress={() => handlePersonSelect('userA')}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 180 }}
                  >
                    <Image
                      source={{ uri: photoA?.url || 'https://via.placeholder.com/200' }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="disk"
                      recyclingKey={`${proposal.id}-modal-a`}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, color: COLORS.card }}>
                        {userA.firstName}
                      </Text>
                      {userA.age ? (
                        <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: COLORS.card, opacity: 0.85 }}>
                          {userA.age} yrs
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  {/* UserB card */}
                  <TouchableOpacity
                    onPress={() => handlePersonSelect('userB')}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 180 }}
                  >
                    <Image
                      source={{ uri: photoB?.url || 'https://via.placeholder.com/200' }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="disk"
                      recyclingKey={`${proposal.id}-modal-b`}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.xl, color: COLORS.card }}>
                        {userB.firstName}
                      </Text>
                      {userB.age ? (
                        <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: COLORS.card, opacity: 0.85 }}>
                          {userB.age} yrs
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleForFriendCancel}
                  style={{ marginTop: 16, alignItems: 'center', paddingVertical: 12 }}
                >
                  <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.lg, color: COLORS.text.black, opacity: 0.6 }}>Cancel</Text>
                </TouchableOpacity>
              </View>

            ) : (
              /* ── Step 2: Pick a friend ── */
              <View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES['3xl'], color: COLORS.text.black, textAlign: 'center', marginBottom: 6 }}>
                    Send to a Friend
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.base, color: COLORS.text.black, opacity: 0.6, textAlign: 'center' }}>
                    Recommend {selectedPersonSide === 'userA' ? userA.firstName : userB.firstName} to...
                  </Text>
                </View>

                {loadingFriends ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={BLUE} />
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 280 }}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {friendsList.filter(item => {
                      // Don't show the recommended person in the friend list (can't recommend someone to themselves)
                      const recPersonId = selectedPersonSide === 'userA' ? proposal.userA.id : proposal.userB.id;
                      return item.friendId !== recPersonId;
                    }).map(item => {
                      const isSelected = selectedFriendId === item.friendId;
                      const friendPhoto = item.friend?.photos?.[0]?.url;
                      return (
                        <TouchableOpacity
                          key={item.friendId}
                          onPress={() => setSelectedFriendId(item.friendId)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.07)' : BOX_BG,
                            borderWidth: 1,
                            borderColor: isSelected ? BLUE : BOX_BORDER,
                          }}
                        >
                          <Image
                            source={{ uri: friendPhoto || 'https://via.placeholder.com/50' }}
                            style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="disk"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.lg, color: COLORS.text.black }}>
                              {item.friend?.firstName}
                            </Text>
                            {item.friend?.currentJob ? (
                              <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.md, color: COLORS.text.black, opacity: 0.55 }} numberOfLines={1}>
                                {item.friend.currentJob}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected && (
                            <View style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: BLUE,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <EvaIcon name="checkmark" variant="outline" size={14} color={COLORS.card} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Cancel / Confirm */}
                <View style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 24,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.borderLight,
                  marginTop: 8,
                }}>
                  <TouchableOpacity
                    onPress={handleForFriendCancel}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: BOX_BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: BOX_BG,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.lg, color: COLORS.text.black, opacity: 0.7 }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleForFriendConfirm}
                    disabled={!selectedFriendId}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: selectedFriendId ? BLUE : COLORS.tier1.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.lg, color: COLORS.card }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* Vote flash overlay */}
      {voteFlashColor && (
        <Animated.View
          style={[{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: voteFlashColor,
            pointerEvents: 'none',
            zIndex: 9998,
          }, flashAnimatedStyle]}
        />
      )}


    </View>
  );
}

// ─── Static styles (extracted from inline to avoid re-creation) ──────────────
const styles = StyleSheet.create({
  // Badge styles (MatchBadge, PercentBadge)
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.sm,
  },

  // SectionCard
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
  },

  // ValueBox
  valueBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(1, 1, 1, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center' as const,
  },
  valueBoxLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.label,
    marginBottom: 2,
  },
  valueBoxText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.black,
    textAlign: 'center' as const,
  },

  // Vote button container
  voteContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },

  // Secondary vote button
  secondaryButton: {
    height: 48,
    backgroundColor: BOX_BG,
    borderWidth: 1,
    borderColor: BOX_BORDER,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  secondaryButtonText: {
    fontFamily: FONTS.medium,
    fontWeight: '500' as const,
    fontSize: FONT_SIZES.md,
    color: COLORS.navInactiveIcon,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: '100%' as const,
    overflow: 'hidden' as const,
  },
});

export default ProposalReviewView;
