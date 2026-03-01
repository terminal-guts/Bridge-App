/**
 * Community Backend Service - REAL IMPLEMENTATION
 *
 * Connects to Supabase for friends/matches/karma data
 * and Edge Functions for proposal voting/generation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getNext7PMCentral } from '../utils/centralTime';
import { getMultiplePhotoSignedUrls } from './photoService';
import {
  DailyGrid,
  Proposal,
  ActiveMatch,
  KarmaScore,
  KarmaTier,
  UserProfile,
  CommunityTask,
  FriendWithGridStatus,
  FriendshipTier,
  MatchEndedEvent,
  ACTIVE_MATCH_MINIMUM_DAYS,
} from '../types/community';
import {
  getProposalsForVoting,
  castProposalVote,
  getPendingDecisions,
  decideOnProposal,
  transformBackendProposal,
} from './proposalApiService';
import { getBlockedUserIds } from './blockService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityBackend');

// ============================================================================
// Helpers
// ============================================================================

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user.id;
}

function mapProfileRow(row: any): UserProfile {
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
    companyPosition: row.company_position || '',
    educationLevel: row.education_level || '',
    school: row.school || '',
    photos: ((row.photos && row.photos.length > 0)
      ? row.photos
      : (row.profile_photo_path ? [{ id: '1', url: row.profile_photo_path, is_main: true, display_order: 0 }] : [])
    ).map((p: any) => ({
      id: p.id || p.url,
      url: p.url,
      isMain: p.is_main ?? p.isMain ?? false,
      order: p.display_order ?? p.order ?? 0,
    })),
    interests: row.interests || [],
    values: row.values || [],
    bio: row.bio || '',
    lifestyle: row.lifestyle || {},
    drinkingFrequency: row.drinking_frequency || '',
    cannabisFrequency: row.cannabis_frequency || '',
    tobaccoFrequency: row.tobacco_frequency || '',
    nonNegotiables: row.non_negotiables || [],
    preferences: row.preferences || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function deriveFriendshipTier(streakDays: number): FriendshipTier {
  if (streakDays >= 10) return 'best';
  if (streakDays >= 3) return 'great';
  return 'good';
}

function deriveKarmaTier(assists: number): KarmaTier {
  if (assists >= 25) return 'elite';
  if (assists >= 10) return 'trusted';
  if (assists >= 3) return 'solid';
  return 'new';
}

// ============================================================================
// Service
// ============================================================================

// AsyncStorage keys for the 24h daily cycle
const STORAGE_KEY_NEXT_RESET = '@bridge:next_reset_at';
const STORAGE_KEY_VOTES = '@bridge:votes_submitted';

class CommunityBackendService {
  // ── 24h daily-cycle timer ──────────────────────────────────────────────────
  private nextResetAt: number = getNext7PMCentral();
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.initTimerFromStorage();
  }

  private async initTimerFromStorage(): Promise<void> {
    try {
      const [storedReset, storedVotes] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_NEXT_RESET),
        AsyncStorage.getItem(STORAGE_KEY_VOTES),
      ]);

      if (storedReset) {
        const parsed = parseInt(storedReset, 10);
        if (!isNaN(parsed)) {
          if (Date.now() >= parsed) {
            // Reset window passed while app was closed — start fresh cycle.
            this.nextResetAt = getNext7PMCentral();
            this.sessionVoteCount = 0;
            this.sessionVotedProposals.clear();
            await Promise.all([
              AsyncStorage.setItem(STORAGE_KEY_NEXT_RESET, String(this.nextResetAt)),
              AsyncStorage.setItem(STORAGE_KEY_VOTES, '0'),
            ]);
          } else {
            this.nextResetAt = parsed;
            if (storedVotes) {
              const votes = parseInt(storedVotes, 10);
              if (!isNaN(votes)) this.sessionVoteCount = votes;
            }
          }
          return;
        }
      }

      // First install — seed storage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_NEXT_RESET, String(this.nextResetAt)),
        AsyncStorage.setItem(STORAGE_KEY_VOTES, '0'),
      ]);
    } catch {
      // AsyncStorage failure — proceed with in-memory defaults
    }
  }

  // Track votes locally for session (also persisted in DB)
  private sessionVoteCount = 0;
  // Track which proposal IDs were voted on this session to prevent double-counting re-votes
  private sessionVotedProposals = new Set<string>();

  // ========================================================================
  // Proposals (via Edge Functions)
  // ========================================================================

  async getProposalsToVote(): Promise<Proposal[]> {
    const userId = await getCurrentUserId();

    try {
      const [result, blockedIds] = await Promise.all([
        getProposalsForVoting(userId),
        getBlockedUserIds(userId)
      ]);

      const rawProposals = result.proposals || [];

      // Filter out proposals involving blocked users
      const filteredProposals = rawProposals.filter((raw: any) => {
        return !blockedIds.includes(raw.user_a_id) && !blockedIds.includes(raw.user_b_id);
      });

      // Transform backend proposals to frontend Proposal type
      return filteredProposals.map((raw: any) => {
        const transformed = transformBackendProposal(raw);

        // Build UserProfile objects from enriched profile data
        const userA: UserProfile = raw.user_a_profile
          ? mapProfileRow(raw.user_a_profile)
          : { id: raw.user_a_id, firstName: 'User A' } as UserProfile;

        const userB: UserProfile = raw.user_b_profile
          ? mapProfileRow(raw.user_b_profile)
          : { id: raw.user_b_id, firstName: 'User B' } as UserProfile;

        return {
          ...transformed,
          userA,
          userB,
          endorsements: [],
          votingThreshold: 20,
          baseThreshold: 20,
          proposalDate: raw.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          votingExpiresAt: raw.voting_expires_at || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        } as Proposal;
      });
    } catch (error: any) {
      logger.error('Failed to fetch proposals for voting', error.message);
      return [];
    }
  }

  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip', weight?: number): Promise<void> {
    if (vote === 'skip') return;

    const userId = await getCurrentUserId();
    const voteType = vote === 'yes' ? 'YES' : 'NO';

    await castProposalVote(proposalId, userId, voteType as any);
    if (!this.sessionVotedProposals.has(proposalId)) {
      this.sessionVotedProposals.add(proposalId);
      this.sessionVoteCount++;
      AsyncStorage.setItem(STORAGE_KEY_VOTES, String(this.sessionVoteCount)).catch(() => {});
    }
  }

  // ========================================================================
  // Grid (legacy - kept for interface compatibility)
  // ========================================================================

  async getTodaysGrid(): Promise<DailyGrid> {
    const userId = await getCurrentUserId();

    // Try to fetch from daily_surveys table
    const today = new Date().toISOString().split('T')[0];
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('*')
      .eq('ranker_user_id', userId)
      .eq('survey_date', today)
      .maybeSingle();

    if (!survey) {
      // Return empty grid - no survey assigned today
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const anchor = profile ? mapProfileRow(profile) : { id: userId, firstName: 'You' } as UserProfile;

      return {
        id: `grid-${today}`,
        anchorUserId: userId,
        anchor,
        candidates: [],
        gridDate: today,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        hasVoted: false,
        hasMatched: false,
      };
    }

    // Collect candidate IDs from separate columns
    const candidateIds = [
      survey.candidate_1_user_id,
      survey.candidate_2_user_id,
      survey.candidate_3_user_id,
    ].filter(Boolean);
    const candidates: UserProfile[] = [];

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', candidateIds);

      if (profiles) {
        candidates.push(...profiles.map(mapProfileRow));
      }
    }

    // Fetch anchor profile (recipient_user_id is the person being matched)
    const anchorId = survey.recipient_user_id || userId;
    const { data: anchorProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', anchorId)
      .maybeSingle();

    return {
      id: survey.id,
      anchorUserId: anchorId,
      anchor: anchorProfile ? mapProfileRow(anchorProfile) : { id: userId, firstName: 'You' } as UserProfile,
      candidates,
      gridDate: today,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: !!survey.is_completed,
      hasMatched: !!survey.is_completed,
    };
  }

  async submitDailyGridProposal(candidateId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('daily_surveys')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('ranker_user_id', userId)
      .eq('survey_date', today);
  }

  // ========================================================================
  // Friends (Supabase)
  // ========================================================================

  async getFriendsAsAnchors(): Promise<FriendWithGridStatus[]> {
    const userId = await getCurrentUserId();
    const blockedIds = await getBlockedUserIds(userId);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get all friendships (both directions) — include streak columns
    const [{ data: friendships1 }, { data: friendships2 }] = await Promise.all([
      supabase
        .from('friends')
        .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date')
        .eq('user_id', userId),
      supabase
        .from('friends')
        .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date')
        .eq('friend_id', userId),
    ]);

    // Merge both directions and deduplicate by friend ID (bidirectional rows exist)
    const seen = new Set<string>();
    const allFriendships = [...(friendships1 || []), ...(friendships2 || [])].filter(f => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      if (seen.has(friendId)) return false;
      seen.add(friendId);
      return true;
    });

    if (allFriendships.length === 0) return [];

    // Extract friend IDs
    const friendIds = allFriendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Fetch friend profiles and today's grid completions in parallel
    const [{ data: profiles }, { data: completions }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', friendIds),
      supabase
        .from('friend_grid_completions')
        .select('user_id, friend_id')
        .eq('completed_date', today)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => {
      logger.info(`[getFriendsAsAnchors] RAW profile for ${p.first_name}: photos=${JSON.stringify(p.photos)?.substring(0, 200)}, profile_photo_path=${p.profile_photo_path}`);
      profileMap.set(p.user_id, p);
    });

    // Build a set of friend IDs the current user has already helped today
    const helpedToday = new Set<string>();
    (completions || []).forEach((c: any) => {
      if (c.user_id === userId) helpedToday.add(c.friend_id);
    });

    // Build friend list and filter blocked
    const friends = allFriendships
      .filter(f => {
        const friendId = f.user_id === userId ? f.friend_id : f.user_id;
        return !blockedIds.includes(friendId);
      })
      .map(f => {
        const friendId = f.user_id === userId ? f.friend_id : f.user_id;
        const profile = profileMap.get(friendId);

        // Determine streak: if last_mutual_date is stale (before yesterday), streak broke
        let streakDays = f.streak_days || 0;
        const lastMutual = f.last_mutual_date;
        if (lastMutual && lastMutual < yesterday) {
          streakDays = 0;
        }

        return {
          friendshipId: f.id,
          userId,
          friendId,
          friend: profile ? mapProfileRow(profile) : { id: friendId, firstName: 'Friend' } as UserProfile,
          isAnchorToday: true,
          hasCompletedGrid: helpedToday.has(friendId),
          addedAt: f.added_at || new Date().toISOString(),
          streakDays,
          assistsCount: 0,
          friendshipTier: deriveFriendshipTier(streakDays),
        };
      });

    // Always check user_photos table for ALL friends (JSONB may be empty/stale)
    {
      const { data: userPhotos } = await supabase
        .from('user_photos')
        .select('user_id, storage_path, is_main, display_order')
        .in('user_id', friendIds)
        .order('display_order', { ascending: true });

      logger.info(`[getFriendsAsAnchors] user_photos table returned ${userPhotos?.length || 0} rows for ${friendIds.length} friends`);

      if (userPhotos && userPhotos.length > 0) {
        const photosByUser = new Map<string, any[]>();
        for (const p of userPhotos) {
          if (!photosByUser.has(p.user_id)) photosByUser.set(p.user_id, []);
          photosByUser.get(p.user_id)!.push(p);
        }
        // Use user_photos data for friends that have no photos from the JSONB
        for (const f of friends) {
          if ((!f.friend.photos || f.friend.photos.length === 0) && photosByUser.has(f.friendId)) {
            f.friend.photos = photosByUser.get(f.friendId)!.map(p => ({
              id: p.storage_path,
              url: p.storage_path,
              isMain: p.is_main || false,
              order: p.display_order || 0,
            }));
            logger.info(`[getFriendsAsAnchors] Used user_photos fallback for ${f.friend.firstName}: ${f.friend.photos.length} photos`);
          }
        }
      }
    }

    // Extract storage paths from ALL photo URLs (handles both raw paths and expired signed/public URLs)
    const extractPath = (url: string): string => {
      if (!url) return url;
      if (!url.startsWith('http')) return url; // Already a storage path
      const match = url.match(/\/profile-photos\/(.+?)(?:\?|$)/);
      return match ? match[1] : url;
    };

    // Normalize all photo URLs to storage paths first
    for (const f of friends) {
      f.friend.photos = (f.friend.photos || []).map(p => ({
        ...p,
        url: extractPath(p.url),
      }));
    }

    // Collect all storage paths that need signed URLs
    const allStoragePaths: string[] = [];
    for (const f of friends) {
      for (const p of f.friend.photos || []) {
        if (p.url && !p.url.startsWith('http')) {
          allStoragePaths.push(p.url);
        }
      }
    }

    if (allStoragePaths.length > 0) {
      logger.info(`[getFriendsAsAnchors] Resolving ${allStoragePaths.length} photo paths: ${JSON.stringify(allStoragePaths)}`);
      const urlMapRes = await getMultiplePhotoSignedUrls(allStoragePaths, 86400);
      logger.info(`[getFriendsAsAnchors] Signed URL result: ok=${urlMapRes.ok}, keys=${Object.keys(urlMapRes.data || {}).length}, error=${urlMapRes.error?.message || 'none'}`);
      if (urlMapRes.ok && urlMapRes.data) {
        // Log each mapping
        for (const [path, url] of Object.entries(urlMapRes.data)) {
          logger.info(`[getFriendsAsAnchors] URL map: ${path} -> ${url.substring(0, 80)}...`);
        }
        for (const f of friends) {
          f.friend.photos = (f.friend.photos || []).map(p => ({
            ...p,
            url: urlMapRes.data![p.url] || p.url,
          }));
        }
      } else {
        logger.warn('[getFriendsAsAnchors] Signed URL failed, trying public URLs');
        for (const f of friends) {
          f.friend.photos = (f.friend.photos || []).map(p => {
            if (p.url && !p.url.startsWith('http')) {
              const { data } = supabase.storage.from('profile-photos').getPublicUrl(p.url);
              logger.info(`[getFriendsAsAnchors] Public URL fallback: ${p.url} -> ${data.publicUrl.substring(0, 80)}`);
              return { ...p, url: data.publicUrl };
            }
            return p;
          });
        }
      }
    } else {
      logger.warn('[getFriendsAsAnchors] NO storage paths found for any friend photos!');
    }

    // Debug: log final photo status per friend
    for (const f of friends) {
      const firstUrl = f.friend.photos?.[0]?.url || 'NONE';
      const isHttp = firstUrl.startsWith('http');
      logger.info(`[getFriendsAsAnchors] FINAL Friend ${f.friend.firstName}: ${f.friend.photos?.length || 0} photos, isSignedUrl=${isHttp}, url=${firstUrl.substring(0, 100)}`);
    }

    return friends;
  }

  async getFriendGrid(friendId: string): Promise<DailyGrid> {
    const today = new Date().toISOString().split('T')[0];

    // Check if there's a survey for this friend (recipient_user_id = the friend being matched)
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('*')
      .eq('recipient_user_id', friendId)
      .eq('survey_date', today)
      .maybeSingle();

    if (!survey) {
      throw new Error('Friend has no grid today');
    }

    // Collect candidate IDs from separate columns
    const candidateIds = [
      survey.candidate_1_user_id,
      survey.candidate_2_user_id,
      survey.candidate_3_user_id,
    ].filter(Boolean);
    const candidates: UserProfile[] = [];

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', candidateIds);

      if (profiles) {
        candidates.push(...profiles.map(mapProfileRow));
      }
    }

    // Fetch friend profile
    const { data: friendProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', friendId)
      .maybeSingle();

    return {
      id: survey.id,
      anchorUserId: friendId,
      anchor: friendProfile ? mapProfileRow(friendProfile) : { id: friendId, firstName: 'Friend' } as UserProfile,
      candidates,
      gridDate: today,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: !!survey.is_completed,
      hasMatched: !!survey.is_completed,
    };
  }

  async submitFriendGridProposal(friendId: string, candidateId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    // Mark the survey as completed for this friend
    await supabase
      .from('daily_surveys')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('recipient_user_id', friendId)
      .eq('survey_date', today);

    // Record grid completion and update streak
    await supabase.rpc('record_grid_completion', {
      p_user_id: userId,
      p_friend_id: friendId,
    });
  }

  // ========================================================================
  // Pending Match Proposals (Supabase direct query)
  // ========================================================================

  async getPendingMatchProposals(): Promise<any[]> {
    const userId = await getCurrentUserId();

    try {
      const [result, blockedIds] = await Promise.all([
        getPendingDecisions(userId),
        getBlockedUserIds(userId)
      ]);
      const rawProposals = result.proposals || [];

      return rawProposals
        .filter((raw: any) => {
          const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
          return !blockedIds.includes(partnerId);
        })
        .map((raw: any) => {
        const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
        const partnerProfile = raw.partner_profile
          ? mapProfileRow(raw.partner_profile)
          : { id: partnerId, firstName: 'Match' } as UserProfile;

        const myDecision = raw.user_a_id === userId ? raw.user_a_decision : raw.user_b_decision;
        const theirDecision = raw.user_a_id === userId ? raw.user_b_decision : raw.user_a_decision;

        const totalVotes = (raw.pool_yes_votes || 0) + (raw.pool_no_votes || 0) +
                          (raw.friend_yes_votes || 0) + (raw.friend_no_votes || 0);
        const yesVotes = (raw.pool_yes_votes || 0) + (raw.friend_yes_votes || 0);
        const communityScore = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

        return {
          id: raw.id,
          proposalId: raw.id,
          partnerProfile,
          matchedUser: partnerProfile,
          status: myDecision === 'pending' ? 'pending' : 'decided',
          communityScore,
          compatibilityScore: raw.compatibility_score || 0,
          endorsers: [],
          expiresAt: raw.decision_deadline_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          approvedAt: raw.confirmed_at || raw.sent_to_users_at || raw.created_at,
          receivedAt: raw.sent_to_users_at || raw.created_at,
          yourDecision: myDecision || 'pending',
          partnerDecision: theirDecision || 'pending',
          hasResponded: myDecision !== 'pending',
        };
      });
    } catch (error: any) {
      logger.error('Failed to fetch pending decisions', error.message);
      return [];
    }
  }

  async respondToMatchProposal(proposalId: string, accept: boolean): Promise<void> {
    const userId = await getCurrentUserId();
    const decision = accept ? 'accepted' : 'declined';
    await decideOnProposal(proposalId, userId, decision);
  }

  // ========================================================================
  // Active Match (Supabase)
  // ========================================================================

  async getActiveMatch(): Promise<ActiveMatch | null> {
    const userId = await getCurrentUserId();

    // Query matches where this user is involved and status is active
    const { data: matchA } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id_1', userId)
      .in('status', ['active', 'accepted'])
      .maybeSingle();

    const { data: matchB } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id_2', userId)
      .in('status', ['active', 'accepted'])
      .maybeSingle();

    const match = matchA || matchB;
    if (!match) return null;

    const partnerId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Fetch partner profile
    const { data: partnerRow } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', partnerId)
      .maybeSingle();

    const partnerProfile = partnerRow ? mapProfileRow(partnerRow) : { id: partnerId, firstName: 'Match' } as UserProfile;

    const matchedAt = new Date(match.created_at);
    const now = new Date();
    const daysActive = Math.floor((now.getTime() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilCanEnd = Math.max(0, ACTIVE_MATCH_MINIMUM_DAYS - daysActive);

    // Count messages
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id);

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
      endorsers: [],
    };
  }

  async endActiveMatch(matchId: string, reason: string): Promise<void> {
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
  }

  // ========================================================================
  // Karma (Supabase)
  // ========================================================================

  async getKarmaScore(): Promise<KarmaScore> {
    const userId = await getCurrentUserId();

    const { data: karma } = await supabase
      .from('karma_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!karma) {
      return {
        userId,
        totalAssists: 0,
        totalProposals: 0,
        badgeTier: 'new',
        proposalSuccessRate: 0,
        votingAccuracyRate: 0,
        slowModeActive: false,
        lastUpdated: new Date().toISOString(),
      };
    }

    const assists = karma.total_assists || 0;
    return {
      userId,
      totalAssists: assists,
      totalProposals: karma.total_proposals || 0,
      badgeTier: deriveKarmaTier(assists),
      proposalSuccessRate: karma.proposal_success_rate || 0,
      votingAccuracyRate: karma.voting_accuracy_rate || 0,
      slowModeActive: karma.slow_mode_active || false,
      lastUpdated: karma.updated_at || new Date().toISOString(),
    };
  }

  // ========================================================================
  // Community Task Progress (Supabase)
  // ========================================================================

  async getCommunityTaskProgress(): Promise<CommunityTask> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    // Count today's votes from the proposal_votes table
    const { count: voteCount } = await supabase
      .from('proposal_votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    const votesCompleted = (voteCount || 0) + this.sessionVoteCount;
    const hasVoted = votesCompleted >= 3;

    // Check if user completed a daily survey today
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('is_completed')
      .eq('ranker_user_id', userId)
      .eq('survey_date', today)
      .maybeSingle();

    const hasCreatedProposal = !!survey?.is_completed;
    const allComplete = hasVoted;

    return {
      id: `task-${today}`,
      userId,
      taskDate: today,
      hasVotedOnProposals: hasVoted,
      proposalsVotedCount: Math.min(votesCompleted, 3),
      hasCreatedProposal,
      hasCompletedRandomMatch: hasCreatedProposal,
      allTasksCompleted: allComplete,
      completedAt: allComplete ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ========================================================================
  // Friends Area Aggregate
  // ========================================================================

  async getFriendsAreaData(): Promise<{
    friends: FriendWithGridStatus[];
    pendingProposals: any[];
    activeMatch: ActiveMatch | null;
  }> {
    const [friends, pendingProposals, activeMatch] = await Promise.all([
      this.getFriendsAsAnchors(),
      this.getPendingMatchProposals(),
      this.getActiveMatch(),
    ]);

    return { friends, pendingProposals, activeMatch };
  }

  // ========================================================================
  // Friend Helped Tracking (backend records proposal submission for friend)
  // ========================================================================

  /**
   * Mark a friend as helped today (i.e., the current user submitted a proposal for them).
   * In the real backend this is persisted via the friend_proposal_submissions table.
   * For now it is a no-op stub — the actual persistence happens in submitFriendGridProposal.
   */
  async markFriendAsHelped(_friendId: string): Promise<void> {
    // Real implementation: the daily_surveys row for this friend is already updated
    // by submitFriendGridProposal. No separate record needed.
    logger.info('[Backend] markFriendAsHelped called — persistence handled by submitFriendGridProposal');
  }

  // ========================================================================
  // Match ended event tracking
  // ========================================================================

  private pendingEndedEvent: MatchEndedEvent | null = null;

  getEndedMatchEvent(): MatchEndedEvent | null {
    return this.pendingEndedEvent;
  }

  clearEndedMatchEvent(): void {
    this.pendingEndedEvent = null;
  }

  // ========================================================================
  // 24h daily-cycle timer + state-change events
  // ========================================================================

  private stateChangeListeners: Array<() => void> = [];

  onStateChange(callback: () => void): () => void {
    this.stateChangeListeners.push(callback);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== callback);
    };
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(l => l());
  }

  getNextResetAt(): number {
    return this.nextResetAt;
  }

  triggerReset(): void {
    this.nextResetAt = getNext7PMCentral();
    this.sessionVoteCount = 0;
    this.sessionVotedProposals.clear();
    AsyncStorage.setItem(STORAGE_KEY_NEXT_RESET, String(this.nextResetAt)).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEY_VOTES, '0').catch(() => {});
    this.notifyStateChange();
  }
}

export const communityBackendService = new CommunityBackendService();
export default communityBackendService;
