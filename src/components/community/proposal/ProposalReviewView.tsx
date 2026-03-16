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
} from 'react-native';
import LottieView from 'lottie-react-native';
const CONFETTI_ANIM = require('../../../../assets/Icons/AnimatedIcons/confetti.json');
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
  LifestyleSection,
  BeliefsSection,
} from './ProposalReviewView.components';

// Sub-components
import { SectionCard, SmartPillCloudSection } from './SmartPillCloud';
import { ProposalPhotoCard, PHOTO_HEIGHT } from './ProposalPhotoCard';
import { QuestionCarousel } from './QuestionCarousel';
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
const DIVIDER_WIDTH = 13;
const PHOTO_WIDTH = (SCREEN_WIDTH - 32 - DIVIDER_WIDTH) / 2;

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
  taskProgress: _taskProgress,
  goToPage: _goToPage,
  isActive: _isActive = false,
  initialProposals,
  showBackButton = false,
  onBack,
  onVoteComplete,
  deepQuestions,
}: ProposalReviewViewProps) {
  const {
    proposals, currentIndex, loading, voting, voteFlashColor,
    scrollViewRef, isMountedRef,
    entranceAnimatedStyle, flashAnimatedStyle,
    yesButtonAnimatedStyle, noButtonAnimatedStyle,
    recommendButtonAnimatedStyle, unsureButtonAnimatedStyle,
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

  // ── Confetti on Yes vote ──────────────────────────────────────────────────
  const confettiRef = useRef<LottieView>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleVoteWithEffects = useCallback(async (vote: 'yes' | 'no' | 'unsure') => {
    if (vote === 'yes') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
    await handleVote(vote);
  }, [handleVote]);

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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={proposalStyles.loadingContainer}>
        <Text style={proposalStyles.loadingText}>Loading proposals...</Text>
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
    <View style={{ flex: 1, backgroundColor: COLORS.card }}>
      {!showBackButton && !loading && proposals.length > 0 && (
        <View style={proposalStyles.votingGateBanner}>
          <Text style={proposalStyles.votingGateText}>
            Vote on {proposals.length} proposal{proposals.length > 1 ? 's' : ''} to unlock the Friends Area
          </Text>
        </View>
      )}

      {/* Header row */}
      {showBackButton ? (
        <View style={proposalStyles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.heading} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={proposalStyles.progressRow}>
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

          {/* Live Vote Bar */}
          <View style={{ position: 'relative' }}>
            <LiveVoteBar
              yesVotes={proposal.yesVotes ?? 0}
              noVotes={proposal.noVotes ?? 0}
              totalVotes={proposal.totalVotes ?? 0}
            />
          </View>
        </View>

        {/* ── Friend Badges ─────────────────────────────────────────── */}
        <BadgeComparisonSection userAId={userA.userId} userBId={userB.userId} />

        {/* ── Questions ─────────────────────────────────────────────── */}
        {resolvedDeepQuestions && resolvedDeepQuestions.length > 0 && (
          <SectionCard title="Questions" matched={undefined} total={undefined} accentColor={COLORS.primary}>
            <QuestionCarousel
              questions={resolvedDeepQuestions}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Interests ─────────────────────────────────────────────── */}
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

        {/* ── Values ────────────────────────────────────────────────── */}
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

        {/* ── Lifestyle ─────────────────────────────────────────────── */}
        <LifestyleSection
          lifestyleResults={lifestyleResults}
          drinkResult={drinkResult}
          weedResult={weedResult}
          tobaccoResult={tobaccoResult}
          otherSubstancesResult={otherSubstancesResult}
        />

        {/* ── Beliefs ───────────────────────────────────────────────── */}
        <BeliefsSection
          beliefsResults={beliefsResults}
          politicsResult={politicsResult}
          religionResult={religionResult}
        />

      </ScrollView>
      </Animated.View>

      {/* ── Fixed bottom vote buttons ───────────────────────────────── */}
      <VoteButtons
        voting={voting}
        handleVote={handleVoteWithEffects}
        handleForFriendPress={handleForFriendPress}
        yesButtonAnimatedStyle={yesButtonAnimatedStyle}
        noButtonAnimatedStyle={noButtonAnimatedStyle}
        recommendButtonAnimatedStyle={recommendButtonAnimatedStyle}
        unsureButtonAnimatedStyle={unsureButtonAnimatedStyle}
      />

      {/* ── For Friend Modal ──────────────────────────────────────────── */}
      <ForFriendModal
        visible={showForFriendModal}
        forFriendStep={forFriendStep}
        userA={userA}
        userB={userB}
        photoAUrl={photoA?.url}
        photoBUrl={photoB?.url}
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
            source={CONFETTI_ANIM}
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
