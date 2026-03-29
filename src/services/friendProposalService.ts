/**
 * Friend Proposal Service
 *
 * Provides helpers for viewing a friend's active proposal.
 */

import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import type { Proposal } from '../types/community';
import { mapProfileRow, resolveProfilePhotos } from './communityBackendService';
import { transformBackendProposal } from './proposalApiService';
import { getQuestionById } from '../utils/deepQuestions';

/**
 * Deep question data for proposal display.
 */
export interface DeepQuestionData {
  questionId: number;
  questionText: string;
  userAAnswer?: string;
  userBAnswer?: string;
}

/**
 * Fetch a friend's active proposal with full profiles and deep questions.
 * Returns the complete Proposal object and deep question data, or an error string.
 */
export async function getFriendActiveProposal(
  friendId: string,
  friendName: string,
): Promise<{ proposal: Proposal; deepQuestions: DeepQuestionData[] } | { error: string }> {
  // Find the friend's active proposal (they could be user_a or user_b)
  const proposalColumns = 'id, user_a_id, user_b_id, status, pool_yes_votes, pool_no_votes, friend_yes_votes, friend_no_votes, compatibility_score, category_scores, voting_started_at, confirmed_at, rejected_at, expired_at, sent_to_users_at, decision_deadline_at, user_a_decision, user_b_decision, user_a_decided_at, user_b_decided_at, created_at, updated_at, vote_context, voting_expires_at';
  const [{ data: proposalA }, { data: proposalB }] = await Promise.all([
    supabase
      .from('proposals')
      .select(proposalColumns)
      .eq('user_a_id', friendId)
      .eq('status', 'pending')
      .maybeSingle(),
    supabase
      .from('proposals')
      .select(proposalColumns)
      .eq('user_b_id', friendId)
      .eq('status', 'pending')
      .maybeSingle(),
  ]);

  const rawProposal = proposalA || proposalB;
  if (!rawProposal) {
    return { error: `${friendName} doesn't have an active proposal right now.` };
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

  const transformed = transformBackendProposal(rawProposal);

  const userA: UserProfile = profileA
    ? mapProfileRow(profileA)
    : { id: rawProposal.user_a_id, firstName: 'User A', photos: [] } as unknown as UserProfile;

  const userB: UserProfile = profileB
    ? mapProfileRow(profileB)
    : { id: rawProposal.user_b_id, firstName: 'User B', photos: [] } as unknown as UserProfile;

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

  // Build deep questions data
  const dqA = dqAResult.data;
  const dqB = dqBResult.data;
  const allQuestions: DeepQuestionData[] = [];
  const answersA = (dqA?.answers || {}) as Record<string, string>;
  const answersB = (dqB?.answers || {}) as Record<string, string>;
  const displayedA = new Set((dqA?.displayed_question_ids || []).map(String));
  const displayedB = new Set((dqB?.displayed_question_ids || []).map(String));

  const allQIds = new Set([...Object.keys(answersA), ...Object.keys(answersB)]);
  const qIdArray = Array.from(allQIds);

  qIdArray.sort((a, b) => {
    const aShared = answersA[a] && answersB[a] ? 4 : 0;
    const bShared = answersA[b] && answersB[b] ? 4 : 0;
    const aDisp = (displayedA.has(a) ? 1 : 0) + (displayedB.has(a) ? 1 : 0);
    const bDisp = (displayedA.has(b) ? 1 : 0) + (displayedB.has(b) ? 1 : 0);
    return (bShared + bDisp) - (aShared + aDisp);
  });

  for (const qId of qIdArray.slice(0, 5)) {
    const questionDef = getQuestionById(Number(qId));
    if (questionDef && (answersA[qId] || answersB[qId])) {
      allQuestions.push({
        questionId: Number(qId),
        questionText: questionDef.question,
        userAAnswer: answersA[qId] || undefined,
        userBAnswer: answersB[qId] || undefined,
      });
    }
  }

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

  return { proposal: fullProposal, deepQuestions: allQuestions };
}

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
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error(error.message);
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

    const mapped = profiles
      .filter(p =>
        p.role !== 'matchmaker' &&
        !usersInAdvancedState.has(p.user_id) &&
        !usersWithSuggestion.has(p.user_id)
      )
      .map(mapProfileRow);

    await resolveProfilePhotos(mapped);
    return mapped;
  } catch {
    return [];
  }
}

/**
 * Get the current user's active friend suggestions (for displaying status on friend cards).
 * Returns a map of userId -> { suggestedForName, status }.
 * Cached in-memory for 60s to avoid redundant DB hits on tab switches.
 */
let suggestionsCache: { data: Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>; ts: number } | null = null;
const SUGGESTIONS_CACHE_TTL = 60_000;

export async function getActiveSuggestions(): Promise<
  Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>
> {
  if (suggestionsCache && Date.now() - suggestionsCache.ts < SUGGESTIONS_CACHE_TTL) {
    return suggestionsCache.data;
  }

  const result = new Map<string, { suggestedForName: string; status: 'queued' | 'stashed' }>();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return result;

    const { data: suggestions } = await supabase
      .from('friend_suggestions')
      .select('user_a_id, user_b_id, status')
      .eq('suggested_by', user.id)
      .in('status', ['queued', 'stashed']);

    if (!suggestions?.length) {
      suggestionsCache = { data: result, ts: Date.now() };
      return result;
    }

    // Get names for the suggested users
    const userIds = new Set<string>();
    suggestions.forEach(s => {
      userIds.add(s.user_a_id);
      userIds.add(s.user_b_id);
    });

    const { data: profileRows } = await supabase
      .from('user_profiles')
      .select('user_id, first_name')
      .in('user_id', Array.from(userIds));

    const nameMap = new Map<string, string>();
    (profileRows || []).forEach(p => nameMap.set(p.user_id, p.first_name));

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
  suggestionsCache = { data: result, ts: Date.now() };
  return result;
}
