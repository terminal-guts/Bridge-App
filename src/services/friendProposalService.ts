/**
 * Friend Proposal Service — queued friend-to-friend match suggestions.
 *
 * Suggestions are queued and converted to proposals at the next 7PM cycle.
 * A friend is eligible if they have no proposal or a pending proposal.
 * Friends with deciding or more advanced proposals are ineligible.
 */

import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import { mapProfileRow } from './communityBackendService';

/**
 * Submit a friend match suggestion. Queued for the next 7PM cycle.
 */
export async function createFriendSuggestion(
  userAId: string,
  userBId: string,
): Promise<{ suggestionId: string; expiresAt: string }> {
  const { data, error } = await supabase.functions.invoke('suggest-friend-match', {
    body: { user_a_id: userAId, user_b_id: userBId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { suggestionId: data.suggestion_id, expiresAt: data.expires_at };
}

/**
 * Get friends eligible for friend-to-friend suggestions.
 *
 * Eligible = completed profile, not suspended, AND either:
 * - No active proposal at all, OR
 * - Has a pending proposal (will be expired at 7PM if suggestion takes priority)
 *
 * NOT eligible if:
 * - Has a deciding or more advanced proposal
 * - Already has a queued/stashed friend suggestion
 */
export async function getEligibleFriends(): Promise<UserProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's friend IDs
    const { data: friendships, error: friendsErr } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsErr || !friendships?.length) return [];

    const friendIds = friendships.map(f =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    // Get friend profiles that are completed and not suspended
    const { data: profiles, error: profilesErr } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', friendIds)
      .eq('profile_completed', true)
      .eq('is_suspended', false);

    if (profilesErr || !profiles?.length) return [];

    // Get proposals in deciding or more advanced state — these users are ineligible
    const { data: advancedProposals } = await supabase
      .from('proposals')
      .select('user_a_id, user_b_id')
      .in('status', ['deciding', 'candidate_match', 'confirmed', 'accepted']);

    const usersInAdvancedState = new Set<string>();
    (advancedProposals || []).forEach(p => {
      usersInAdvancedState.add(p.user_a_id);
      usersInAdvancedState.add(p.user_b_id);
    });

    // Get users who already have a queued or stashed friend suggestion
    const { data: activeSuggestions } = await supabase
      .from('friend_suggestions')
      .select('user_a_id, user_b_id')
      .in('status', ['queued', 'stashed']);

    const usersWithSuggestion = new Set<string>();
    (activeSuggestions || []).forEach(s => {
      usersWithSuggestion.add(s.user_a_id);
      usersWithSuggestion.add(s.user_b_id);
    });

    return profiles
      .filter(p =>
        !usersInAdvancedState.has(p.user_id) &&
        !usersWithSuggestion.has(p.user_id)
      )
      .map(mapProfileRow);
  } catch {
    return [];
  }
}

/**
 * Get the current user's active friend suggestions (for displaying status on friend cards).
 * Returns a map of userId -> { suggestedForName, status }.
 */
export async function getActiveSuggestions(): Promise<
  Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>
> {
  const result = new Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return result;

    const { data: suggestions } = await supabase
      .from('friend_suggestions')
      .select('user_a_id, user_b_id, status')
      .eq('suggested_by', user.id)
      .in('status', ['queued', 'stashed']);

    if (!suggestions?.length) return result;

    // Get names for the suggested users
    const userIds = new Set<string>();
    suggestions.forEach(s => {
      userIds.add(s.user_a_id);
      userIds.add(s.user_b_id);
    });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, first_name')
      .in('user_id', Array.from(userIds));

    const nameMap = new Map<string, string>();
    (profiles || []).forEach(p => nameMap.set(p.user_id, p.first_name));

    // For each suggestion, add both users to the result map
    for (const s of suggestions) {
      const nameA = nameMap.get(s.user_a_id) || 'someone';
      const nameB = nameMap.get(s.user_b_id) || 'someone';
      result.set(s.user_a_id, { suggestedForName: nameB, status: s.status });
      result.set(s.user_b_id, { suggestedForName: nameA, status: s.status });
    }
  } catch {
    // Non-blocking
  }
  return result;
}
