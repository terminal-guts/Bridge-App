/**
 * ProposalReviewView Component
 *
 * Sequential proposal voting interface matching Figma design.
 *
 * Features:
 * - Shows ONE proposal per screen (sequential flow)
 * - Progress indicator (1 of 3, 2 of 3, 3 of 3)
 * - Split photo header with compatibility badge
 * - Section cards: Basic, Ethnicity, Beliefs, Lifestyle, Values, Interests
 * - Vote buttons: Yes (primary) + No / For Friend / Not Sure (secondary)
 * - Auto-advances after each vote, navigates to Friends Area after 3rd vote
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  Platform,
  UIManager,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../types';
import { Proposal, CommunityTask } from '../../types/community';
import { MatchResult, MatchStatus } from '../../utils/proposalMatching';
import { RateLimiter } from '../../utils/inputValidation';
import { showToast } from '../../utils/toast';
import {
  matchAge,
  matchHeight,
  matchDatingDistance,
  matchEthnicity,
  matchPolitics,
  matchReligion,
  matchDrinking,
  matchCannabis,
  matchTobacco,
  matchOtherSubstances,
  matchValues,
  matchInterests,
} from '../../utils/proposalMatching';
import { communityService } from '../../services/communityServiceIndex';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ProposalReviewView');

// ─── Pure helpers (no component state) ────────────────────────────────────────
const countMatch = (results: MatchResult[]) =>
  results.filter(r => r.status === 'both_happy').length;
const countKnown = (results: MatchResult[]) =>
  results.filter(r => r.status !== 'unknown').length;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const DIVIDER_WIDTH = 13;
const PHOTO_WIDTH = (SCREEN_WIDTH - 32 - DIVIDER_WIDTH) / 2;
const PHOTO_HEIGHT = 300;
const PHOTO_RADIUS = 16;

// ─── Design tokens ────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const GREEN = '#34C759';
const RED = '#FF383C';
const AMBER = '#FFCC00';
const GREEN_BG = 'rgba(52, 199, 89, 0.1)';
const RED_BG = 'rgba(255, 56, 60, 0.1)';
const AMBER_BG = 'rgba(255, 204, 0, 0.1)';
const BOX_BG = 'rgba(1, 1, 1, 0.02)';
const BOX_BORDER = 'rgba(1, 1, 1, 0.04)';
const CARD_BORDER = 'rgba(1, 1, 1, 0.1)';
const SCROLL_CONTENT_STYLE = { paddingHorizontal: 16, paddingBottom: 160 } as const;
const TAG_BG = 'rgba(1, 1, 1, 0.02)';

// ─── Helper: icon for match status ────────────────────────────────────────────
function MatchIcon({ status }: { status: MatchStatus }) {
  if (status === 'both_happy') {
    return <Ionicons name="checkmark" size={20} color={GREEN} />;
  }
  if (status === 'neither_happy') {
    return <Ionicons name="close" size={20} color={RED} />;
  }
  if (status === 'left_happy' || status === 'right_happy') {
    return <Ionicons name="warning" size={18} color="#FFA629" />;
  }
  return null;
}

// ─── Helper: badge for section match score ─────────────────────────────────────
const MatchBadge = React.memo(function MatchBadge({ matched, total }: { matched: number; total: number }) {
  const allMatch = matched === total;
  const noneMatch = matched === 0;
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN : noneMatch ? RED : AMBER;
  const label = total === 1
    ? allMatch ? 'Match' : 'No Match'
    : `${matched}/${total} Match`;

  return (
    <View style={{
      backgroundColor: bg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    }}>
      <Text style={{
        fontFamily: 'Outfit_500Medium',
        fontWeight: '500',
        fontSize: 12,
        color,
      }}>
        {label}
      </Text>
    </View>
  );
});

// ─── Helper: section card wrapper ─────────────────────────────────────────────
const SectionCard = React.memo(function SectionCard({
  title,
  matched,
  total,
  children,
}: {
  title: string;
  matched: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      padding: 12,
      marginBottom: 16,
    }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 16, color: BLUE }}>{title}</Text>
        <MatchBadge matched={matched} total={total} />
      </View>
      {children}
    </View>
  );
});

// ─── Helper: value box (138px, shows label + value) ───────────────────────────
function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      height: 58,
      backgroundColor: BOX_BG,
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 12,
      padding: 10,
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontFamily: 'Outfit_400Regular', fontWeight: '400', fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontWeight: '600', fontSize: 15, color: '#010101' }} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── Helper: single comparison row (value + icon + value) ─────────────────────
function ComparisonValueRow({ result, label }: { result: MatchResult; label: string }) {
  if (result.status === 'unknown') return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <ValueBox label={label} value={result.leftValue} />
      <MatchIcon status={result.status} />
      <ValueBox label={label} value={result.rightValue} />
    </View>
  );
}

// ─── Helper: tag pill ─────────────────────────────────────────────────────────
function TagPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: TAG_BG,
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
    }}>
      <Text style={{ fontFamily: 'Outfit_500Medium', fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.85 }}>{label}</Text>
    </View>
  );
}

// ─── Helper: ethnicity comparison row (tag pills + icon + tag pills) ───────────
function EthnicityComparisonRow({ result }: { result: MatchResult }) {
  if (result.status === 'unknown') return null;
  const leftTags = result.leftValue ? [result.leftValue] : [];
  const rightTags = result.rightValue ? [result.rightValue] : [];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {leftTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
      <MatchIcon status={result.status} />
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {rightTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

// ─── Helper: tag cloud section (Left label + tags, Right label + tags) ──────────
function TagCloudSection({ leftTags, rightTags }: { leftTags: string[]; rightTags: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: 'Outfit_400Regular', fontWeight: '400', fontSize: 14, color: '#010101', opacity: 0.6 }}>Left</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {leftTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
      <Text style={{ fontFamily: 'Outfit_400Regular', fontWeight: '400', fontSize: 14, color: '#010101', opacity: 0.6 }}>Right</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {rightTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

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
}: ProposalReviewViewProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialProposals);
  const [voting, setVoting] = useState(false);

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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    };
  }, []);

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
        setCurrentIndex(prev => prev + 1);
      }
    }, 300);
  }, [currentIndex, proposals.length, onVoteComplete, onBack, onVotesComplete]);

  const handleVote = useCallback((vote: 'yes' | 'no' | 'skip') => {
    if (voting || currentIndex >= proposals.length) return;
    const current = proposals[currentIndex];
    if (!current) return;

    if (!rateLimiterRef.current.isAllowed('vote', 10, 60000)) {
      showToast.info('Slow down!', 'Please wait a moment before voting again');
      return;
    }

    setVoting(true);

    // Haptics — fire and forget, never block navigation
    if (vote === 'yes') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Submit vote — fire and forget, navigation never depends on this succeeding
    communityService.submitProposalVote(current.id, vote).catch((err: any) => {
      logger.error('[ProposalReviewView] Vote submission error (non-blocking):', err);
    });

    // Always advance after a short delay
    advanceProposal();
  }, [voting, currentIndex, proposals, advanceProposal]);

  // ── For Friend handlers ───────────────────────────────────────────────────
  const handleForFriendPress = useCallback(() => {
    if (voting) return;
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

  const handleForFriendConfirm = useCallback(() => {
    if (!selectedFriendId) return;
    const current = proposals[currentIndex];
    if (current) {
      const recommendedPersonId = selectedPersonSide === 'userA' ? current.userA.id : current.userB.id;

      // Derive karma weight from the selected friend's assist count.
      // Higher-karma friends have stronger rec weight in the matching algorithm.
      // Tiers: new=1.0, solid=1.15, trusted=1.35, elite=1.60
      const selectedFriend = friendsList.find((f: any) => f.friendId === selectedFriendId);
      const friendAssists: number =
        selectedFriend?.assistsCount ?? selectedFriend?.karmaScore?.totalAssists ?? 0;
      let friendKarmaWeight = 1.0;
      if (friendAssists >= 25) friendKarmaWeight = 1.60;
      else if (friendAssists >= 10) friendKarmaWeight = 1.35;
      else if (friendAssists >= 3) friendKarmaWeight = 1.15;

      logger.info('[ProposalReviewView] Friend recommendation submitted:', {
        proposalId: current.id,
        recommendedPersonId,
        toFriendId: selectedFriendId,
        friendAssists,
        friendKarmaWeight,
      });

      // Submit a 'yes' vote weighted by the recommending friend's karma tier.
      // This ensures a Trusted Matchmaker's rec counts more than a New Matchmaker's.
      communityService.submitProposalVote(current.id, 'yes', friendKarmaWeight).catch((err: any) => {
        logger.error('[ProposalReviewView] Friend rec vote submission error:', err);
      });
    }
    setShowForFriendModal(false);
    setVoting(true);
    // Haptics for recommendation confirmation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Advance without double-counting — the karma-weighted 'yes' above already counts
    // toward the voting gate (votesSubmitted++), so we advance UI-only here.
    advanceProposal();
  }, [selectedFriendId, friendsList, proposals, currentIndex, selectedPersonSide, advanceProposal]);

  // ── Match computations (memoized) ────────────────────────────────────────
  const matchData = useMemo(() => {
    if (proposals.length === 0 || currentIndex >= proposals.length) return null;
    const proposal = proposals[currentIndex];
    const userA = proposal.userA;
    const userB = proposal.userB;
    const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
    const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];
    const actualDistance = 10;
    const heightResult = matchHeight(userA, userB);
    const distanceResult = matchDatingDistance(userA, userB, actualDistance);
    const ethnicityResult = matchEthnicity(userA, userB);
    const politicsResult = matchPolitics(userA, userB);
    const religionResult = matchReligion(userA, userB);
    const drinkResult = matchDrinking(userA, userB);
    const weedResult = matchCannabis(userA, userB);
    const tobaccoResult = matchTobacco(userA, userB);
    const otherSubstancesResult = matchOtherSubstances(userA, userB);
    const valuesResult = matchValues(userA, userB);
    const interestsResult = matchInterests(userA, userB);
    const basicResults = [heightResult, distanceResult];
    const beliefsResults = [politicsResult, religionResult];
    const lifestyleResults = [drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const allResults = [heightResult, ethnicityResult, politicsResult, religionResult, drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const totalKnown = countKnown(allResults);
    const totalMatch = countMatch(allResults);

    // Compatibility score: use real vote data when available (yesVotes/totalVotes),
    // fall back to preference-based score when no votes have been cast yet.
    const hasVotes = (proposal.totalVotes ?? 0) > 0;
    const compatScore = hasVotes
      ? Math.round(((proposal.yesVotes ?? 0) / (proposal.totalVotes ?? 1)) * 100)
      : totalKnown > 0
      ? Math.round((totalMatch / totalKnown) * 100)
      : 0;

    const valuesMatchCount = (valuesResult as any).sharedValues?.length || 0;
    const valuesTotal = Math.max((userA.values || []).length, (userB.values || []).length, 1);
    const interestsMatchCount = (interestsResult as any).sharedInterests?.length || 0;
    const interestsTotal = Math.max((userA.interests || []).length, (userB.interests || []).length, 1);

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
      heightResult, distanceResult, ethnicityResult, politicsResult, religionResult,
      drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
      basicResults, beliefsResults, lifestyleResults,
      compatScore, valuesMatchCount, valuesTotal, interestsMatchCount, interestsTotal,
      userATrackerCount, userBTrackerCount,
    };
  }, [currentIndex, proposals]);

  const progressDots = useMemo(() =>
    proposals.map((_, i) => (
      <View
        key={`dot-${i}`}
        style={{
          height: 8,
          width: 40,
          borderRadius: 4,
          marginHorizontal: 6,
          backgroundColor: i === currentIndex ? BLUE : i < currentIndex ? '#93C5FD' : '#DBEAFE',
        }}
      />
    )),
    [proposals, currentIndex],
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <Text style={{ fontSize: 16, color: '#78716C', fontFamily: 'Outfit_400Regular' }}>Loading proposals...</Text>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (proposals.length === 0 || currentIndex >= proposals.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 20, fontFamily: 'Outfit_600SemiBold', color: '#010101', marginBottom: 8, textAlign: 'center' }}>
          All Caught Up!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#78716C', textAlign: 'center' }}>
          No more proposals to review. Check back later!
        </Text>
      </View>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  if (!matchData) return null;
  const {
    proposal, userA, userB, photoA, photoB,
    heightResult, distanceResult, ethnicityResult, politicsResult, religionResult,
    drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
    basicResults, beliefsResults, lifestyleResults,
    compatScore, valuesMatchCount, valuesTotal, interestsMatchCount, interestsTotal,
    userATrackerCount, userBTrackerCount,
  } = matchData;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>

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
            <Ionicons name="arrow-back" size={24} color="#010101" />
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
            {progressDots}
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
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

              {/* Left photo card — outer corners rounded, inner edge straight */}
              <View style={{
                width: PHOTO_WIDTH,
                height: PHOTO_HEIGHT,
                borderTopLeftRadius: PHOTO_RADIUS,
                borderBottomLeftRadius: PHOTO_RADIUS,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                overflow: 'hidden',
              }}>
                <Image
                  source={{ uri: photoA?.url || 'https://via.placeholder.com/200' }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: PHOTO_RADIUS, borderBottomLeftRadius: PHOTO_RADIUS }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
                  locations={[0.45, 0.75, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }}
                />
                <View style={{ position: 'absolute', bottom: 14, left: 14 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 28, color: '#FFF', letterSpacing: -0.3 }}>
                    {userA.firstName}, {userA.age}
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontWeight: '400', fontSize: 14, color: '#FFF', opacity: 0.85 }}>
                    {userA.currentJob || ''}
                  </Text>
                </View>
              </View>

              {/* Gap between cards */}
              <View style={{ width: DIVIDER_WIDTH }} />

              {/* Right photo card — outer corners rounded, inner edge straight */}
              <View style={{
                width: PHOTO_WIDTH,
                height: PHOTO_HEIGHT,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderTopRightRadius: PHOTO_RADIUS,
                borderBottomRightRadius: PHOTO_RADIUS,
                overflow: 'hidden',
              }}>
                <Image
                  source={{ uri: photoB?.url || 'https://via.placeholder.com/200' }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTopRightRadius: PHOTO_RADIUS, borderBottomRightRadius: PHOTO_RADIUS }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
                  locations={[0.45, 0.75, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }}
                />
                <View style={{ position: 'absolute', bottom: 14, left: 14 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 28, color: '#FFF', letterSpacing: -0.3 }}>
                    {userB.firstName}, {userB.age}
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontWeight: '400', fontSize: 14, color: '#FFF', opacity: 0.85 }}>
                    {userB.currentJob || ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Compatibility badge — centered between photos */}
            <View style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              alignItems: 'center',
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
                borderColor: '#FFFFFF',
              }}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontWeight: '600', fontSize: 16, color: '#FFFFFF' }}>
                  {compatScore} %
                </Text>
              </View>
            </View>
          </View>

          {/* "Are they a match?" subtitle */}
          <Text style={{
            fontFamily: 'Outfit_400Regular',
            fontWeight: '400',
            fontSize: 15,
            color: '#010101',
            opacity: 0.6,
            textAlign: 'center',
            marginTop: 12,
          }}>
            Are they a match?
          </Text>
        </View>

        {/* ── Basic ──────────────────────────────────────────────────── */}
        <SectionCard
          title="Basic"
          matched={countMatch(basicResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(basicResults)}
        >
          {heightResult.status !== 'unknown' && (
            <ComparisonValueRow result={heightResult} label="Height" />
          )}
          {distanceResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ValueBox label="Distance apart" value={distanceResult.leftValue} />
              <MatchIcon status={distanceResult.status} />
              <ValueBox label="Distance apart" value={distanceResult.rightValue} />
            </View>
          )}
        </SectionCard>

        {/* ── Ethnicity ──────────────────────────────────────────────── */}
        {ethnicityResult.status !== 'unknown' && (
          <SectionCard
            title="Ethnicity"
            matched={ethnicityResult.status === 'both_happy' ? 1 : 0}
            total={1}
          >
            <EthnicityComparisonRow result={ethnicityResult} />
          </SectionCard>
        )}

        {/* ── Beliefs ────────────────────────────────────────────────── */}
        <SectionCard
          title="Beliefs"
          matched={countMatch(beliefsResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(beliefsResults)}
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

        {/* ── Lifestyle ──────────────────────────────────────────────── */}
        <SectionCard
          title="Lifestyle"
          matched={countMatch(lifestyleResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(lifestyleResults)}
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

        {/* ── Values ─────────────────────────────────────────────────── */}
        {((userA.values?.length ?? 0) > 0 || (userB.values?.length ?? 0) > 0) && (
          <SectionCard
            title="Values"
            matched={valuesMatchCount}
            total={valuesTotal}
          >
            <TagCloudSection
              leftTags={userA.values || []}
              rightTags={userB.values || []}
            />
          </SectionCard>
        )}

        {/* ── Interests ──────────────────────────────────────────────── */}
        {((userA.interests?.length ?? 0) > 0 || (userB.interests?.length ?? 0) > 0) && (
          <SectionCard
            title="Interests"
            matched={interestsMatchCount}
            total={interestsTotal}
          >
            <TagCloudSection
              leftTags={userA.interests || []}
              rightTags={userB.interests || []}
            />
          </SectionCard>
        )}

      </ScrollView>

      {/* ── Fixed bottom vote buttons ───────────────────────────────── */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        gap: 12,
      }}>
        {/* Yes button */}
        <TouchableOpacity
          onPress={() => handleVote('yes')}
          disabled={voting}
          activeOpacity={0.85}
          style={{
            backgroundColor: voting ? '#93C5FD' : BLUE,
            borderRadius: 10,
            height: 46,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={{ fontFamily: 'Outfit_500Medium', fontWeight: '500', fontSize: 16, color: '#FFFFFF' }}>Yes</Text>
        </TouchableOpacity>

        {/* No / For Friend / Not Sure */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* No */}
          <TouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="close-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: 'Outfit_500Medium', fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>No</Text>
          </TouchableOpacity>

          {/* For Friend */}
          <TouchableOpacity
            onPress={handleForFriendPress}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="person-add-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: 'Outfit_500Medium', fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>For Friend</Text>
          </TouchableOpacity>

          {/* Not Sure */}
          <TouchableOpacity
            onPress={() => handleVote('skip')}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: 'Outfit_500Medium', fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>Not Sure</Text>
          </TouchableOpacity>
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
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            overflow: 'hidden',
          }}>

            {forFriendStep === 1 ? (
              /* ── Step 1: Pick which person to recommend ── */
              <View style={{ padding: 24 }}>
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 20, color: '#010101', textAlign: 'center', marginBottom: 6 }}>
                  For a Friend
                </Text>
                <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#010101', opacity: 0.6, textAlign: 'center', marginBottom: 20 }}>
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
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#FFF' }}>
                        {userA.firstName}
                      </Text>
                      <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#FFF', opacity: 0.85 }}>
                        {userA.age} yrs
                      </Text>
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
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#FFF' }}>
                        {userB.firstName}
                      </Text>
                      <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#FFF', opacity: 0.85 }}>
                        {userB.age} yrs
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleForFriendCancel}
                  style={{ marginTop: 16, alignItems: 'center', paddingVertical: 12 }}
                >
                  <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#010101', opacity: 0.45 }}>Cancel</Text>
                </TouchableOpacity>
              </View>

            ) : (
              /* ── Step 2: Pick a friend ── */
              <View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
                  <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 20, color: '#010101', textAlign: 'center', marginBottom: 6 }}>
                    Send to a Friend
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#010101', opacity: 0.6, textAlign: 'center' }}>
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
                    {friendsList.map(item => {
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
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#010101' }}>
                              {item.friend?.firstName}
                            </Text>
                            {item.friend?.currentJob ? (
                              <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#010101', opacity: 0.55 }} numberOfLines={1}>
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
                              <Ionicons name="checkmark" size={14} color="#FFF" />
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
                  borderTopColor: '#F0F0F0',
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
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#010101', opacity: 0.7 }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleForFriendConfirm}
                    disabled={!selectedFriendId}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: selectedFriendId ? BLUE : '#DBEAFE',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#FFFFFF' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

export default ProposalReviewView;
