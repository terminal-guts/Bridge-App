/**
 * FriendProposalScreen
 *
 * Shows a friend's active proposal so the current user can vote on it.
 * Fetches the real proposal from the proposals table (not mock data).
 * Accessed by tapping "Match" on a friend in the Community area.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StatusBar, ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { EvaIcon  } from '../../components/icons';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types';
import { Proposal, UserProfile } from '../../types/community';
import { ProposalReviewView, DeepQuestionData } from '../../components/community/proposal/ProposalReviewView';
import { communityService } from '../../services/communityServiceIndex';
import { supabase } from '../../lib/supabase';
import { transformBackendProposal } from '../../services/proposalApiService';
import { mapProfileRow, resolveProfilePhotos } from '../../services/communityBackendService';
import { createLogger } from '../../utils/secureLogger';
import { getQuestionById } from '../../utils/deepQuestions';

const logger = createLogger('FriendProposalScreen');
const StyledSafeAreaView = styled(SafeAreaView);

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

  // Fetch the friend's active proposal from the DB
  useEffect(() => {
    let cancelled = false;

    async function fetchFriendProposal() {
      try {
        setLoading(true);
        setError(null);

        // Find the friend's active proposal (they could be user_a or user_b)
        // Fire both queries in parallel to avoid sequential waterfall
        const [{ data: proposalA }, { data: proposalB }] = await Promise.all([
          supabase
            .from('proposals')
            .select('*')
            .eq('user_a_id', friendId)
            .eq('status', 'pending')
            .maybeSingle(),
          supabase
            .from('proposals')
            .select('*')
            .eq('user_b_id', friendId)
            .eq('status', 'pending')
            .maybeSingle(),
        ]);

        const rawProposal = proposalA || proposalB;

        if (cancelled) return;

        if (!rawProposal) {
          setError(`${friendName} doesn't have an active proposal right now.`);
          setLoading(false);
          return;
        }

        // Fetch both user profiles for the proposal
        const [{ data: profileA }, { data: profileB }] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', rawProposal.user_a_id)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', rawProposal.user_b_id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const transformed = transformBackendProposal(rawProposal);

        const userA: UserProfile = profileA
          ? mapProfileRow(profileA)
          : { id: rawProposal.user_a_id, firstName: 'User A', photos: [] } as any;

        const userB: UserProfile = profileB
          ? mapProfileRow(profileB)
          : { id: rawProposal.user_b_id, firstName: 'User B', photos: [] } as any;

        // Resolve photos + fetch deep questions in parallel
        const [, dqAResult, dqBResult] = await Promise.all([
          resolveProfilePhotos([userA, userB]),
          supabase
            .from('deep_question_answers')
            .select('user_id, answers, displayed_question_ids')
            .eq('user_id', rawProposal.user_a_id)
            .maybeSingle(),
          supabase
            .from('deep_question_answers')
            .select('user_id, answers, displayed_question_ids')
            .eq('user_id', rawProposal.user_b_id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        // Build deep questions data — find questions both users answered
        const dqA = dqAResult.data;
        const dqB = dqBResult.data;
        const sharedQuestions: DeepQuestionData[] = [];
        if (dqA?.answers && dqB?.answers) {
          const answersA = dqA.answers as Record<string, string>;
          const answersB = dqB.answers as Record<string, string>;
          const displayedA = new Set((dqA.displayed_question_ids || []).map(String));
          const displayedB = new Set((dqB.displayed_question_ids || []).map(String));

          const allAIds = Object.keys(answersA);
          const allBIds = new Set(Object.keys(answersB));
          const sharedIds = allAIds.filter(id => allBIds.has(id) && answersA[id] && answersB[id]);

          // Sort: displayed by both first, then displayed by one, then others
          sharedIds.sort((a, b) => {
            const aScore = (displayedA.has(a) ? 2 : 0) + (displayedB.has(a) ? 2 : 0);
            const bScore = (displayedA.has(b) ? 2 : 0) + (displayedB.has(b) ? 2 : 0);
            return bScore - aScore;
          });

          for (const qId of sharedIds.slice(0, 3)) {
            const questionDef = getQuestionById(Number(qId));
            if (questionDef) {
              sharedQuestions.push({
                questionId: Number(qId),
                questionText: questionDef.question,
                userAAnswer: answersA[qId],
                userBAnswer: answersB[qId],
              });
            }
          }
        }
        setDeepQuestions(sharedQuestions);

        const fullProposal: Proposal = {
          ...transformed,
          userA,
          userB,
          endorsements: [],
          votingThreshold: 20,
          baseThreshold: 20,
          proposalDate: rawProposal.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          votingExpiresAt: rawProposal.voting_expires_at || new Date(Date.now() + 5 * 24 * 3600000).toISOString(),
        } as Proposal;

        setProposal(fullProposal);
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
    communityService.invalidateFriendsCache();
    navigation.goBack();
  }, [friendId, navigation]);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white items-center justify-center">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#437FFF" />
        <Text style={{ marginTop: 12, color: '#667085', fontSize: 14 }}>
          Loading {friendName}'s proposal...
        </Text>
      </StyledSafeAreaView>
    );
  }

  if (error || !proposal) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <StatusBar barStyle="dark-content" />
        <Text style={{ fontSize: 16, color: '#344054', textAlign: 'center', marginBottom: 16 }}>
          {error || 'No proposal found'}
        </Text>
        <TouchableOpacity
          onPress={handleBack}
          style={{
            backgroundColor: '#437FFF',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <ProposalReviewView
        initialProposals={[proposal]}
        showBackButton={true}
        onBack={handleBack}
        onVoteComplete={handleVoteComplete}
        deepQuestions={deepQuestions}
      />
    </StyledSafeAreaView>
  );
}

export default FriendProposalScreen;
