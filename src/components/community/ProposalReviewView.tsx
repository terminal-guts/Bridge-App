/**
 * ProposalReviewView Component
 *
 * Page 2 of Community tab - Sequential proposal voting interface
 *
 * Features:
 * - Shows ONE proposal per screen (sequential flow)
 * - Progress indicator (1 of 3, 2 of 3, 3 of 3)
 * - Match analysis showing alignments and mismatches
 * - Profile view toggle for each person
 * - Vote buttons at bottom (Pass, Match, Better for Friend)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, Platform, UIManager } from 'react-native';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../types';
import { Proposal, CommunityTask, MatchResult } from '../../types/community';
import { RateLimiter } from '../../utils/inputValidation';
import { showToast } from '../../utils/toast';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { proposalsGuide } from '../../config/guides';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import { ComparisonRow } from './ComparisonRow';
import { SectionHeader } from './SectionHeader';
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
  matchValues,
  matchInterests,
  calculateSectionCompatibility,
} from '../../utils/proposalMatching';

import { ProposalProfileView } from './ProposalProfileView';
import { communityService } from '../../services/communityServiceIndex';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ProposalReviewView');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface ProposalReviewViewProps {
  onVotesComplete?: () => void;
  taskProgress?: CommunityTask | null;
  goToPage?: (page: number) => void;
  isActive?: boolean;
}

type ProfileView = 'comparison' | 'userA' | 'userB';

export function ProposalReviewView({
  onVotesComplete,
  taskProgress,
  goToPage,
  isActive = false,
}: ProposalReviewViewProps) {
  // State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [profileView, setProfileView] = useState<ProfileView>('comparison');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // Rate limiter for vote submissions (max 10 votes per minute)
  const rateLimiterRef = useRef(new RateLimiter());

  // Track mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const voteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (voteTimeoutRef.current) {
        clearTimeout(voteTimeoutRef.current);
      }
    };
  }, []);

  // Guide system
  const { startGuideIfNeeded } = useGuide();

  // Load proposals on mount
  useEffect(() => {
    const loadProposals = async () => {
      try {
        setLoading(true);
        const result = await communityService.getProposalsToVote();
        setProposals(result);
        setLoading(false);
      } catch (error) {
        logger.error('[ProposalReviewView] Error loading proposals:', error);
        setLoading(false);
      }
    };
    loadProposals();
  }, []);

  // Start proposals guide when page becomes active
  useEffect(() => {
    if (isActive && !loading && proposals.length > 0) {
      const timer = setTimeout(() => {
        startGuideIfNeeded(proposalsGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, loading, proposals.length, startGuideIfNeeded]);

  // Reset profile view when moving to next proposal
  useEffect(() => {
    setProfileView('comparison');
  }, [currentIndex]);

  // Handle voting with auto-advance
  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'skip') => {
    if (voting || currentIndex >= proposals.length) {
      return;
    }

    const currentProposal = proposals[currentIndex];
    if (!currentProposal) {
      return;
    }

    try {
      setVoting(true);

      // Haptics
      if (vote === 'yes') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Check rate limit
      if (!rateLimiterRef.current.isAllowed('vote', 10, 60000)) {
        showToast.info('Slow down!', 'Please wait a moment before voting again');
        setVoting(false);
        return;
      }

      // Submit vote
      await communityService.submitProposalVote(currentProposal.id, vote);

      // Advance after delay
      voteTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        const isLastProposal = currentIndex >= proposals.length - 1;

        if (!isLastProposal) {
          setCurrentIndex(currentIndex + 1);
          setVoting(false);
        } else {
          setVoting(false);
          showToast.success('Daily Voting Complete! 🎉', 'Friends Area unlocked');
          setTimeout(() => {
            onVotesComplete?.();
          }, 500);
        }
      }, 400);
    } catch (error: any) {
      logger.error('[ProposalReviewView] Error submitting vote:', error);
      if (!isMountedRef.current) return;
      setVoting(false);
      showToast.error('Vote failed', error.message || 'Unable to submit vote');
    }
  }, [voting, currentIndex, proposals, onVotesComplete]);

  // Handle "Better for Friend" action
  const handleBetterForFriend = useCallback(() => {
    showToast.info('Coming Soon', 'Friend recommendations will be available soon!');
  }, []);

  // Handle opening profile modal
  const handleOpenProfile = useCallback((profile: UserProfile) => {
    setSelectedProfile(profile);
    setShowProfileModal(true);
  }, []);

  // Handle closing profile modal
  const handleCloseProfileModal = useCallback(() => {
    setShowProfileModal(false);
    setSelectedProfile(null);
  }, []);

  // Calculate match score
  const calculateMatchScore = (userA: UserProfile, userB: UserProfile): number => {
    const results: MatchResult[] = [
      matchAge(userA, userB),
      matchHeight(userA, userB),
      matchEthnicity(userA, userB),
      matchPolitics(userA, userB),
      matchReligion(userA, userB),
      matchDrinking(userA, userB),
      matchCannabis(userA, userB),
      matchTobacco(userA, userB),
    ];

    const totalFactors = results.length;
    const matches = results.filter(r => r.status === 'both_happy').length;
    return totalFactors > 0 ? Math.round((matches / totalFactors) * 100) : 50;
  };

  // Loading state
  if (loading) {
    return (
      <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <StyledText style={{ fontSize: 16, color: '#78716C' }}>Loading proposals...</StyledText>
      </StyledView>
    );
  }

  // No proposals
  if (proposals.length === 0 || currentIndex >= proposals.length) {
    return (
      <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 24 }}>
        <StyledText style={{ fontSize: 20, fontWeight: '700', color: '#4A4540', marginBottom: 8, textAlign: 'center' }}>
          All Caught Up!
        </StyledText>
        <StyledText style={{ fontSize: 14, color: '#78716C', textAlign: 'center' }}>
          No more proposals to review. Check back later!
        </StyledText>
      </StyledView>
    );
  }

  const currentProposal = proposals[currentIndex];
  const { userA, userB } = currentProposal;
  const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
  const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];

  const matchScore = calculateMatchScore(userA, userB);
  const actualDistance = 10; // Placeholder

  const ageMatch = matchAge(userA, userB);
  const heightMatch = matchHeight(userA, userB);
  const distanceMatch = matchDatingDistance(userA, userB, actualDistance);
  const ethnicityMatch = matchEthnicity(userA, userB);
  const drinkingMatch = matchDrinking(userA, userB);
  const cannabisMatch = matchCannabis(userA, userB);
  const tobaccoMatch = matchTobacco(userA, userB);
  const politicsMatch = matchPolitics(userA, userB);
  const religionMatch = matchReligion(userA, userB);
  const valuesMatch = matchValues(userA, userB);
  const interestsMatch = matchInterests(userA, userB);

  const demographicsCompatibility = calculateSectionCompatibility([ageMatch, heightMatch, distanceMatch, ethnicityMatch]);
  const lifestyleCompatibility = calculateSectionCompatibility([drinkingMatch, cannabisMatch, tobaccoMatch]);
  const backgroundCompatibility = calculateSectionCompatibility([politicsMatch, religionMatch]);

  return (
    <StyledView style={{ flex: 1, backgroundColor: '#FBF9F6' }}>
      {/* Progress Indicator */}
      <StyledView style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {proposals.map((_, index) => (
            <StyledView
              key={index}
              style={{
                height: 8,
                width: 40,
                borderRadius: 4,
                marginHorizontal: 6,
                backgroundColor: index === currentIndex ? '#7C3AED' : index < currentIndex ? '#C4B5FD' : '#E0E7FF',
              }}
            />
          ))}
        </StyledView>
      </StyledView>

      {/* Tabs */}
      <StyledView style={{
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        marginHorizontal: 24,
        marginBottom: 20,
        padding: 4,
      }}>
        {(['comparison', 'userA', 'userB'] as const).map((view) => (
          <StyledTouchableOpacity
            key={view}
            onPress={() => setProfileView(view)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: profileView === view ? '#FFFFFF' : 'transparent',
              borderRadius: 12,
              elevation: profileView === view ? 2 : 0,
            }}
          >
            <StyledText style={{
              fontSize: 14,
              fontWeight: profileView === view ? '700' : '500',
              color: profileView === view ? '#7C3AED' : '#6B7280'
            }}>
              {view === 'comparison' ? 'Match Info' : (view === 'userA' ? userA.firstName : userB.firstName)}
            </StyledText>
          </StyledTouchableOpacity>
        ))}
      </StyledView>

      {/* Content */}
      {profileView === 'comparison' ? (
        <StyledScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
          <GuideTarget id="proposal-card-0">
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <StyledTouchableOpacity onPress={() => handleOpenProfile(userA)}>
                <Image source={{ uri: photoA?.url || 'https://via.placeholder.com/80' }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              </StyledTouchableOpacity>
              <StyledView style={{ marginHorizontal: 16, alignItems: 'center' }}>
                <StyledText style={{ fontSize: 28, fontWeight: '800', color: '#7C3AED' }}>{matchScore}%</StyledText>
                <StyledText style={{ fontSize: 12, color: '#6B7280' }}>Match Score</StyledText>
              </StyledView>
              <StyledTouchableOpacity onPress={() => handleOpenProfile(userB)}>
                <Image source={{ uri: photoB?.url || 'https://via.placeholder.com/80' }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              </StyledTouchableOpacity>
            </StyledView>
          </GuideTarget>

          <SectionHeader title="Demographics" compatibility={demographicsCompatibility} />
          <ComparisonRow label="Age" result={ageMatch} />
          <ComparisonRow label="Height" result={heightMatch} />
          <ComparisonRow label="Distance" result={distanceMatch} />
          <ComparisonRow label="Ethnicity" result={ethnicityMatch} />

          <SectionHeader title="Lifestyle" compatibility={lifestyleCompatibility} />
          <ComparisonRow label="Drinking" result={drinkingMatch} />
          <ComparisonRow label="Cannabis" result={cannabisMatch} />
          <ComparisonRow label="Tobacco" result={tobaccoMatch} />

          <SectionHeader title="Background" compatibility={backgroundCompatibility} />
          <ComparisonRow label="Politics" result={politicsMatch} />
          <ComparisonRow label="Religion" result={religionMatch} />

          <SectionHeader
            title="Shared Values & Interests"
            compatibility={{
              compatible: valuesMatch.sharedValues.length + interestsMatch.sharedInterests.length,
              total: userA.values.length + userA.interests.length,
              status: valuesMatch.status,
              percentage: (valuesMatch.overlapPercentage + interestsMatch.overlapPercentage) / 2
            }}
          />
          {valuesMatch.sharedValues.length > 0 && (
            <StyledView style={{ marginBottom: 12 }}>
              <StyledText style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' }}>Shared Values</StyledText>
              <StyledText style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>{valuesMatch.sharedValues.join(', ')}</StyledText>
            </StyledView>
          )}
          {interestsMatch.sharedInterests.length > 0 && (
            <StyledView>
              <StyledText style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' }}>Shared Interests</StyledText>
              <StyledText style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>{interestsMatch.sharedInterests.join(', ')}</StyledText>
            </StyledView>
          )}
        </StyledScrollView>
      ) : (
        <ProposalProfileView user={profileView === 'userA' ? userA : userB} />
      )}

      {/* Vote Buttons */}
      <StyledView style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
      }}>
        <StyledView style={{ flexDirection: 'row', gap: 12 }}>
          <StyledTouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            style={{ flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Pass</StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={() => handleVote('yes')}
            disabled={voting}
            style={{ flex: 1.5, backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Match</StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={handleBetterForFriend}
            disabled={voting}
            style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>Better for Friend</StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Modal for Full Profile */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseProfileModal}>
        {selectedProfile && (
          <ProfileScreen
            navigation={{ goBack: handleCloseProfileModal } as any}
            route={{ params: { profile: selectedProfile, hideHeader: true } } as any}
            mode="view"
          />
        )}
      </Modal>
    </StyledView>
  );
}

export default ProposalReviewView;
