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

import { COLORS } from '../../../theme/colors';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  UIManager,
  Dimensions,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
// Confetti JSON is loaded lazily on first Yes vote — avoids parsing it at module init
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let confettiAnimSource: any = null;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

import { GuideTarget } from '../../guides';
import { CommunityTask } from '../../../types/community';
import { EvaIcon } from '../../icons';

// Extracted modules
import { proposalStyles, styles, BLUE } from './ProposalReviewView.styles';
import { useProposalVoting, useForFriendModal, useMatchData, useDeepQuestions } from './ProposalReviewView.hooks';
import {
  ProgressDots,
  VoteButtons,
  ForFriendModal,
  LifestyleBeliefsSection,
} from './ProposalReviewView.components';

// Sub-components
import { SectionCard, SmartPillCloudSection } from './SmartPillCloud';
import { ProposalPhotoCard, PHOTO_HEIGHT } from './ProposalPhotoCard';
import { getOptimizedPhotoUrl } from '../../../utils/imageUtils';
import { QuestionCarousel } from './QuestionCarousel';

/** "John Smith" → "J.S." — privacy-safe initials for voting screen */
function toInitials(first: string, last?: string | null): string {
  const f = (first || '?').charAt(0).toUpperCase();
  const l = (last || '').charAt(0).toUpperCase();
  return l ? `${f}.${l}.` : `${f}.`;
}
import { LiveVoteBar } from './LiveVoteBar';
import { BadgeComparisonSection } from '../../badges/BadgeComparisonSection';
import type { DeepQuestionData } from './proposalHelpers';
export type { DeepQuestionData } from './proposalHelpers';
import { Proposal } from '../../../types/community';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Layout constants ────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DIVIDER_WIDTH = 13;

// ─── Section accent spectrum ──────────────────────────────────────────────────
// Colors sweep the visible spectrum (cool → warm → violet) as sections appear
// in scroll order: Badges → Questions → Interests → Values → Lifestyle → Beliefs
const ACCENT_QUESTIONS = '#06B6D4'; // cyan
const ACCENT_INTERESTS = COLORS.emerald;
const ACCENT_VALUES    = '#D97706'; // deep amber — distinct from YellowPill border (#F59E0B)
const PHOTO_WIDTH = (SCREEN_WIDTH - 32 - DIVIDER_WIDTH) / 2;

const SCROLL_CONTENT_PAD_H = 16;

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProposalReviewViewProps {
  onVotesComplete?: () => void;
  taskProgress?: CommunityTask | null;
  goToPage?: (page: number) => void;
  isActive?: boolean;
  initialProposals?: Proposal[];
  showBackButton?: boolean;
  /** Controls gate-specific UI (banner + progress dots). Defaults to !showBackButton for backward compat. */
  isGateVoting?: boolean;
  onBack?: () => void;
  onVoteComplete?: () => void;
  deepQuestions?: DeepQuestionData[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProposalReviewView({
  onVotesComplete,
  taskProgress: _taskProgress,
  goToPage: _goToPage,
  isActive: _isActive = false,
  initialProposals,
  showBackButton = false,
  isGateVoting: isGateVotingProp,
  onBack,
  onVoteComplete,
  deepQuestions,
}: ProposalReviewViewProps) {
  const insets = useSafeAreaInsets();
  // Gate-specific UI (banner + progress dots) — defaults to !showBackButton for backward compat
  const isGateVoting = isGateVotingProp ?? !showBackButton;
  // Track whether the user has voted on the current proposal (for vote bar reveal)
  const [hasVotedCurrent, setHasVotedCurrent] = useState(false);
  // Proportional header spacing — ~0.5% of screen height above button, ~0.9% below
  const headerTopPadding = insets.top + Math.round(SCREEN_HEIGHT * 0.005);
  const headerBottomPadding = Math.round(SCREEN_HEIGHT * 0.009);

  const {
    proposals, currentIndex, loading, voting, voteFlashColor,
    scrollViewRef, isMountedRef,
    entranceAnimatedStyle, flashAnimatedStyle,
    yesButtonAnimatedStyle, noButtonAnimatedStyle,
    recommendButtonAnimatedStyle,
    recommendButtonScale,
    handleVote, advanceProposal, animateButtonPress,
  } = useProposalVoting(initialProposals, onVotesComplete, onBack, onVoteComplete);

  const {
    showForFriendModal, forFriendStep, selectedPersonSide,
    selectedFriendId, setSelectedFriendId, friendsList, loadingFriends,
    handleForFriendPress, handlePersonSelect, handleForFriendCancel, handleForFriendConfirm,
  } = useForFriendModal(
    voting, proposals, currentIndex, isMountedRef,
    animateButtonPress, recommendButtonScale, advanceProposal,
  );

  const matchData = useMatchData(proposals, currentIndex);

  // Fetch deep questions from DB when not provided as a prop (e.g. community gate voting)
  const fetchedDeepQuestions = useDeepQuestions(proposals, currentIndex);
  const resolvedDeepQuestions = deepQuestions ?? fetchedDeepQuestions;

  // ── Prefetch next proposal's images ──────────────────────────────────────
  useEffect(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= proposals.length) return;
    const next = proposals[nextIndex];
    const allPhotos = [
      ...(next.userA.photos || []),
      ...(next.userB.photos || []),
    ];
    let cancelled = false;
    for (const photo of allPhotos) {
      if (photo.url) {
        const optimized = getOptimizedPhotoUrl(photo.url, 'card');
        if (optimized) {
          RNImage.prefetch(optimized).catch(() => {
            // Ignore errors — prefetch is best-effort
          }).then(() => {
            // Ignore result if component unmounted before prefetch completed
            if (cancelled) return;
          }).catch(() => {});
        }
      }
    }
    return () => { cancelled = true; };
  }, [currentIndex, proposals]);

  // ── Confetti on Yes vote ──────────────────────────────────────────────────
  const confettiRef = useRef<LottieView>(null);
  const confettiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Clean up confetti timeout on unmount
  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    };
  }, []);

  const handleVoteWithEffects = useCallback(async (vote: 'yes' | 'no') => {
    if (vote === 'yes') {
      // Load confetti JSON once on first yes-vote, cache in module variable
      if (!confettiAnimSource) {
        confettiAnimSource = require('../../../../assets/Icons/AnimatedIcons/confetti.json');
      }
      setShowConfetti(true);
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 2500);
    }
    setHasVotedCurrent(true);
    await handleVote(vote);
  }, [handleVote]);

  // Reset vote state when advancing to next proposal
  useEffect(() => {
    setHasVotedCurrent(false);
  }, [currentIndex]);

  // Active dot pulse animation
  const dotPulse = useSharedValue(1);
  useEffect(() => {
    dotPulse.value = withSequence(
      withTiming(0.5, { duration: 0 }),
      withTiming(1, { duration: 400 }),
    );
  }, [currentIndex]);

  const activeDotStyle = useAnimatedStyle(() => ({
    opacity: dotPulse.value,
    transform: [{ scaleX: 0.85 + dotPulse.value * 0.15 }],
  }));

  // ── Loading skeleton — matches photo pair + section card layout ──────────
  if (loading) {
    return (
      <View style={proposalStyles.loadingContainer}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Photo pair skeleton */}
          <View style={{ flexDirection: 'row', gap: 13, marginBottom: 16 }}>
            <SkeletonLoader width={PHOTO_WIDTH} height={PHOTO_HEIGHT} borderRadius="rounded-2xl" />
            <SkeletonLoader width={PHOTO_WIDTH} height={PHOTO_HEIGHT} borderRadius="rounded-2xl" />
          </View>
          {/* Section card skeletons */}
          <SkeletonLoader width="100%" height={120} borderRadius="rounded-xl" className="mb-4" />
          <SkeletonLoader width="100%" height={100} borderRadius="rounded-xl" className="mb-4" />
          <SkeletonLoader width="100%" height={80} borderRadius="rounded-xl" />
        </View>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (proposals.length === 0 || currentIndex >= proposals.length) {
    return (
      <View style={proposalStyles.emptyContainer}>
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
    politicsResult, religionResult,
    drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
    beliefsResults, lifestyleResults,
    compatScore, valuesPillResult, interestsPillResult,
  } = matchData;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
      {isGateVoting && !loading && proposals.length > 0 && (
        <View style={proposalStyles.votingGateBanner}>
          <Text style={proposalStyles.votingGateText}>
            Vote on {proposals.length} proposal{proposals.length > 1 ? 's' : ''} to unlock the Friends Area
          </Text>
        </View>
      )}

      {/* Header row — back button for standalone, progress dots for gate, nothing for friend proposals */}
      {showBackButton ? (
        <View style={[proposalStyles.headerRow, { paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }]}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.heading} />
          </TouchableOpacity>
        </View>
      ) : isGateVoting ? (
        <View style={[proposalStyles.progressRow, { paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }]}>
          <View style={{ width: 40 }} />
          <View style={proposalStyles.progressDotsCenter}>
            <GuideTarget id="matching-gates">
              <ProgressDots
                proposals={proposals}
                currentIndex={currentIndex}
                activeDotStyle={activeDotStyle}
              />
            </GuideTarget>
          </View>
          <View style={{ width: 40 }} />
        </View>
      ) : null}

      {/* Scrollable content */}
      <Animated.View style={[{ flex: 1 }, entranceAnimatedStyle]}>
      <ScrollView
        ref={scrollViewRef}
        key={proposal.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCROLL_CONTENT_PAD_H, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile header ─────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ flexDirection: 'row' }}>
              <ProposalPhotoCard
                photos={userA.photos || []}
                name={`${userA.firstName} ${userA.lastName}`}
                age={userA.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="left"
                proposalId={proposal.id}
              />
              <View style={{ width: DIVIDER_WIDTH }} />
              <ProposalPhotoCard
                photos={userB.photos || []}
                name={`${userB.firstName} ${userB.lastName}`}
                age={userB.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="right"
                proposalId={proposal.id}
              />
            </View>

            {/* Compatibility badge */}
            <View style={styles.compatBadgeContainer}>
              <View style={styles.compatBadgePill}>
                <EvaIcon name="star" variant="outline" size={16} color={COLORS.card} />
                <Text style={styles.compatBadgeText}>{compatScore}%</Text>
              </View>
            </View>
          </View>

          {/* Friend suggestion banner */}
          {proposal.creationType === 'friend_proposal' && (
            <View style={styles.friendSuggestionBanner}>
              <EvaIcon name="people" variant="outline" size={14} color={COLORS.primaryAccent} />
              <Text style={styles.friendSuggestionText}>A friend suggested this match</Text>
            </View>
          )}

        </View>

        {/* ── Questions ─────────────────────────────────────────────── */}
        {resolvedDeepQuestions && resolvedDeepQuestions.length > 0 && (
          <SectionCard title="Questions" matched={undefined} total={undefined} accentColor={ACCENT_QUESTIONS}>
            <QuestionCarousel
              questions={resolvedDeepQuestions}
              userAName={`${userA.firstName} ${userA.lastName || ''}`}
              userBName={`${userB.firstName} ${userB.lastName || ''}`}
            />
          </SectionCard>
        )}

        {/* ── Interests ─────────────────────────────────────────────── */}
        {((userA.interests?.length ?? 0) > 0 || (userB.interests?.length ?? 0) > 0) && (
          <SectionCard
            title="Interests"
            percentBadge={interestsPillResult.percentMatch}
            accentColor={ACCENT_INTERESTS}
          >
            <SmartPillCloudSection
              pillResult={interestsPillResult}
              userAName={toInitials(userA.firstName, userA.lastName)}
              userBName={toInitials(userB.firstName, userB.lastName)}
            />
          </SectionCard>
        )}

        {/* ── Values ────────────────────────────────────────────────── */}
        {((userA.values?.length ?? 0) > 0 || (userB.values?.length ?? 0) > 0) && (
          <SectionCard
            title="Values"
            percentBadge={valuesPillResult.percentMatch}
            accentColor={ACCENT_VALUES}
          >
            <SmartPillCloudSection
              pillResult={valuesPillResult}
              userAName={toInitials(userA.firstName, userA.lastName)}
              userBName={toInitials(userB.firstName, userB.lastName)}
            />
          </SectionCard>
        )}

        {/* ── Lifestyle & Beliefs (merged) ─────────────────────────── */}
        <LifestyleBeliefsSection
          lifestyleResults={lifestyleResults}
          drinkResult={drinkResult}
          weedResult={weedResult}
          tobaccoResult={tobaccoResult}
          otherSubstancesResult={otherSubstancesResult}
          beliefsResults={beliefsResults}
          politicsResult={politicsResult}
          religionResult={religionResult}
        />

        {/* ── Friend Badges (last — least relevant to voting decision) ── */}
        <BadgeComparisonSection userAId={userA.userId} userBId={userB.userId} />

      </ScrollView>
      </Animated.View>

      {/* ── Vote bar — revealed after voting to prevent anchoring bias ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: COLORS.screenBackground }}>
        <LiveVoteBar
          yesVotes={hasVotedCurrent ? (proposal.yesVotes ?? 0) : 0}
          noVotes={hasVotedCurrent ? (proposal.noVotes ?? 0) : 0}
          totalVotes={hasVotedCurrent ? (proposal.totalVotes ?? 0) : 0}
          hasVoted={hasVotedCurrent}
        />
      </View>

      {/* ── Vote buttons — normal flow, scroll naturally ends above them ── */}
      <VoteButtons
        voting={voting}
        handleVote={handleVoteWithEffects}
        handleForFriendPress={handleForFriendPress}
        yesButtonAnimatedStyle={yesButtonAnimatedStyle}
        noButtonAnimatedStyle={noButtonAnimatedStyle}
        recommendButtonAnimatedStyle={recommendButtonAnimatedStyle}
        bottomInset={insets.bottom}
      />

      {/* ── For Friend Modal — only mounted when visible ────────────── */}
      {showForFriendModal && (
        <ForFriendModal
          visible={showForFriendModal}
          forFriendStep={forFriendStep}
          userA={userA}
          userB={userB}
          photoAUrl={photoA?.url}
          photoBUrl={photoB?.url}
          photoABlurhash={photoA?.blurhash}
          photoBBlurhash={photoB?.blurhash}
          proposalId={proposal.id}
          selectedPersonSide={selectedPersonSide}
          selectedFriendId={selectedFriendId}
          friendsList={friendsList}
          loadingFriends={loadingFriends}
          onPersonSelect={handlePersonSelect}
          onFriendSelect={setSelectedFriendId}
          onCancel={handleForFriendCancel}
          onConfirm={handleForFriendConfirm}
        />
      )}

      {/* Vote flash overlay */}
      {voteFlashColor && (
        <Animated.View
          style={[styles.voteFlashOverlay, { backgroundColor: voteFlashColor }, flashAnimatedStyle]}
        />
      )}

      {/* Confetti overlay on Yes vote */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LottieView
            ref={confettiRef}
            source={confettiAnimSource!}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

    </View>
  );
}

export default ProposalReviewView;
