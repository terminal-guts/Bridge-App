// DEFERRED: Crush feature — dormant by product decision.
// Do not import or call any functions from this file until re-enabled.
//
// To re-enable, make changes in ALL of the following files:
// 1. communityBackendService.friends.ts — uncomment the getMyCrushIds/getCrushedOnMeIds imports
//    and the hasCrushed/crushedOnMe field assignments in the friend data builder
// 2. CommunityScreen.tsx — uncomment the onCrushPress callback prop
// 3. CommunityScreen.components.tsx — uncomment the buildCrewHandlers crush parameter
//
// IMPORTANT: When re-enabling, mutual crush proposal creation MUST go through an edge function.
// Do NOT use client-side Supabase inserts to create proposals (security risk — clients can
// forge proposals for arbitrary user pairs). Replace createCrushProposal() in this file with
// a call to a server-side edge function that validates the mutual crush and creates the proposal.

/**
 * Crush Service
 *
 * Partiful-style secret crush system. Friends can secretly crush on each other.
 * When both friends crush each other (mutual crush), a proposal is automatically
 * created to add the pair to the matchmaking grid.
 */

import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CrushService');

export interface CrushResult {
  ok: boolean;
  isMutual: boolean;
  error?: string;
}

/**
 * Send a crush to a friend. If the friend has already crushed on you,
 * this creates a mutual crush and auto-creates a proposal.
 */
export async function sendCrush(crushId: string): Promise<CrushResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, isMutual: false, error: 'Not authenticated' };

  // Insert the crush row
  const { error: insertError } = await supabase
    .from('crushes')
    .insert({ user_id: userId, crush_id: crushId });

  if (insertError) {
    // Duplicate crush — already sent
    if (insertError.code === '23505') {
      return { ok: true, isMutual: false };
    }
    logger.error('Failed to send crush:', insertError.message);
    return { ok: false, isMutual: false, error: insertError.message };
  }

  // Check if mutual (the other person already crushed on us)
  const { data: isMutual } = await supabase.rpc('check_mutual_crush', {
    p_crush_id: crushId,
  });

  if (isMutual) {
    // Auto-create a proposal for the mutual crush pair
    await createCrushProposal(userId, crushId);
  }

  return { ok: true, isMutual: !!isMutual };
}

/**
 * Remove a crush (un-crush).
 */
export async function removeCrush(crushId: string): Promise<{ ok: boolean }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false };

  const { error } = await supabase
    .from('crushes')
    .delete()
    .eq('user_id', userId)
    .eq('crush_id', crushId);

  if (error) {
    logger.error('Failed to remove crush:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

/**
 * Get the set of friend IDs that the current user has crushed on.
 * Used to show crush state on friend cards.
 */
export async function getMyCrushIds(): Promise<Set<string>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from('crushes')
    .select('crush_id')
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to fetch crushes:', error.message);
    return new Set();
  }
  return new Set((data || []).map(r => r.crush_id));
}

/**
 * Get the set of friend IDs who have crushed on the current user.
 * Used for mutual crush detection in the UI without revealing who.
 */
export async function getCrushedOnMeIds(): Promise<Set<string>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new Set();

  // We can't read other people's crushes via RLS (crushes_select_own).
  // Use the check_mutual_crush RPC instead — but that's per-user.
  // For batch checking, we need a server-side function.
  // Alternative: use a separate RPC for batch checking.
  // For now, we'll use a lightweight RPC.
  const { data, error } = await supabase.rpc('get_crushes_on_me');

  if (error) {
    // RPC might not exist yet — graceful fallback
    logger.warn('get_crushes_on_me RPC not available:', error.message);
    return new Set();
  }
  return new Set((data || []).map((r: { user_id: string }) => r.user_id));
}

// ============================================================================
// Internal: Create proposal for mutual crush
// ============================================================================

/**
 * Create a proposal for a mutual crush pair.
 * Skips creation if the pair already has an active/recent proposal.
 */
async function createCrushProposal(userAId: string, userBId: string): Promise<void> {
  // Normalize ordering: smaller UUID first (consistent with unique_proposal_pairs constraint)
  const [sortedA, sortedB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

  // Check if pair already has an active proposal (pending/deciding)
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('user_a_id', sortedA)
    .eq('user_b_id', sortedB)
    .in('status', ['pending', 'deciding', 'passed_to_match'])
    .limit(1);

  if (existing && existing.length > 0) {
    logger.info('Crush proposal skipped — pair already has active proposal');
    return;
  }

  // Also check reverse ordering (proposals don't enforce a < b ordering universally)
  const { data: existingReverse } = await supabase
    .from('proposals')
    .select('id')
    .eq('user_a_id', sortedB)
    .eq('user_b_id', sortedA)
    .in('status', ['pending', 'deciding', 'passed_to_match'])
    .limit(1);

  if (existingReverse && existingReverse.length > 0) {
    logger.info('Crush proposal skipped — pair already has active proposal (reverse)');
    return;
  }

  // Create the proposal — mutual crushes skip community voting and go
  // directly to deciding status so both users can accept immediately
  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('proposals').insert({
    user_a_id: sortedA,
    user_b_id: sortedB,
    status: 'deciding',
    creation_type: 'friend_proposal',
    created_by: null, // System-generated from mutual crush
    compatibility_score: 95, // High score — both expressed interest
    passed_to_users_at: now,
    decision_deadline_at: deadline,
    voting_started_at: now,
    voting_expires_at: now, // No voting window needed
  });

  if (error) {
    logger.error('Failed to create crush proposal:', error.message);
  } else {
    logger.info('Mutual crush proposal created for pair:', sortedA, sortedB);
  }
}
