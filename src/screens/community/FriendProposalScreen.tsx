/**
 * FriendProposalScreen
 *
 * Shows a friend's active proposal so the current user can vote on it.
 * Fetches the real proposal from the proposals table (not mock data).
 * Accessed by tapping "Match" on a friend in the Community area.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StatusBar, ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../types';
import { Proposal } from '../../types/community';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { communityService } from '../../services/communityServiceIndex';
import { supabase } from '../../lib/supabase';
import { transformBackendProposal } from '../../services/proposalApiService';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('FriendProposalScreen');
const StyledSafeAreaView = styled(SafeAreaView);

interface FriendProposalScreenProps {
  navigation: NavigationProp<RootStackParamList, 'FriendProposal'>;
  route: RouteProp<RootStackParamList, 'FriendProposal'>;
}

export function FriendProposalScreen({ navigation, route }: FriendProposalScreenProps) {
  const { friendId, friendName } = route.params;
  const [proposal, setProposal] = useState<Proposal | null>(null);
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
        const { data: proposalA } = await supabase
          .from('proposals')
          .select('*')
          .eq('user_a_id', friendId)
          .eq('status', 'pending')
          .maybeSingle();

        const { data: proposalB } = !proposalA
          ? await supabase
              .from('proposals')
              .select('*')
              .eq('user_b_id', friendId)
              .eq('status', 'pending')
              .maybeSingle()
          : { data: null };

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

        // Build minimal UserProfile objects from raw DB rows
        const buildProfile = (row: any, fallbackId: string) => {
          if (!row) return { id: fallbackId, firstName: 'User' } as any;
          return {
            id: row.user_id || row.id,
            userId: row.user_id || row.id,
            firstName: (row.first_name || '').replace(/[''"`]+$/, '').trim(),
            lastName: (row.last_name || '').replace(/[''"`]+$/, '').trim(),
            age: row.age || 0,
            gender: row.gender || [],
            pronouns: row.pronouns || '',
            height: row.height || '',
            ethnicity: row.ethnicity || '',
            religion: row.religion || '',
            politicalLeaning: row.political_leaning || '',
            location: row.location || row.where_live_now || '',
            currentJob: row.current_job || '',
            educationLevel: row.education_level || '',
            school: row.school || '',
            photos: ((row.photos && row.photos.length > 0)
              ? row.photos
              : (row.profile_photo_path ? [{ id: '1', url: row.profile_photo_path, is_main: true, display_order: 0 }] : [])
            ).filter((p: any) => p.url && !p.url.startsWith('file://')).map((p: any) => ({
              id: p.id || p.url,
              url: p.url,
              isMain: p.is_main ?? p.isMain ?? false,
              order: p.display_order ?? p.order ?? 0,
            })),
            interests: row.interests || [],
            values: row.values || [],
            bio: row.bio || '',
            lifestyle: row.lifestyle || {},
            nonNegotiables: row.non_negotiables || [],
            preferences: row.preferences || {},
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        };

        const fullProposal: Proposal = {
          ...transformed,
          userA: buildProfile(profileA, rawProposal.user_a_id),
          userB: buildProfile(profileB, rawProposal.user_b_id),
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
      />
    </StyledSafeAreaView>
  );
}

export default FriendProposalScreen;
