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
