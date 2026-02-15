/**
 * Friend Grid Screen
 *
 * Same visual design as Daily Grid View but for helping a friend.
 * Reuses all the same components but loads friend's grid data.
 *
 * Layout:
 * - Top 50%: Friend's photo (anchor)
 * - Bottom 50%: 3 candidate photos
 * - Tap candidate → Full-screen modal with profile
 * - Select candidate → Submit proposal to help friend
 *
 * Navigation: Accessible from Friends Area by tapping friend row
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, SafeAreaView, StatusBar, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { Body, Button, H2 } from '../../components/ui';
import { EvaIcon } from '../../components/icons';
import { AnchorPhotoSection } from '../../components/community/AnchorPhotoSection';
import { AnchorInfoSection } from '../../components/community/AnchorInfoSection';
import { SimpleCandidatePhotos } from '../../components/community/SimpleCandidatePhotos';
import { CandidateProfileModal } from '../../components/community/CandidateProfileModal';

import { UserProfile, RootStackParamList } from '../../types';
import { DailyGrid } from '../../types/community';
import { communityService } from '../../services/communityServiceIndex';
import { showToast } from '../../utils/toast';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { RateLimiter } from '../../utils/inputValidation';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('FriendGridScreen');

// Styled components
const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface FriendGridScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'FriendGrid'>;
}

export function FriendGridScreen({ navigation, route }: FriendGridScreenProps) {
  const { friendId, friendName } = route.params;

  // ========================================
  // STATE
  // ========================================
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [grid, setGrid] = useState<DailyGrid | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Rate limiter for proposal submissions
  const rateLimiterRef = useRef(new RateLimiter());

  // ========================================
  // DATA LOADING
  // ========================================
  const loadFriendGrid = useCallback(async () => {
    try {
      setLoading(true);

      const friendGrid = await communityService.getFriendGrid(friendId);
      setGrid(friendGrid);

      setLoading(false);
    } catch (error: any) {
      logger.error('[FriendGridScreen] Error loading friend grid:', error);
      setLoading(false);
      showToast.error('Failed to load', error.message || `Unable to load ${friendName}'s grid`);
      navigation.goBack();
    }
  }, [friendId, friendName, navigation]);

  useEffect(() => {
    loadFriendGrid();
  }, [loadFriendGrid]);

  // ========================================
  // CANDIDATE SELECTION
  // ========================================
  const handleCandidatePress = useCallback((candidate: UserProfile) => {
    lightHaptic();
    setSelectedCandidate(candidate);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedCandidate(null);
  }, []);

  // ========================================
  // PROPOSAL SUBMISSION
  // ========================================
  const handleSubmitProposal = useCallback(async (candidateId: string) => {
    if (!candidateId || submitting) return;

    // Rate limit check
    if (!rateLimiterRef.current.isAllowed('submit-friend-proposal', 5, 60000)) {
      showToast.error('Too fast!', 'Please wait before submitting again');
      return;
    }

    try {
      setSubmitting(true);
      mediumHaptic();

      await communityService.submitFriendGridProposal(friendId, candidateId);

      // Close modal
      setModalVisible(false);
      setSelectedCandidate(null);

      // Success feedback with celebration!
      showToast.success('Great choice!', `You proposed a match for ${friendName}`);
      mediumHaptic(); // Double haptic for celebration

      // Small delay for user to see success feedback before navigation
      setTimeout(() => {
        // Navigate back to Friends Section
        navigation.goBack();
      }, 800);

      setSubmitting(false);
    } catch (error: any) {
      logger.error('[FriendGridScreen] Error submitting proposal:', error);
      setSubmitting(false);
      showToast.error('Submission failed', error.message || 'Unable to submit proposal');
    }
  }, [friendId, friendName, submitting, navigation]);

  // ========================================
  // RENDER
  // ========================================

  // Loading state
  if (loading || !grid) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F43F5E" />
          <Body className="mt-4 text-neutral-600">Loading {friendName}'s grid...</Body>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  const anchor = grid.anchor;
  const candidates = grid.candidates;

  return (
    <StyledSafeAreaView style={{ flex: 1, backgroundColor: '#FBF9F6' }}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <StyledView style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FBF9F6',
      }}>
        <StyledTouchableOpacity
          onPress={() => {
            lightHaptic();
            navigation.goBack();
          }}
          style={{
            padding: 8,
            marginRight: 8,
          }}
          activeOpacity={0.7}
        >
          <EvaIcon name="arrow-back" variant="outline" color="text" size={24} />
        </StyledTouchableOpacity>
        <H2 style={{ color: '#2A1F1A', fontSize: 20 }}>{friendName}'s Grid</H2>
      </StyledView>

      <StyledView style={{
        flex: 1,
        width: '100%',
        backgroundColor: '#FBF9F6',
      }}>
        {/* Contextual Header */}
        <StyledView style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: '#FBF9F6',
        }}>
          <Body style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#4A4540',
            marginBottom: 4,
            textAlign: 'center',
          }}>
            Help {friendName} find a match
          </Body>
          <Body style={{
            fontSize: 13,
            fontWeight: '500',
            color: '#78716C',
            textAlign: 'center',
            lineHeight: 18,
          }}>
            Choose your best match from these 3 candidates
          </Body>
        </StyledView>

      {/* Top Half (50%): 2 Quadrants Side by Side */}
      <StyledView style={{
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        paddingBottom: 8,
      }}>
        {/* Top Left Quadrant: Friend's Photo */}
        <StyledView style={{ flex: 1 }}>
          <AnchorPhotoSection anchor={anchor} />
        </StyledView>

        {/* Top Right Quadrant: Friend's Info & Preferences */}
        <StyledView style={{ flex: 1 }}>
          <AnchorInfoSection anchor={anchor} />
        </StyledView>
      </StyledView>

      {/* Visual Separator - Warm divider */}
      <StyledView style={{
        width: '100%',
        height: 2,
        backgroundColor: '#E7DED4', // Warm stone divider
        marginVertical: 10,
        opacity: 0.6, // Subtle, not harsh
      }} />

      {/* Bottom Half (50%): 3 Candidate Photos */}
      <StyledView style={{ flex: 1, width: '100%' }}>
        <SimpleCandidatePhotos
          candidates={candidates}
          onCandidatePress={handleCandidatePress}
          disabled={false}
          showSkipButton={false}
        />
      </StyledView>

      {/* Candidate Profile Modal */}
      <CandidateProfileModal
        visible={modalVisible}
        candidate={selectedCandidate}
        anchor={anchor}
        onClose={handleCloseModal}
        onPropose={handleSubmitProposal}
        submitting={submitting}
      />
      </StyledView>
    </StyledSafeAreaView>
  );
}

export default FriendGridScreen;
