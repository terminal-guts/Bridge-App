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
 * - Vote buttons at bottom (Pass, Match, Not Sure)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Proposal, UserProfile } from '../../types';
import { RateLimiter } from '../../utils/inputValidation';
import { showToast } from '../../utils/toast';
import { lightHaptic } from '../../utils/haptics';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { proposalsGuide } from '../../config/guides';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import { ComparisonRow } from './ComparisonRow';
import { SectionHeader } from './SectionHeader';
import { LinearGradient } from 'expo-linear-gradient';
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
  calculateDistance,
  MatchResult,
} from '../../utils/proposalMatching';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

import { communityService } from '../../services/communityServiceIndex';
import { CommunityTask } from '../../types/community';

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
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedPersonForRecommend, setSelectedPersonForRecommend] = useState<'userA' | 'userB' | null>(null);
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
        console.error('[ProposalReviewView] Error loading proposals:', error);
        setLoading(false);
      }
    };
    loadProposals();
  }, []);

  // Start proposals guide when page becomes active (startGuideIfNeeded checks AsyncStorage)
  useEffect(() => {
    if (isActive && !loading && proposals.length > 0) {
      const timer = setTimeout(() => {
        startGuideIfNeeded(proposalsGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, loading, proposals.length, startGuideIfNeeded]);

  // Reset profile view and compatibility expansion when moving to next proposal
  useEffect(() => {
    setProfileView('comparison');
  }, [currentIndex]);

  // Handle voting with auto-advance
  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'skip') => {
    if (voting || currentIndex >= proposals.length) {
      console.log('[ProposalReviewView] Vote blocked:', { voting, currentIndex, proposalsLength: proposals.length });
      return;
    }

    const currentProposal = proposals[currentIndex];
    if (!currentProposal) {
      console.log('[ProposalReviewView] No current proposal');
      return;
    }

    console.log('[ProposalReviewView] Voting:', { vote, currentIndex, totalProposals: proposals.length });

    try {
      setVoting(true);

      // Different haptic feedback based on vote type
      if (vote === 'yes') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (vote === 'no') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Check rate limit
      if (!rateLimiterRef.current.isAllowed('vote', 10, 60000)) {
        showToast.info('Slow down!', 'Please wait a moment before voting again');
        setVoting(false);
        return;
      }

      // Submit vote
      await communityService.submitProposalVote(currentProposal.id, vote);
      console.log('[ProposalReviewView] Vote submitted successfully');

      // Brief delay for feedback before advancing
      voteTimeoutRef.current = setTimeout(() => {
        // Guard against unmounted component
        if (!isMountedRef.current) return;

        const isLastProposal = currentIndex >= proposals.length - 1;
        console.log('[ProposalReviewView] Post-vote:', { currentIndex, proposalsLength: proposals.length, isLastProposal });

        // Auto-advance to next proposal or complete
        if (!isLastProposal) {
          console.log('[ProposalReviewView] Advancing to next proposal:', currentIndex + 1);
          setCurrentIndex(currentIndex + 1);
          setVoting(false);
        } else {
          console.log('[ProposalReviewView] All proposals complete, calling onVotesComplete');
          setVoting(false);
          showToast.success('Daily Voting Complete! 🎉', 'Friends Area unlocked');
          // Call onVotesComplete after a brief moment
          setTimeout(() => {
            onVotesComplete?.();
          }, 500);
        }
      }, 400);
    } catch (error: any) {
      console.error('[ProposalReviewView] Error submitting vote:', error);
      // Guard against unmounted component
      if (!isMountedRef.current) return;
      setVoting(false);
      showToast.error('Vote failed', error.message || 'Unable to submit vote');
    }
  }, [voting, currentIndex, proposals, onVotesComplete]);

  // Handle "Better for Friend" action
  const handleBetterForFriend = useCallback(() => {
    // For now, just show a toast. Full friend recommendation flow to be implemented.
    showToast.info('Coming Soon', 'Friend recommendations will be available soon!');
    // TODO: Implement friend selection modal
    // setShowRecommendModal(true);
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

  // Helper functions
  const capitalize = (str: string | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatHeight = (inches: number | undefined): string => {
    if (!inches) return 'Not specified';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  // Calculate match score using new matching logic
  const calculateMatchScore = (userA: UserProfile, userB: UserProfile): number => {
    // For now, use a simple calculation based on all sections
    // TODO: Update this with weighted scoring algorithm
    const results: MatchResult[] = [
      matchAge(userA, userB),
      matchHeight(userA, userB),
      // matchDatingDistance would need actual distance
      matchEthnicity(userA, userB),
      matchPolitics(userA, userB),
      matchReligion(userA, userB),
      matchDrinking(userA, userB),
      matchCannabis(userA, userB),
      matchTobacco(userA, userB),
    ];

    const totalFactors = results.length;
    const matches = results.filter(r => r.status === 'both_happy').length;
    const matchScore = totalFactors > 0 ? Math.round((matches / totalFactors) * 100) : 50;

    return matchScore;
  };

  // Render full profile view (standardized format)
  const renderProfileView = (user: UserProfile) => {
    const userPhotos = user.photos?.slice(0, 6) || [];
    const mainPhoto = userPhotos.find((p: any) => p.isMain) || userPhotos[0];

    return (
      <StyledScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Photo */}
        {mainPhoto && (
          <StyledView style={{ marginBottom: 20, alignItems: 'center' }}>
            <Image
              source={{ uri: mainPhoto.url }}
              style={{
                width: '100%',
                height: 400,
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
          </StyledView>
        )}

        {/* Basic Info Row */}
        <StyledView style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
        }}>
          {/* Gender */}
          {user.gender && user.gender.length > 0 && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="person" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {capitalize(user.gender[0])}
              </StyledText>
            </StyledView>
          )}

          {/* Pronouns */}
          {user.pronouns && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="chatbubble-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {user.pronouns.replace('_', '/')}
              </StyledText>
            </StyledView>
          )}

          {/* Age */}
          <StyledView style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Ionicons name="calendar-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
            <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
              {user.age}
            </StyledText>
          </StyledView>

          {/* Height */}
          {user.height && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="resize-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {formatHeight(user.height)}
              </StyledText>
            </StyledView>
          )}

          {/* Location */}
          <StyledView style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Ionicons name="location" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
            <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
              {user.location}
            </StyledText>
          </StyledView>

          {/* Occupation */}
          {user.currentJob && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="briefcase" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {user.currentJob}
              </StyledText>
            </StyledView>
          )}

          {/* Hometown */}
          {user.hometown && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="home-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {user.hometown}
              </StyledText>
            </StyledView>
          )}

          {/* Ethnicity */}
          {user.ethnicity && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="globe-outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {user.ethnicity}
              </StyledText>
            </StyledView>
          )}

          {/* Religion */}
          {user.religion && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="moon-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {user.religion}
              </StyledText>
            </StyledView>
          )}

          {/* Political Leaning */}
          {user.politicalLeaning && (
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="flag-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {capitalize(user.politicalLeaning.replace(/_/g, ' '))}
              </StyledText>
            </StyledView>
          )}
        </StyledView>

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <StyledView style={{ marginBottom: 20 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="star" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Interests</StyledText>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {user.interests.map((interest: string, index: number) => (
                <StyledView
                  key={index}
                  style={{
                    backgroundColor: '#DBEAFE',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <StyledText style={{ fontSize: 13, color: '#1E40AF', fontWeight: '500' }}>
                    {interest}
                  </StyledText>
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Values */}
        {user.values && user.values.length > 0 && (
          <StyledView style={{ marginBottom: 20 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="diamond" size={18} color="#10B981" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Values</StyledText>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {user.values.map((value: string, index: number) => (
                <StyledView
                  key={index}
                  style={{
                    backgroundColor: '#D1FAE5',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <StyledText style={{ fontSize: 13, color: '#065F46', fontWeight: '500' }}>
                    {value}
                  </StyledText>
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Family */}
        <StyledView style={{ marginBottom: 20 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="people" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
            <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Family</StyledText>
          </StyledView>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="person-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
            <StyledText style={{ fontSize: 14, color: '#4A4540' }}>
              {user.hasChildren === 'no' ? 'No children' : user.hasChildren === 'yes' ? 'Has children' : 'Prefer not to say'}
            </StyledText>
          </StyledView>
          {user.familyPlans && (
            <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="heart-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: 14, color: '#4A4540' }}>
                {user.familyPlans === 'want_children' ? 'Want children someday' :
                 user.familyPlans === 'open_to_children' ? 'Open to children' :
                 user.familyPlans === 'dont_want_children' ? 'Don\'t want children' : 'Not sure yet'}
              </StyledText>
            </StyledView>
          )}
        </StyledView>

        {/* Lifestyle */}
        <StyledView style={{ marginBottom: 20 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="leaf" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
            <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Lifestyle</StyledText>
          </StyledView>

          {user.drinkingFrequency && (
            <StyledView style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wine" size={16} color="#78716C" style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Drinking</StyledText>
              </StyledView>
              <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
                {capitalize(user.drinkingFrequency)}
              </StyledText>
            </StyledView>
          )}

          {user.cannabisFrequency && (
            <StyledView style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="leaf-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Cannabis</StyledText>
              </StyledView>
              <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
                {capitalize(user.cannabisFrequency)}
              </StyledText>
            </StyledView>
          )}

          {user.tobaccoFrequency && (
            <StyledView style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="fitness-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Tobacco</StyledText>
              </StyledView>
              <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
                {capitalize(user.tobaccoFrequency)}
              </StyledText>
            </StyledView>
          )}
        </StyledView>

      {/* Deep Question Tier 1 (removed from simplified view) */}
      {user.deepQuestionsAnswers && user.deepQuestionsAnswers.tier1 && (
        <StyledView style={{ marginBottom: 16 }}>
          <StyledText style={{ fontSize: 14, color: '#78716C', marginBottom: 6 }}>About Me</StyledText>
          <StyledText style={{ fontSize: 14, color: '#4A4540', lineHeight: 20 }}>
            {user.deepQuestionsAnswers.tier1}
          </StyledText>
        </StyledView>
      )}

      {/* Lifestyle */}
      <StyledView style={{ marginBottom: 16 }}>
        <StyledText style={{ fontSize: 14, color: '#78716C', marginBottom: 8 }}>Lifestyle</StyledText>

        {user.drinkingFrequency && (
          <StyledView style={{ marginBottom: 6 }}>
            <StyledText style={{ fontSize: 13, color: '#4A4540' }}>
              Drinking: {capitalize(user.drinkingFrequency)}
            </StyledText>
          </StyledView>
        )}

        {user.cannabisFrequency && (
          <StyledView style={{ marginBottom: 6 }}>
            <StyledText style={{ fontSize: 13, color: '#4A4540' }}>
              Cannabis: {capitalize(user.cannabisFrequency)}
            </StyledText>
          </StyledView>
        )}

        {user.tobaccoFrequency && (
          <StyledView style={{ marginBottom: 6 }}>
            <StyledText style={{ fontSize: 13, color: '#4A4540' }}>
              Tobacco: {capitalize(user.tobaccoFrequency)}
            </StyledText>
          </StyledView>
        )}
      </StyledView>
    </StyledScrollView>
    );
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
  if (proposals.length === 0) {
    return (
      <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 24 }}>
        <StyledText style={{ fontSize: 20, fontWeight: '700', color: '#4A4540', marginBottom: 8, textAlign: 'center' }}>
          All Caught Up!
        </StyledText>
        <StyledText style={{ fontSize: 14, color: '#78716C', textAlign: 'center' }}>
          No proposals to review right now. Check back later!
        </StyledText>
      </StyledView>
    );
  }

  // Completed all proposals
  if (currentIndex >= proposals.length) {
    return (
      <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 24 }}>
        <StyledText style={{ fontSize: 20, fontWeight: '700', color: '#4A4540', marginBottom: 8, textAlign: 'center' }}>
          Great Job!
        </StyledText>
        <StyledText style={{ fontSize: 14, color: '#78716C', textAlign: 'center' }}>
          You've voted on all proposals. Come back tomorrow!
        </StyledText>
      </StyledView>
    );
  }

  const currentProposal = proposals[currentIndex];
  const userA = currentProposal.userA;
  const userB = currentProposal.userB;
  const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
  const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];

  // Calculate match score
  const matchScore = calculateMatchScore(userA, userB);

  // Calculate actual distance (placeholder - would need real lat/long)
  // TODO: Get actual coordinates from user profiles
  const actualDistance = 10; // Placeholder

  // Calculate all match results
  const ageMatch = matchAge(userA, userB);
  const heightMatch = matchHeight(userA, userB);
  const distanceMatch = matchDatingDistance(userA, userB, actualDistance);
  const ethnicityMatch = matchEthnicity(userA, userB);
  const politicsMatch = matchPolitics(userA, userB);
  const religionMatch = matchReligion(userA, userB);
  const drinkingMatch = matchDrinking(userA, userB);
  const cannabisMatch = matchCannabis(userA, userB);
  const tobaccoMatch = matchTobacco(userA, userB);
  const valuesMatch = matchValues(userA, userB);
  const interestsMatch = matchInterests(userA, userB);

  // Calculate section compatibilities
  const demographicsCompatibility = calculateSectionCompatibility([
    ageMatch,
    heightMatch,
    distanceMatch,
    ethnicityMatch,
  ]);

  const backgroundCompatibility = calculateSectionCompatibility([
    politicsMatch,
    religionMatch,
  ]);

  const lifestyleCompatibility = calculateSectionCompatibility([
    drinkingMatch,
    cannabisMatch,
    tobaccoMatch,
  ]);

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

      {profileView === 'comparison' ? (
        // Comparison View
        <StyledView style={{ flex: 1 }}>
          {/* Proposed Pairing Card */}
          <GuideTarget id="proposal-card-0">
            <StyledView style={{ paddingHorizontal: 24, marginBottom: 20, marginTop: 16 }}>
              {/* Photos + Profile Buttons */}
              <StyledView style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 20 }}>
                {/* User A Column */}
                <StyledView style={{ alignItems: 'center', flex: 1 }}>
                  <StyledTouchableOpacity
                    onPress={() => handleOpenProfile(userA)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: photoA?.url || 'https://via.placeholder.com/100' }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: '#E5E7EB',
                      }}
                      resizeMode="cover"
                    />
                  </StyledTouchableOpacity>

                  <StyledTouchableOpacity
                    onPress={() => handleOpenProfile(userA)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 12,
                      marginTop: 12,
                      shadowColor: '#7C3AED',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                      borderWidth: 1,
                      borderColor: '#E0E7FF',
                    }}
                  >
                    <StyledText style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>
                      Profile
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>

                {/* Match Score in Center */}
                <StyledView style={{ alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, paddingTop: 25 }}>
                  <StyledText style={{ fontSize: 36, fontWeight: '800', color: '#7C3AED', marginBottom: 6 }}>
                    {matchScore}%
                  </StyledText>
                  <StyledView style={{
                    height: 6,
                    width: 80,
                    backgroundColor: '#F1F5F9',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <StyledView style={{
                      height: '100%',
                      width: `${matchScore}%`,
                      backgroundColor: matchScore >= 75 ? '#10B981' : matchScore >= 50 ? '#F59E0B' : '#EF4444',
                      borderRadius: 3,
                    }} />
                  </StyledView>
                </StyledView>

                {/* User B Column */}
                <StyledView style={{ alignItems: 'center', flex: 1 }}>
                  <StyledTouchableOpacity
                    onPress={() => handleOpenProfile(userB)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: photoB?.url || 'https://via.placeholder.com/100' }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: '#E5E7EB',
                      }}
                      resizeMode="cover"
                    />
                  </StyledTouchableOpacity>

                  <StyledTouchableOpacity
                    onPress={() => handleOpenProfile(userB)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 12,
                      marginTop: 12,
                      shadowColor: '#7C3AED',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                      borderWidth: 1,
                      borderColor: '#E0E7FF',
                    }}
                  >
                    <StyledText style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>
                      Profile
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>

            </StyledView>
          </GuideTarget>

          <StyledScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Side-by-Side Comparison */}
            <StyledView>
                {/* Demographics Section */}
                <StyledView style={{
                  flexDirection: 'row',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}>
                  {/* Left gradient border (Purple) */}
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={{ width: 4 }}
                  />

                  {/* Content */}
                  <StyledView style={{ flex: 1, padding: 16 }}>
                    <SectionHeader title="Demographics" compatibility={demographicsCompatibility} />

                    <ComparisonRow label="Age" matchResult={ageMatch} />
                    <ComparisonRow label="Height" matchResult={heightMatch} />
                    <ComparisonRow label="Dating Distance" matchResult={distanceMatch} />
                    <ComparisonRow label="Ethnicity" matchResult={ethnicityMatch} isLast />
                  </StyledView>

                  {/* Right gradient border (Teal) */}
                  <LinearGradient
                    colors={['#14B8A6', '#0D9488']}
                    style={{ width: 4 }}
                  />
                </StyledView>

                {/* Background Section */}
                <StyledView style={{
                  flexDirection: 'row',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}>
                  {/* Left gradient border (Teal) */}
                  <LinearGradient
                    colors={['#14B8A6', '#0D9488']}
                    style={{ width: 4 }}
                  />

                  {/* Content */}
                  <StyledView style={{ flex: 1, padding: 16 }}>
                    <SectionHeader title="Background" compatibility={backgroundCompatibility} />

                    <ComparisonRow label="Politics" matchResult={politicsMatch} />
                    <ComparisonRow label="Religion" matchResult={religionMatch} isLast />
                  </StyledView>

                  {/* Right gradient border (Orange) */}
                  <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    style={{ width: 4 }}
                  />
                </StyledView>

                {/* Lifestyle Section */}
                <StyledView style={{
                  flexDirection: 'row',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}>
                  {/* Left gradient border (Teal) */}
                  <LinearGradient
                    colors={['#14B8A6', '#0D9488']}
                    style={{ width: 4 }}
                  />

                  {/* Content */}
                  <StyledView style={{ flex: 1, padding: 16 }}>
                    <SectionHeader title="Lifestyle" compatibility={lifestyleCompatibility} />

                    <ComparisonRow label="Drinking" matchResult={drinkingMatch} />
                    <ComparisonRow label="Cannabis" matchResult={cannabisMatch} />
                    <ComparisonRow label="Tobacco" matchResult={tobaccoMatch} isLast />
                  </StyledView>

                  {/* Right gradient border (Orange) */}
                  <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    style={{ width: 4 }}
                  />
                </StyledView>

                {/* Values & Interests Section */}
                <StyledView style={{
                  flexDirection: 'row',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 80,
                  overflow: 'hidden',
                }}>
                  {/* Left gradient border (Teal) */}
                  <LinearGradient
                    colors={['#14B8A6', '#0D9488']}
                    style={{ width: 4 }}
                  />

                  {/* Content */}
                  <StyledView style={{ flex: 1, padding: 16 }}>
                    <SectionHeader
                      title="Values & Interests"
                      compatibility={{
                        compatible: valuesMatch.status === 'high' ? 2 : valuesMatch.status === 'medium' ? 1 : 0,
                        total: 2,
                        percentage: (valuesMatch.overlapPercentage + interestsMatch.overlapPercentage) / 2,
                        status: valuesMatch.status, // Use values status as primary
                      }}
                    />

                    {/* Shared Values */}
                    {valuesMatch.sharedValues.length > 0 && (
                      <StyledView style={{ marginBottom: 12 }}>
                        <StyledText style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: '#94A3B8',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Shared Values ({valuesMatch.sharedValues.length})
                        </StyledText>
                        <StyledText style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>
                          {valuesMatch.sharedValues.join(', ')}
                        </StyledText>
                      </StyledView>
                    )}

                    {/* Shared Interests */}
                    {interestsMatch.sharedInterests.length > 0 && (
                      <StyledView>
                        <StyledText style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: '#94A3B8',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                          Shared Interests ({interestsMatch.sharedInterests.length})
                        </StyledText>
                        <StyledText style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>
                          {interestsMatch.sharedInterests.join(', ')}
                        </StyledText>
                      </StyledView>
                    )}
                  </StyledView>

                  {/* Right gradient border (Orange) */}
                  <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    style={{ width: 4 }}
                  />
                </StyledView>
            </StyledView>
          </StyledScrollView>
        </StyledView>
      ) : (
        // Profile View
        <>
          <StyledView style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <StyledTouchableOpacity
              onPress={() => setProfileView('comparison')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={24} color="#4A4540" />
              <StyledText style={{ fontSize: 16, color: '#4A4540', marginLeft: 8 }}>
                Back to Comparison
              </StyledText>
            </StyledTouchableOpacity>
            <StyledText style={{ fontSize: 20, fontWeight: '700', color: '#4A4540', marginTop: 12 }}>
              {profileView === 'userA' ? userA.firstName : userB.firstName}'s Profile
            </StyledText>
          </StyledView>
          {renderProfileView(profileView === 'userA' ? userA : userB)}
        </>
      )}

      {/* Vote Buttons - Fixed at bottom */}
      <StyledView style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FBF9F6',
        borderTopWidth: 1,
        borderTopColor: '#E7DED4',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
      }}>
        {/* Primary Action */}
        <StyledTouchableOpacity
          onPress={() => handleVote('yes')}
          disabled={voting}
          style={{
            backgroundColor: '#7C3AED',
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <StyledText style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>
            ✓ Good Match
          </StyledText>
        </StyledTouchableOpacity>

        {/* Secondary Actions */}
        <StyledView style={{ flexDirection: 'row', gap: 12 }}>
          <StyledTouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#E5E7EB',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '600', color: '#4A4540' }}>
              Not a Fit
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={handleBetterForFriend}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#E5E7EB',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '600', color: '#4A4540' }}>
              Better for Friend
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseProfileModal}
      >
        {selectedProfile && (
          <ProfileScreen
            navigation={{
              goBack: handleCloseProfileModal,
              navigate: () => {},
              canGoBack: () => true,
              setOptions: () => {},
              reset: () => {},
              dispatch: () => {},
              isFocused: () => true,
              addListener: () => () => {},
              removeListener: () => {},
            } as any}
            route={{
              key: 'ProfileView',
              name: 'ProfileView',
              params: { profile: selectedProfile, hideHeader: true },
            } as any}
            mode="view"
          />
        )}
      </Modal>
    </StyledView>
  );
}

export default ProposalReviewView;
