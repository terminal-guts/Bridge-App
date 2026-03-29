/**
 * FriendProposalScreen
 *
 * Shows a friend's active proposal so the current user can vote on it.
 * Fetches the real proposal from the proposals table (not mock data).
 * Accessed by tapping "Match" on a friend in the Community area.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types';
import { Proposal } from '../../types/community';
import { ProposalReviewView, DeepQuestionData } from '../../components/community/proposal/ProposalReviewView';
import { communityService } from '../../services/communityServiceIndex';
import { getFriendActiveProposal } from '../../services/friendProposalService';
import { createLogger } from '../../utils/secureLogger';
import { TEXT_STYLES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper, EmptyState } from '../../components/ui';

const logger = createLogger('FriendProposalScreen');

/** Safely truncate a name for display to prevent layout overflow. */
function truncateName(name: string, maxLength = 20): string {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}

interface FriendProposalScreenProps {
  navigation: NavigationProp<RootStackParamList, 'FriendProposal'>;
  route: RouteProp<RootStackParamList, 'FriendProposal'>;
}

export function FriendProposalScreen({ navigation, route }: FriendProposalScreenProps) {
  const { friendId, friendName } = route.params;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [deepQuestions, setDeepQuestions] = useState<DeepQuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const displayName = truncateName(friendName);

  const fetchProposal = useCallback(async () => {
    cancelledRef.current = false;
    try {
      setLoading(true);
      setError(null);

      const result = await getFriendActiveProposal(friendId, friendName);

      if (cancelledRef.current) return;

      if ('error' in result) {
        setError(result.error);
      } else {
        setProposal(result.proposal);
        setDeepQuestions(result.deepQuestions);
      }
    } catch (err: unknown) {
      logger.error('[FriendProposalScreen] Error fetching proposal:', err);
      if (!cancelledRef.current) {
        setError('Something went wrong loading the proposal. Tap below to try again.');
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [friendId, friendName]);

  useEffect(() => {
    fetchProposal();
    return () => { cancelledRef.current = true; };
  }, [fetchProposal]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVoteComplete = useCallback(() => {
    communityService.markFriendAsHelped(friendId).catch(() => {});
    if ('invalidateFriendsCache' in communityService) {
      (communityService as any).invalidateFriendsCache();
    }
    navigation.goBack();
  }, [friendId, navigation]);

  if (loading) {
    return (
      <ScreenWrapper>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="none"
          accessibilityLabel={`Loading ${displayName}'s proposal`}
        >
          <ActivityIndicator
            size="large"
            color={COLORS.primaryAccent}
            accessibilityLabel="Loading"
          />
          <Text
            style={{ marginTop: 12, color: COLORS.text.label, ...TEXT_STYLES.bodySm }}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="text"
          >
            Loading {displayName}'s proposal...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${error}`}
        >
          <EmptyState
            title="Couldn't load proposal"
            description={error}
            action={{
              label: 'Try Again',
              onPress: fetchProposal,
            }}
            variant="illustrated"
          />
        </View>
      </ScreenWrapper>
    );
  }

  if (!proposal) {
    return (
      <ScreenWrapper>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={`No active proposal for ${displayName}`}
        >
          <EmptyState
            title="No active proposal"
            description={`${displayName} doesn't have a proposal to vote on right now. Check back later!`}
            action={{
              label: 'Go Back',
              onPress: handleBack,
            }}
            variant="illustrated"
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ProposalReviewView
        initialProposals={[proposal]}
        showBackButton={true}
        onBack={handleBack}
        onVoteComplete={handleVoteComplete}
        deepQuestions={deepQuestions}
      />
    </ScreenWrapper>
  );
}

export default FriendProposalScreen;
