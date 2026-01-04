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
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Proposal, UserProfile } from '../../types';
import { RateLimiter } from '../../utils/inputValidation';
import { showToast } from '../../utils/toast';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { proposalsGuide } from '../../config/guides';

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

  // Reset profile view when moving to next proposal
  useEffect(() => {
    setProfileView('comparison');
  }, [currentIndex]);

  // Handle voting with auto-advance
  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'skip') => {
    if (voting || currentIndex >= proposals.length) return;

    const currentProposal = proposals[currentIndex];
    if (!currentProposal) return;

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

      // Brief delay for feedback before advancing
      voteTimeoutRef.current = setTimeout(() => {
        // Guard against unmounted component
        if (!isMountedRef.current) return;

        setVoting(false);

        // Auto-advance to next proposal or complete
        if (currentIndex < proposals.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          showToast.success('All done!', 'Thanks for voting');
          onVotesComplete?.();
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

  // Match analysis helpers
  const analyzeMatch = (userA: UserProfile, userB: UserProfile) => {
    const matches: string[] = [];
    const mismatches: string[] = [];

    // Age match
    const aAgeMin = userA.preferences?.ageMin || 18;
    const aAgeMax = userA.preferences?.ageMax || 99;
    const bAgeMin = userB.preferences?.ageMin || 18;
    const bAgeMax = userB.preferences?.ageMax || 99;

    if (userB.age >= aAgeMin && userB.age <= aAgeMax && userA.age >= bAgeMin && userA.age <= bAgeMax) {
      matches.push(`Both ages fit preferences (${userA.age} & ${userB.age})`);
    } else {
      mismatches.push(`Age mismatch - ${userA.firstName} wants ${aAgeMin}-${aAgeMax}, ${userB.firstName} is ${userB.age}`);
    }

    // Height match
    if (userA.height && userB.height) {
      const aHeightMin = userA.preferences?.heightMin;
      const aHeightMax = userA.preferences?.heightMax;
      const bHeightMin = userB.preferences?.heightMin;
      const bHeightMax = userB.preferences?.heightMax;

      const aHeightMatch = (!aHeightMin || userB.height >= aHeightMin) && (!aHeightMax || userB.height <= aHeightMax);
      const bHeightMatch = (!bHeightMin || userA.height >= bHeightMin) && (!bHeightMax || userA.height <= bHeightMax);

      if (aHeightMatch && bHeightMatch) {
        matches.push(`Heights match preferences`);
      } else {
        mismatches.push(`Height mismatch`);
      }
    }

    // Values overlap
    const commonValues = userA.values?.filter(v => userB.values?.includes(v)) || [];
    if (commonValues.length > 0) {
      matches.push(`${commonValues.length} shared values: ${commonValues.slice(0, 2).join(', ')}`);
    }

    // Values differences
    const aUniqueValues = userA.values?.filter(v => !userB.values?.includes(v)) || [];
    const bUniqueValues = userB.values?.filter(v => !userA.values?.includes(v)) || [];
    if (aUniqueValues.length > 0 && bUniqueValues.length > 0) {
      mismatches.push(`Different values - ${userA.firstName} values ${aUniqueValues.slice(0, 2).join(', ')}, ${userB.firstName} values ${bUniqueValues.slice(0, 2).join(', ')}`);
    } else if (aUniqueValues.length > 0) {
      mismatches.push(`${userA.firstName} values ${aUniqueValues.slice(0, 2).join(', ')} (not shared)`);
    } else if (bUniqueValues.length > 0) {
      mismatches.push(`${userB.firstName} values ${bUniqueValues.slice(0, 2).join(', ')} (not shared)`);
    }

    // Interests overlap
    const commonInterests = userA.interests?.filter(i => userB.interests?.includes(i)) || [];
    if (commonInterests.length > 0) {
      matches.push(`${commonInterests.length} shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
    }

    // Interests differences
    const aUniqueInterests = userA.interests?.filter(i => !userB.interests?.includes(i)) || [];
    const bUniqueInterests = userB.interests?.filter(i => !userA.interests?.includes(i)) || [];
    if (aUniqueInterests.length > 0 && bUniqueInterests.length > 0) {
      mismatches.push(`Different interests - ${userA.firstName} enjoys ${aUniqueInterests.slice(0, 2).join(', ')}, ${userB.firstName} enjoys ${bUniqueInterests.slice(0, 2).join(', ')}`);
    } else if (aUniqueInterests.length > 0) {
      mismatches.push(`${userA.firstName} enjoys ${aUniqueInterests.slice(0, 2).join(', ')} (not shared)`);
    } else if (bUniqueInterests.length > 0) {
      mismatches.push(`${userB.firstName} enjoys ${bUniqueInterests.slice(0, 2).join(', ')} (not shared)`);
    }

    // Ethnicity preference
    if (userA.preferredEthnicities && userA.preferredEthnicities.length > 0) {
      if (userB.ethnicity && !userA.preferredEthnicities.includes(userB.ethnicity)) {
        mismatches.push(`${userA.firstName} prefers ${userA.preferredEthnicities.join(', ')}, ${userB.firstName} is ${userB.ethnicity}`);
      }
    }

    if (userB.preferredEthnicities && userB.preferredEthnicities.length > 0) {
      if (userA.ethnicity && !userB.preferredEthnicities.includes(userA.ethnicity)) {
        mismatches.push(`${userB.firstName} prefers ${userB.preferredEthnicities.join(', ')}, ${userA.firstName} is ${userA.ethnicity}`);
      }
    }

    // Drinking
    if (userA.drinkingFrequency && userB.drinkingFrequency) {
      if (userA.drinkingFrequency === userB.drinkingFrequency) {
        matches.push(`Same drinking habits: ${capitalize(userA.drinkingFrequency)}`);
      } else {
        mismatches.push(`Different drinking - ${userA.firstName}: ${capitalize(userA.drinkingFrequency)}, ${userB.firstName}: ${capitalize(userB.drinkingFrequency)}`);
      }
    }

    // Cannabis
    if (userA.cannabisFrequency && userB.cannabisFrequency) {
      if (userA.cannabisFrequency !== userB.cannabisFrequency) {
        mismatches.push(`Different cannabis use - ${userA.firstName}: ${capitalize(userA.cannabisFrequency)}, ${userB.firstName}: ${capitalize(userB.cannabisFrequency)}`);
      }
    }

    // Tobacco
    if (userA.tobaccoFrequency && userB.tobaccoFrequency) {
      if (userA.tobaccoFrequency !== userB.tobaccoFrequency) {
        mismatches.push(`Different tobacco use - ${userA.firstName}: ${capitalize(userA.tobaccoFrequency)}, ${userB.firstName}: ${capitalize(userB.tobaccoFrequency)}`);
      }
    }

    // Religion
    if (userA.religion && userB.religion && userA.religion !== userB.religion) {
      mismatches.push(`Different religions - ${userA.firstName}: ${userA.religion}, ${userB.firstName}: ${userB.religion}`);
    }

    // Political leaning
    if (userA.politicalLeaning && userB.politicalLeaning && userA.politicalLeaning !== userB.politicalLeaning) {
      mismatches.push(`Different political views - ${userA.firstName}: ${capitalize(userA.politicalLeaning.replace(/_/g, ' '))}, ${userB.firstName}: ${capitalize(userB.politicalLeaning.replace(/_/g, ' '))}`);
    }

    // Family plans
    if (userA.familyPlans && userB.familyPlans && userA.familyPlans !== userB.familyPlans) {
      const aPlans = userA.familyPlans === 'want_children' ? 'wants children' :
                     userA.familyPlans === 'dont_want_children' ? 'doesn\'t want children' :
                     userA.familyPlans === 'open_to_children' ? 'open to children' : 'not sure';
      const bPlans = userB.familyPlans === 'want_children' ? 'wants children' :
                     userB.familyPlans === 'dont_want_children' ? 'doesn\'t want children' :
                     userB.familyPlans === 'open_to_children' ? 'open to children' : 'not sure';
      mismatches.push(`Different family plans - ${userA.firstName} ${aPlans}, ${userB.firstName} ${bPlans}`);
    }

    return { matches, mismatches };
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
  const analysis = analyzeMatch(userA, userB);

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
        <StyledText style={{ textAlign: 'center', fontSize: 12, color: '#78716C', marginTop: 8 }}>
          Proposal {currentIndex + 1} of {proposals.length}
        </StyledText>
      </StyledView>

      {profileView === 'comparison' ? (
        // Comparison View
        <StyledView style={{ flex: 1 }}>
          {/* Photos + Names */}
          <GuideTarget id="proposal-card-0">
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
            {/* User A */}
            <StyledView style={{ alignItems: 'center', flex: 1 }}>
              <Image
                source={{ uri: photoA?.url || 'https://via.placeholder.com/100' }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#E5E7EB',
                  marginBottom: 8,
                }}
                resizeMode="cover"
              />
              <StyledText style={{ fontSize: 16, fontWeight: '700', color: '#4A4540' }}>
                {userA.firstName}, {userA.age}
              </StyledText>
              <StyledTouchableOpacity
                onPress={() => setProfileView('userA')}
                style={{
                  marginTop: 8,
                  backgroundColor: '#7C3AED',
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <StyledText style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>
                  View Profile
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>

            {/* User B */}
            <StyledView style={{ alignItems: 'center', flex: 1 }}>
              <Image
                source={{ uri: photoB?.url || 'https://via.placeholder.com/100' }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#E5E7EB',
                  marginBottom: 8,
                }}
                resizeMode="cover"
              />
              <StyledText style={{ fontSize: 16, fontWeight: '700', color: '#4A4540' }}>
                {userB.firstName}, {userB.age}
              </StyledText>
              <StyledTouchableOpacity
                onPress={() => setProfileView('userB')}
                style={{
                  marginTop: 8,
                  backgroundColor: '#7C3AED',
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <StyledText style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>
                  View Profile
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          </GuideTarget>

          <StyledScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Matches */}
            {analysis.matches.length > 0 && (
              <StyledView style={{
                backgroundColor: '#ECFDF5',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: 15, fontWeight: '700', color: '#047857' }}>
                    What Fits
                  </StyledText>
                </StyledView>
                {analysis.matches.map((match, index) => (
                  <StyledText key={index} style={{ fontSize: 13, color: '#065F46', marginBottom: 6, lineHeight: 18 }}>
                    • {match}
                  </StyledText>
                ))}
              </StyledView>
            )}

            {/* Mismatches */}
            {analysis.mismatches.length > 0 && (
              <StyledView style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: 15, fontWeight: '700', color: '#B45309' }}>
                    What Doesn't Fit
                  </StyledText>
                </StyledView>
                {analysis.mismatches.map((mismatch, index) => (
                  <StyledText key={index} style={{ fontSize: 13, color: '#92400E', marginBottom: 6, lineHeight: 18 }}>
                    • {mismatch}
                  </StyledText>
                ))}
              </StyledView>
            )}
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
          <StyledView style={{ flexDirection: 'row', gap: 12 }}>
          <StyledTouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>
              Pass
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={() => handleVote('skip')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: '#E0E7FF',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '600', color: '#4338CA' }}>
              Not Sure
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={() => handleVote('yes')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: '#7C3AED',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <StyledText style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>
              Match!
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}

export default ProposalReviewView;
