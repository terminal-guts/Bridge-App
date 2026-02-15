/**
 * ⚠️ ARCHIVED COMPONENT - January 2026
 *
 * This component has been removed from the active UI but preserved for potential future use.
 *
 * REASON FOR ARCHIVAL:
 * Product shifted from grid-based matching to proposal-based validation system.
 * Users no longer select candidates from a grid - they vote on algorithm-generated proposals.
 *
 * ORIGINAL PURPOSE:
 * DailyGridView (formerly Page 1 of Community Tab) - Grid-based matchmaking interface
 * where users viewed 1 anchor + 3 candidates and submitted a proposal.
 *
 * WHAT REPLACED IT:
 * ProposalReviewView is now the primary Community interaction (vote on proposals).
 *
 * TO RESTORE:
 * 1. Move this file back to src/components/community/
 * 2. Add DailyGridView to CommunityScreen 3-page layout
 * 3. Update task progress to require grid proposal submission
 * 4. Update PageIndicator to show grid tab
 *
 * ---
 *
 * DailyGridView (Page 1 of Community Tab)
 *
 * Redesigned for minimal, frictionless matchmaking experience.
 *
 * Layout:
 * - Top 50%: Anchor's photo + match preferences (no name)
 * - Bottom 50%: 3 candidate photos only (no names)
 * - Tap candidate photo → Full-screen modal with abridged profile
 * - Modal has Back button (top left) and Propose button (bottom)
 * - Proposing immediately navigates to Proposals screen
 *
 * Design: Minimal, clean, efficient profile digestion
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, RefreshControl, Modal, Pressable } from 'react-native';
import { styled } from 'nativewind';

import { Body, Button } from '../ui';
import { AnchorPhotoSection } from './AnchorPhotoSection';
import { AnchorInfoSection } from './AnchorInfoSection';
import { SimpleCandidatePhotos } from './SimpleCandidatePhotos';
import { CandidateProfileModal } from './CandidateProfileModal';
import { GuideTarget } from '../guides';
import { useGuide } from '../../hooks/useGuide';
import { dailyGridGuide } from '../../config/guides';

import { UserProfile } from '../../types';
import { DailyGrid, CommunityTask } from '../../types/community';
import { communityService } from '../../services/communityServiceIndex';
import { showToast } from '../../utils/toast';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { RateLimiter } from '../../utils/inputValidation';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ArchivedDailyGridView');

// Styled components
const StyledView = styled(View);
const StyledPressable = styled(Pressable);

// Types
interface DailyGridViewProps {
  onProposalSubmitted: () => void;
  taskProgress: CommunityTask | null;
  isActive?: boolean;
}

export function DailyGridView({ onProposalSubmitted, taskProgress, isActive = false }: DailyGridViewProps) {
  // ========================================
  // STATE
  // ========================================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grid, setGrid] = useState<DailyGrid | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Rate limiter for proposal submissions (max 5 proposals per minute)
  const rateLimiterRef = useRef(new RateLimiter());

  // Guide system
  const { startGuideIfNeeded } = useGuide();

  // Derived state - check both possible field names for safety
  const isComplete = taskProgress?.hasCompletedRandomMatch ?? (taskProgress as any)?.completedGrid ?? false;

  // DEV: Log state on every render to track the blocking issue
  useEffect(() => {
    logger.info('[DailyGridView] Click state:', {
      isComplete,
      hasCompletedRandomMatch: taskProgress?.hasCompletedRandomMatch,
      taskProgressExists: !!taskProgress
    });
  }, [isComplete, taskProgress]);

  // ========================================
  // DATA LOADING
  // ========================================
  const loadGrid = useCallback(async () => {
    try {
      setLoading(true);

      const dailyGrid = await communityService.getTodaysGrid();

      // Debug: Log the received grid data
      logger.info('[DailyGridView] Grid loaded, anchor photos:', dailyGrid.anchor.photos);
      logger.info('[DailyGridView] Anchor firstName:', dailyGrid.anchor.firstName);
      logger.info('[DailyGridView] Candidates count:', dailyGrid.candidates.length);
      dailyGrid.candidates.forEach((c, i) => {
        logger.info(`[DailyGridView] Candidate ${i + 1} (${c.firstName}) photos:`, c.photos);
      });

      setGrid(dailyGrid);

      setLoading(false);
    } catch (error: any) {
      logger.error('[DailyGridView] Error loading grid:', error);
      setLoading(false);
      showToast.error('Failed to load', error.message || 'Unable to load your grid');
    }
  }, []);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  // Start daily grid guide when page becomes active (startGuideIfNeeded checks AsyncStorage)
  useEffect(() => {
    if (isActive && !loading && grid) {
      const timer = setTimeout(() => {
        startGuideIfNeeded(dailyGridGuide);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, loading, grid, startGuideIfNeeded]);

  // ========================================
  // REFRESH
  // ========================================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    lightHaptic();
    await loadGrid();
    setRefreshing(false);
  }, [loadGrid]);

  // ========================================
  // MODAL HANDLING
  // ========================================
  const handleCandidatePress = useCallback((candidate: UserProfile) => {
    logger.info('[DailyGridView] Candidate pressed!', candidate.id, 'isComplete:', isComplete);
    if (isComplete) {
      logger.info('[DailyGridView] Blocked - already complete');
      return; // Can't select if already submitted
    }

    lightHaptic();
    setSelectedCandidate(candidate);
    setModalVisible(true);
  }, [isComplete]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedCandidate(null);
  }, []);

  // ========================================
  // SUBMISSION
  // ========================================
  const handleSubmitProposal = useCallback(async (candidateId: string) => {
    if (!candidateId || isComplete) return;

    // Check rate limit (max 5 proposals per minute)
    if (!rateLimiterRef.current.isAllowed('submit-proposal', 5, 60000)) {
      showToast.error('Too fast!', 'Please wait before submitting again');
      setIsRateLimited(true);
      // Clear rate limit flag after 60 seconds
      setTimeout(() => setIsRateLimited(false), 60000);
      return;
    }

    try {
      setSubmitting(true);
      mediumHaptic();

      await communityService.submitDailyGridProposal(candidateId);

      // Close modal
      setModalVisible(false);
      setSelectedCandidate(null);

      // Success feedback with celebration!
      showToast.success('Great choice!', 'Your proposal is with the community for voting');
      mediumHaptic(); // Double haptic for celebration

      // Small delay for user to see success feedback before navigation
      setTimeout(() => {
        // Notify parent to update task progress and navigate to Proposals screen
        onProposalSubmitted();
      }, 800);

      setSubmitting(false);
    } catch (error: any) {
      logger.error('[DailyGridView] Error submitting proposal:', error);
      setSubmitting(false);
      // Close modal on error so user can retry
      setModalVisible(false);
      setSelectedCandidate(null);
      showToast.error('Submission failed', error.message || 'Unable to submit proposal');
    }
  }, [isComplete, onProposalSubmitted]);

  // ========================================
  // RENDER STATES
  // ========================================

  // Loading state
  if (loading && !grid) {
    return (
      <StyledView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1E293B" />
        <Body className="mt-4 text-neutral-600">Loading your grid...</Body>
      </StyledView>
    );
  }

  // No grid available
  if (!grid) {
    return (
      <StyledView className="flex-1 items-center justify-center px-6">
        <Body className="text-2xl font-semibold text-center mb-2">No Grid Today</Body>
        <Body className="text-center text-neutral-600 mb-6">
          You don't have a grid assignment today. Check back tomorrow!
        </Body>
        <Button onPress={loadGrid} variant="primary">Refresh</Button>
      </StyledView>
    );
  }

  // ========================================
  // MAIN CONTENT - NEW MINIMAL LAYOUT
  // ========================================

  return (
    <StyledView style={{
      flex: 1,
      width: '100%',
      backgroundColor: '#FBF9F6', // Warm cream background
    }}>
      {/* Contextual Header - Onboarding */}
      <StyledView style={{
        paddingHorizontal: 20,
        paddingTop: 16,
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
          Community Grid
        </Body>
        <Body style={{
          fontSize: 13,
          fontWeight: '500',
          color: '#78716C',
          textAlign: 'center',
          lineHeight: 18,
        }}>
          Choose the best match from these 3 candidates
        </Body>
      </StyledView>

      {/* Top Half: Anchor Photo (left) + Info (right) */}
      <StyledView style={{
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 12,
        paddingBottom: 16,
      }}>
        {/* Left: Large Anchor Photo (40% width) */}
        <StyledView style={{ flex: 0.4, marginRight: 12 }}>
          <AnchorPhotoSection anchor={grid.anchor} />
        </StyledView>

        {/* Right: Anchor Info & Preferences (60% width) */}
        <StyledView style={{ flex: 0.6 }}>
          <AnchorInfoSection anchor={grid.anchor} />
        </StyledView>
      </StyledView>

      {/* Bottom Half: 3 Candidate Photos */}
      <StyledView style={{ flex: 1, width: '100%', paddingHorizontal: 12 }}>
        <GuideTarget id="triangle-grid" style={{ flex: 1, width: '100%' }}>
          <SimpleCandidatePhotos
            candidates={grid.candidates}
            onCandidatePress={handleCandidatePress}
            disabled={isComplete}
            onSkip={() => setShowSkipDialog(true)}
            showSkipButton={true}
          />
        </GuideTarget>
      </StyledView>

      {/* Skip Confirmation Dialog */}
      <Modal
        visible={showSkipDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSkipDialog(false)}
      >
        <StyledView style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <StyledView style={{
            backgroundColor: '#FBF9F6',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            shadowColor: 'rgba(139, 92, 47, 0.3)',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 1,
            shadowRadius: 24,
            elevation: 10,
          }}>
            <Body style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#4A4540',
              marginBottom: 12,
              textAlign: 'center',
            }}>
              Skip This Grid?
            </Body>
            <Body style={{
              fontSize: 13,
              color: '#78716C',
              marginBottom: 20,
              textAlign: 'center',
              lineHeight: 20,
            }}>
              You won't be able to propose a match for this anchor today. The grid will reset tomorrow.
            </Body>

            <StyledView style={{ gap: 10 }}>
              <Button
                onPress={() => {
                  setShowSkipDialog(false);
                  showToast.info('Grid skipped', 'Come back tomorrow for a new assignment');
                  onProposalSubmitted(); // Mark as complete and navigate
                }}
                variant="secondary"
              >
                Yes, skip this grid
              </Button>
              <Button
                onPress={() => setShowSkipDialog(false)}
                variant="primary"
              >
                Go back
              </Button>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Candidate Profile Modal */}
      <CandidateProfileModal
        visible={modalVisible}
        candidate={selectedCandidate}
        anchor={grid.anchor}
        onClose={handleCloseModal}
        onPropose={handleSubmitProposal}
        submitting={submitting}
        disabled={isRateLimited}
      />
    </StyledView>
  );
}

export default DailyGridView;
