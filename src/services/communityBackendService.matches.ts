/**
 * Community Backend Service - Match operations
 *
 * Extracted from communityBackendService.ts for file-size management.
 * Contains: fetchActiveMatch, endMatch, detectEndedMatchEvent, detectPartnerDeclinedProposal.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  ActiveMatch,
  UserProfile,
  MatchEndedEvent,
  ACTIVE_MATCH_MINIMUM_DAYS,
} from '../types/community';
import { createLogger } from '../utils/secureLogger';
import { mapProfileRow, resolveProfilePhotos, getCurrentUserId } from './communityBackendService.helpers';

const logger = createLogger('CommunityBackend');

// ============================================================================
// Active Match
// ============================================================================

export async function fetchActiveMatch(
  setPendingEndedEvent: (event: MatchEndedEvent) => void,
  getPendingEndedEvent: () => MatchEndedEvent | null,
): Promise<ActiveMatch | null> {
  const userId = await getCurrentUserId();

  // Single query for both directions using .or()
  const { data: matches } = await supabase
    .from('matches')
    .select('id, user_id_1, user_id_2, status, proposal_id, created_at')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .in('status', ['active', 'accepted'])
    .limit(1);

  const match = matches?.[0] || null;
  if (!match) {
    // No active match — check if a match was recently ended by the OTHER user
    // so we can show the "match ended" popup
    if (!getPendingEndedEvent()) {
      await detectEndedMatchEvent(userId, setPendingEndedEvent);
    }
    return null;
  }

  const partnerId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

  // Fire partner profile, message count, and endorser queries ALL in parallel
  const [{ data: partnerRow }, { count: messageCount }, endorserData] = await Promise.all([
    supabase.from('user_profiles').select('user_id, first_name, last_name, age, gender, pronouns, location, current_job, profile_photo_path, photos, interests, values, bio').eq('user_id', partnerId).maybeSingle(),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('match_id', match.id),
    match.proposal_id
      ? supabase.from('proposal_votes').select('voter_user_id').eq('proposal_id', match.proposal_id).eq('vote_type', 'YES').limit(3)
      : Promise.resolve({ data: null }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
  const partnerProfile = partnerRow ? mapProfileRow(partnerRow as Record<string, any>) : { id: partnerId, firstName: 'Match', photos: [] } as unknown as UserProfile;

  const matchedAt = new Date(match.created_at);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilCanEnd = Math.max(0, ACTIVE_MATCH_MINIMUM_DAYS - daysActive);

  // Resolve endorser profiles in parallel with partner photo signing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial endorser data for display only
  let endorsers: any[] = [];
  const yesVotes = endorserData?.data;

  if (yesVotes && yesVotes.length > 0) {
    const voterIds = yesVotes.map((v) => v.voter_user_id);
    const [{ data: voterRows }, { data: voterPhotos }] = await Promise.all([
      supabase.from('user_profiles').select('user_id, first_name, last_name, profile_photo_path, photos').in('user_id', voterIds),
      supabase.from('user_photos').select('user_id, storage_path, is_main').in('user_id', voterIds).eq('is_main', true),
    ]);

    if (voterRows && voterRows.length > 0) {
      const voterProfiles = voterRows.map(mapProfileRow);

      if (voterPhotos && voterPhotos.length > 0) {
        const mainPhotoByUser = new Map<string, string>();
        for (const p of voterPhotos) {
          if (!mainPhotoByUser.has(p.user_id)) mainPhotoByUser.set(p.user_id, p.storage_path);
        }
        for (const profile of voterProfiles) {
          if (profile.photos.length === 0 && mainPhotoByUser.has(profile.userId)) {
            const path = mainPhotoByUser.get(profile.userId)!;
            profile.photos = [{ id: path, url: path, isMain: true, order: 0 }];
          }
        }
      }

      // Sign partner + endorser photos in one batch
      await resolveProfilePhotos([partnerProfile, ...voterProfiles]);
      const voterMap = new Map(voterProfiles.map(p => [p.userId, p]));
      endorsers = voterIds
        .map((vid: string) => ({ endorserProfile: voterMap.get(vid) }))
        .filter((e): e is { endorserProfile: UserProfile } => !!e.endorserProfile);
    }
  } else {
    await resolveProfilePhotos([partnerProfile]);
  }

  return {
    id: match.id,
    matchId: match.id,
    proposalId: match.proposal_id,
    matchedUser: partnerProfile,
    partnerProfile,
    matchedAt: match.created_at,
    canEndAt: new Date(matchedAt.getTime() + ACTIVE_MATCH_MINIMUM_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    daysActive,
    daysUntilCanEnd,
    canEndMatch: daysUntilCanEnd <= 0,
    chatId: match.id,
    messagesExchanged: messageCount || 0,
    endorsers,
  };
}

// ============================================================================
// End Match
// ============================================================================

export async function endMatch(
  matchId: string,
  reason: string,
  partnerInfo: { name: string; photoUrl?: string } | undefined,
  setPendingEndedEvent: (event: MatchEndedEvent) => void,
): Promise<void> {
  const userId = await getCurrentUserId();

  // Get match details for exit record
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match) throw new Error('Match not found');

  const matchedAt = new Date(match.created_at);
  const daysSinceMatch = Math.floor((Date.now() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceMatch < ACTIVE_MATCH_MINIMUM_DAYS) {
    throw new Error(`Cannot end match for ${ACTIVE_MATCH_MINIMUM_DAYS - daysSinceMatch} more day(s)`);
  }

  // Count messages exchanged
  const { count: messageCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId);

  // Create exit record
  await supabase.from('match_exits').insert({
    match_id: matchId,
    exiting_user_id: userId,
    exit_reason: reason,
    days_since_match: daysSinceMatch,
    messages_exchanged: messageCount || 0,
  });

  // Update match status
  await supabase
    .from('matches')
    .update({ status: 'ended', updated_at: new Date().toISOString() })
    .eq('id', matchId);

  // Set ended event so MatchesScreen shows the "A Fresh Start" popup
  if (partnerInfo) {
    setPendingEndedEvent({
      type: 'match_ended',
      eventId: `end-match-${matchId}-${Date.now()}`,
      partnerName: partnerInfo.name,
      partnerPhotoUrl: partnerInfo.photoUrl,
    });
  }
}

// ============================================================================
// Detect ended match events
// ============================================================================

/**
 * Check if a match was recently ended by the OTHER user.
 * If so, set pendingEndedEvent so MatchesScreen can show the popup.
 * Uses AsyncStorage to avoid showing the same event twice.
 */
export async function detectEndedMatchEvent(
  userId: string,
  setPendingEndedEvent: (event: MatchEndedEvent) => void,
): Promise<void> {
  try {
    // Find recently ended matches involving this user where someone ELSE exited
    const { data: recentExits } = await supabase
      .from('match_exits')
      .select(`
        id,
        match_id,
        exiting_user_id,
        exit_reason,
        created_at,
        matches:match_id (
          user_id_1,
          user_id_2,
          status
        )
      `)
      .neq('exiting_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentExits || recentExits.length === 0) return;

    // Find one where this user was the OTHER person in the match
    for (const exit of recentExits) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB join may return array or single object
      const matchRaw = exit.matches as any;
      const match: Record<string, any> | null = Array.isArray(matchRaw) ? matchRaw[0] ?? null : matchRaw;
      if (!match || match.status !== 'ended') continue;
      if (match.user_id_1 !== userId && match.user_id_2 !== userId) continue;

      const eventId = `end-match-${exit.match_id}`;
      const alreadySeen = await AsyncStorage.getItem(`match_popup_seen_${eventId}`);
      if (alreadySeen) continue;

      // Fetch the partner (exiting user) profile for the popup
      const { data: partnerRow } = await supabase
        .from('user_profiles')
        .select('first_name, profile_photo_path')
        .eq('user_id', exit.exiting_user_id)
        .maybeSingle();

      let photoUrl: string | undefined;
      if (partnerRow?.profile_photo_path) {
        const { data: signedData } = await supabase.storage
          .from('photos')
          .createSignedUrl(partnerRow.profile_photo_path, 3600);
        photoUrl = signedData?.signedUrl;
      }

      setPendingEndedEvent({
        type: 'match_ended',
        eventId,
        partnerName: partnerRow?.first_name || 'Your match',
        partnerPhotoUrl: photoUrl,
        endReason: exit.exit_reason || undefined,
      });
      return; // Show one at a time
    }
  } catch (error) {
    // Silent fail — popup is non-critical
    console.warn('detectEndedMatchEvent failed:', error);
  }
}

/**
 * Check for recently declined proposals where you accepted but the partner
 * declined. Sets pendingEndedEvent so MatchesScreen shows the popup.
 */
export async function detectPartnerDeclinedProposal(
  setPendingEndedEvent: (event: MatchEndedEvent) => void,
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    // Find proposals declined in the last 24h where this user accepted but partner declined
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: declined, error: qErr } = await supabase
      .from('proposals')
      .select('id, user_a_id, user_b_id, user_a_decision, user_b_decision, declined_at')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'declined')
      .gte('declined_at', cutoff)
      .order('declined_at', { ascending: false })
      .limit(1);

    if (qErr || !declined || declined.length === 0) return;

    const prop = declined[0];
    const isUserA = prop.user_a_id === userId;
    const myDecision = isUserA ? prop.user_a_decision : prop.user_b_decision;
    const theirDecision = isUserA ? prop.user_b_decision : prop.user_a_decision;

    // Fire if they declined (regardless of whether I voted or not)
    if (theirDecision !== 'declined') return;
    // Don't fire if I was the one who declined (that's the you_rejected path)
    if (myDecision === 'declined') return;

    const eventId = `they-declined-${prop.id}-${prop.declined_at}`;
    const alreadySeen = await AsyncStorage.getItem(`match_popup_seen_${eventId}`);
    if (alreadySeen) return;

    // Fetch partner name for the popup
    const partnerId = isUserA ? prop.user_b_id : prop.user_a_id;
    const { data: partnerRow } = await supabase
      .from('user_profiles')
      .select('first_name, profile_photo_path')
      .eq('user_id', partnerId)
      .maybeSingle();

    let photoUrl: string | undefined;
    if (partnerRow?.profile_photo_path) {
      const { data: signedData } = await supabase.storage
        .from('photos')
        .createSignedUrl(partnerRow.profile_photo_path, 3600);
      photoUrl = signedData?.signedUrl;
    }

    setPendingEndedEvent({
      type: 'they_rejected',
      eventId,
      partnerName: partnerRow?.first_name || 'Your match',
      partnerPhotoUrl: photoUrl,
    });
  } catch {
    // Silent — don't break the main data load
  }
}
