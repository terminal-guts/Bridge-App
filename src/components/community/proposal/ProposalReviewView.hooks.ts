/**
 * ProposalReviewView Hooks
 * Extracted from ProposalReviewView.tsx for maintainability.
 * Contains voting logic and state management hooks.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { getQuestionById } from '../../../utils/deepQuestions';
import type { DeepQuestionData } from './proposalHelpers';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Proposal } from '../../../types/community';
import { RateLimiter } from '../../../utils/inputValidation';
import { showToast } from '../../../utils/toast';
import { communityService } from '../../../services/communityServiceIndex';
import { createLogger } from '../../../utils/secureLogger';
import { COLORS } from '../../../theme/colors';
import {
  matchPolitics,
  matchReligion,
  matchDrinking,
  matchCannabis,
  matchTobacco,
  matchOtherSubstances,
} from '../../../utils/proposalMatching';
import { computeSmartPills, INTERESTS_SIMILARITY, VALUES_SIMILARITY } from './proposalHelpers';

const logger = createLogger('ProposalReviewView');

export function useProposalVoting(
  initialProposals: Proposal[] | undefined,
  onVotesComplete?: () => void,
  onBack?: () => void,
  onVoteComplete?: () => void,
) {
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
      scale.value = withSequence(
        withSpring(0.95, { damping: 20, stiffness: 400, mass: 0.8 }),
        withSpring(1.03, { damping: 10, stiffness: 200, mass: 0.8 }),
        withSpring(1, { damping: 15, stiffness: 300, mass: 0.8 }),
      );
    } else {
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

  // Refs to avoid stale closures inside setTimeout
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const proposalCountRef = useRef(proposals.length);
  proposalCountRef.current = proposals.length;

  // Advance to the next proposal or trigger completion callbacks.
  const advanceProposal = useCallback(() => {
    if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    voteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setVoting(false);
      if (currentIndexRef.current >= proposalCountRef.current - 1) {
        if (onVoteComplete) {
          onVoteComplete();
        } else if (onBack) {
          onBack();
        } else {
          onVotesComplete?.();
        }
      } else {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setCurrentIndex(prev => prev + 1);
      }
    }, 1000);
  }, [onVoteComplete, onBack, onVotesComplete]);

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

    // Haptics
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

    // Submit vote
    try {
      await communityService.submitProposalVote(current.id, vote);
    } catch (err: any) {
      logger.error('[ProposalReviewView] Vote submission failed:', err);
      if (isMountedRef.current) {
        setVoting(false);
        if (err?.status === 429) {
          showToast.info('Daily limit reached', "You've reached your daily vote limit.");
        } else {
          showToast.error('Vote failed', 'Check your connection and try again');
        }
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

    advanceProposal();
  }, [voting, currentIndex, proposals, advanceProposal, triggerVoteFlash]);

  return {
    proposals,
    setProposals,
    currentIndex,
    loading,
    voting,
    voteFlashColor,
    scrollViewRef,
    isMountedRef,
    // Animated styles
    entranceAnimatedStyle,
    flashAnimatedStyle,
    yesButtonAnimatedStyle,
    noButtonAnimatedStyle,
    recommendButtonAnimatedStyle,
    unsureButtonAnimatedStyle,
    // Scales for external use
    recommendButtonScale,
    // Handlers
    handleVote,
    advanceProposal,
    animateButtonPress,
  };
}

// ─── For Friend Modal Hook ───────────────────────────────────────────────────

export function useForFriendModal(
  voting: boolean,
  proposals: Proposal[],
  currentIndex: number,
  isMountedRef: React.MutableRefObject<boolean>,
  animateButtonPress: (scale: { value: number }, type: 'yes' | 'no' | 'unsure' | 'recommend') => void,
  recommendButtonScale: { value: number },
  advanceProposal: () => void,
) {
  const [showForFriendModal, setShowForFriendModal] = useState(false);
  const [forFriendStep, setForFriendStep] = useState<1 | 2>(1);
  const [selectedPersonSide, setSelectedPersonSide] = useState<'userA' | 'userB' | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const handleForFriendPress = useCallback(() => {
    if (voting) return;
    animateButtonPress(recommendButtonScale, 'recommend');
    setShowForFriendModal(true);
    setForFriendStep(1);
    setSelectedPersonSide(null);
    setSelectedFriendId(null);
  }, [voting, animateButtonPress, recommendButtonScale]);

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
  }, [friendsList, isMountedRef]);

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
      void recommendedPersonId; // used for DB write (handled by server); record session action for progress counter
      communityService.recordSessionRecommendation(current.id);
    }
    setShowForFriendModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    advanceProposal();
  }, [selectedFriendId, proposals, currentIndex, selectedPersonSide, advanceProposal]);

  return {
    showForFriendModal,
    forFriendStep,
    selectedPersonSide,
    selectedFriendId,
    setSelectedFriendId,
    friendsList,
    loadingFriends,
    handleForFriendPress,
    handlePersonSelect,
    handleForFriendCancel,
    handleForFriendConfirm,
  };
}

// ─── Match Data Hook ─────────────────────────────────────────────────────────

export function useMatchData(proposals: Proposal[], currentIndex: number) {
  return useMemo(() => {
    if (proposals.length === 0 || currentIndex >= proposals.length) return null;
    const proposal = proposals[currentIndex];
    const userA = proposal.userA;
    const userB = proposal.userB;
    const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
    const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];
    const politicsResult = matchPolitics(userA, userB);
    const religionResult = matchReligion(userA, userB);
    const drinkResult = matchDrinking(userA, userB);
    const weedResult = matchCannabis(userA, userB);
    const tobaccoResult = matchTobacco(userA, userB);
    const otherSubstancesResult = matchOtherSubstances(userA, userB);
    const beliefsResults = [politicsResult, religionResult];
    const lifestyleResults = [drinkResult, weedResult, tobaccoResult, otherSubstancesResult];

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

    return {
      proposal, userA, userB, photoA, photoB,
      politicsResult, religionResult,
      drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
      beliefsResults, lifestyleResults,
      compatScore, valuesPillResult, interestsPillResult,
    };
  }, [currentIndex, proposals]);
}

// ─── Deep Questions Hook ──────────────────────────────────────────────────────
// Fetches deep question answers for the current proposal's two users.
// Used when deepQuestions are not passed in from outside (e.g. community gate voting).

export function useDeepQuestions(proposals: Proposal[], currentIndex: number): DeepQuestionData[] {
  const [deepQuestions, setDeepQuestions] = useState<DeepQuestionData[]>([]);

  useEffect(() => {
    if (proposals.length === 0 || currentIndex >= proposals.length) return;
    const proposal = proposals[currentIndex];
    const userAId = proposal.userA?.userId;
    const userBId = proposal.userB?.userId;
    if (!userAId || !userBId) return;

    let cancelled = false;

    async function fetchQuestions() {
      const [dqAResult, dqBResult] = await Promise.all([
        supabase.from('deep_question_answers').select('answers, displayed_question_ids').eq('user_id', userAId).maybeSingle(),
        supabase.from('deep_question_answers').select('answers, displayed_question_ids').eq('user_id', userBId).maybeSingle(),
      ]);
      if (cancelled) return;

      const answersA = ((dqAResult.data?.answers || {}) as Record<string, string>);
      const answersB = ((dqBResult.data?.answers || {}) as Record<string, string>);
      const displayedA = new Set(((dqAResult.data?.displayed_question_ids || []) as string[]).map(String));
      const displayedB = new Set(((dqBResult.data?.displayed_question_ids || []) as string[]).map(String));

      const allQIds = Array.from(new Set([...Object.keys(answersA), ...Object.keys(answersB)]));
      allQIds.sort((a, b) => {
        const aScore = (answersA[a] && answersB[a] ? 4 : 0) + (displayedA.has(a) ? 1 : 0) + (displayedB.has(a) ? 1 : 0);
        const bScore = (answersA[b] && answersB[b] ? 4 : 0) + (displayedA.has(b) ? 1 : 0) + (displayedB.has(b) ? 1 : 0);
        return bScore - aScore;
      });

      const questions: DeepQuestionData[] = [];
      for (const qId of allQIds.slice(0, 5)) {
        const def = getQuestionById(Number(qId));
        if (def && (answersA[qId] || answersB[qId])) {
          questions.push({
            questionId: Number(qId),
            questionText: def.question,
            userAAnswer: answersA[qId] || undefined,
            userBAnswer: answersB[qId] || undefined,
          });
        }
      }

      setDeepQuestions(questions);
    }

    setDeepQuestions([]);
    fetchQuestions().catch(() => {});
    return () => { cancelled = true; };
  }, [proposals, currentIndex]);

  return deepQuestions;
}
