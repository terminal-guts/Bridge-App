/**
 * FriendProposalScreen
 *
 * Shows a friend's active proposal so the current user can vote on it.
 * Fetches the real proposal from the proposals table (not mock data).
 * Accessed by tapping "Match" on a friend in the Community area.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types';
import { Proposal } from '../../types/community';
import { ProposalReviewView, DeepQuestionData } from '../../components/community/proposal/ProposalReviewView';
import { communityService } from '../../services/communityServiceIndex';
import { getFriendActiveProposal, DeepQuestionData as DQData } from '../../services/friendProposalService';
import { createLogger } from '../../utils/secureLogger';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { ScreenWrapper } from '../../components/ui';

const logger = createLogger('FriendProposalScreen');

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

  // Fetch the friend's active proposal from the service
  useEffect(() => {
    let cancelled = false;

    async function fetchFriendProposal() {
      try {
        setLoading(true);
        setError(null);

        const result = await getFriendActiveProposal(friendId, friendName);

        if (cancelled) return;

        if ('error' in result) {
          setError(result.error);
        } else {
          setProposal(result.proposal);
          setDeepQuestions(result.deepQuestions);
        }
      } catch (err: any) {
        logger.error('[FriendProposalScreen] Error fetching proposal:', err);
        if (!cancelled) {
          setError('Failed to load proposal. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFriendProposal();
    return () => { cancelled = true; };
  }, [friendId, friendName]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVoteComplete = useCallback(() => {
    // Vote is already recorded via ProposalReviewView → submitProposalVote
    communityService.markFriendAsHelped(friendId).catch(() => {});
    // Invalidate friends cache so the friends area refreshes on return
    if ('invalidateFriendsCache' in communityService) {
      (communityService as any).invalidateFriendsCache();
    }
    navigation.goBack();
  }, [friendId, navigation]);

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primaryAccent} />
          <Text style={{ marginTop: 12, color: COLORS.text.label, fontSize: FONT_SIZES.base }}>
            Loading {friendName}'s proposal...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !proposal) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: FONT_SIZES.xl, color: '#344054', textAlign: 'center', marginBottom: 16 }}>
            {error || 'No proposal found'}
          </Text>
          <TouchableOpacity
            onPress={handleBack}
            style={{
              backgroundColor: COLORS.primaryAccent,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: FONT_SIZES.xl, fontWeight: '600', fontFamily: FONTS.semiBold }}>Go Back</Text>
          </TouchableOpacity>
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
