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
  // Filter out local file:// URIs — these are device-local ImagePicker cache paths
  // that were incorrectly saved to the DB instead of Supabase storage paths.
  const rawPhotos = ((row.photos && row.photos.length > 0)
    ? row.photos
    : (row.profile_photo_path ? [{ id: '1', url: row.profile_photo_path, is_main: true, display_order: 0 }] : [])
  ).filter((p: any) => p.url && !p.url.startsWith('file://'));

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
    photos: rawPhotos.map((p: any) => ({
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
  // Friends (Supabase)
  // ========================================================================

  async getFriendsAsAnchors(): Promise<FriendWithGridStatus[]> {
    const userId = await getCurrentUserId();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get all friendships (both directions) + blocked IDs in parallel
    const [blockedIds, { data: friendships1 }, { data: friendships2 }] = await Promise.all([
      getBlockedUserIds(userId),
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

    // Fetch friend profiles, active proposals, matches, and photos in parallel
    const [
      { data: profiles },
      { data: friendProposalsA },
      { data: friendProposalsB },
      { data: matchesA },
      { data: matchesB },
      { data: userPhotos },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', friendIds),
      // Proposals where friend is user_a
      supabase
        .from('proposals')
        .select('id, user_a_id, user_b_id, status')
        .in('user_a_id', friendIds)
        .eq('status', 'pending'),
      // Proposals where friend is user_b
      supabase
        .from('proposals')
        .select('id, user_a_id, user_b_id, status')
        .in('user_b_id', friendIds)
        .eq('status', 'pending'),
      // Matches where friend is user_id_1
      supabase
        .from('matches')
        .select('user_id_1, user_id_2')
        .in('user_id_1', friendIds)
        .in('status', ['active', 'pending', 'accepted']),
      // Matches where friend is user_id_2
      supabase
        .from('matches')
        .select('user_id_1, user_id_2')
        .in('user_id_2', friendIds)
        .in('status', ['active', 'pending', 'accepted']),
      // Friend photos (JSONB may be empty/stale)
      supabase
        .from('user_photos')
        .select('user_id, storage_path, is_main, display_order')
        .in('user_id', friendIds)
        .order('display_order', { ascending: true }),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => {
      profileMap.set(p.user_id, p);
    });

    // Build map: friendId → active proposal ID (if any)
    const friendProposalMap = new Map<string, string>();
    for (const p of (friendProposalsA || [])) {
      friendProposalMap.set(p.user_a_id, p.id);
    }
    for (const p of (friendProposalsB || [])) {
      friendProposalMap.set(p.user_b_id, p.id);
    }

    // Build set of friends with active matches
    const friendsWithMatch = new Set<string>();
    for (const m of (matchesA || [])) {
      if (friendIds.includes(m.user_id_1)) friendsWithMatch.add(m.user_id_1);
    }
    for (const m of (matchesB || [])) {
      if (friendIds.includes(m.user_id_2)) friendsWithMatch.add(m.user_id_2);
    }

    // Fetch current user's votes on friends' active proposals
    const activeProposalIds = Array.from(friendProposalMap.values());
    let votedProposalIds = new Set<string>();

    if (activeProposalIds.length > 0) {
      const { data: userVotes } = await supabase
        .from('proposal_votes')
        .select('proposal_id')
        .eq('voter_user_id', userId)
        .in('proposal_id', activeProposalIds);

      votedProposalIds = new Set((userVotes || []).map((v: any) => v.proposal_id));
    }

    // Determine hasCompletedGrid for each friend:
    // false (Help) = friend has active proposal user has NEVER voted on
    // true (Already Helped) = everything else
    const alreadyHelped = new Set<string>();
    for (const friendId of friendIds) {
      const proposalId = friendProposalMap.get(friendId);
      if (!proposalId) {
        // No active proposal → already helped (nothing to vote on)
        alreadyHelped.add(friendId);
      } else if (friendsWithMatch.has(friendId)) {
        // Has active match → already helped
        alreadyHelped.add(friendId);
      } else if (votedProposalIds.has(proposalId)) {
        // User already voted on this proposal → already helped
        alreadyHelped.add(friendId);
      }
      // Otherwise: friend has active proposal user hasn't voted on → Help
    }

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
          hasCompletedGrid: alreadyHelped.has(friendId),
          addedAt: f.added_at || new Date().toISOString(),
          streakDays,
          assistsCount: 0,
          friendshipTier: deriveFriendshipTier(streakDays),
        };
      });

    // Use pre-fetched user_photos to fill in friends with empty JSONB photos
    {
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

    return {
      id: `task-${today}`,
      userId,
      taskDate: today,
      hasVotedOnProposals: hasVoted,
      proposalsVotedCount: Math.min(votesCompleted, 3),
      hasCreatedProposal: false,
      hasCompletedRandomMatch: false,
      allTasksCompleted: hasVoted,
      completedAt: hasVoted ? new Date().toISOString() : undefined,
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
   * Mark a friend as helped (i.e., the current user voted on their proposal).
   * No-op — the actual persistence happens via proposal_votes when the user votes.
   */
  async markFriendAsHelped(_friendId: string): Promise<void> {
    // Voting on a friend's proposal is recorded in proposal_votes table
    // via submitProposalVote(). No separate record needed.
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
