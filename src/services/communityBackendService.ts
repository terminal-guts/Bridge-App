/**
 * Community Backend Service - REAL IMPLEMENTATION
 *
 * Connects to Supabase for friends/matches/karma data
 * and Edge Functions for proposal voting/generation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getNext7PMCentral, getLast7PMCentral } from '../utils/centralTime';
import { getMultiplePhotoSignedUrls } from './photoService';
import {
  Proposal,
  ActiveMatch,
  KarmaScore,
  KarmaTier,
  UserProfile,
  CommunityTask,
  FriendWithGridStatus,
  MatchEndedEvent,
  ACTIVE_MATCH_MINIMUM_DAYS,
} from '../types/community';
import {
  getProposalsForVoting,
  castProposalVote,
  getPendingDecisions,
  decideOnProposal,
  transformBackendProposal,
  submitFriendRecommendation,
} from './proposalApiService';
import { getBlockedUserIds } from './blockService';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityBackend');

// ============================================================================
// Helpers
// ============================================================================

async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export function mapProfileRow(row: any): UserProfile {
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
    height: row.height_inches ? String(row.height_inches) : (row.height || ''),
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
    drinkingFrequency: row.drinking_frequency || undefined,
    cannabisFrequency: row.cannabis_frequency || undefined,
    tobaccoFrequency: row.tobacco_frequency || undefined,
    otherDrugsFrequency: row.other_drugs_frequency || undefined,
    partnerLifestylePreferences: (() => {
      // Check raw fields first (most reliable — not affected by JSON serialization)
      if (row.partner_drinking || row.partner_cannabis || row.partner_tobacco || row.partner_other_drugs) {
        return {
          drinking: row.partner_drinking?.length ? row.partner_drinking : undefined,
          cannabis: row.partner_cannabis?.length ? row.partner_cannabis : undefined,
          tobacco: row.partner_tobacco?.length ? row.partner_tobacco : undefined,
          otherDrugs: row.partner_other_drugs?.length ? row.partner_other_drugs : undefined,
        };
      }
      // Fall back to nested object if it has actual content
      const plp = row.partner_lifestyle_preferences;
      if (plp && (plp.drinking || plp.cannabis || plp.tobacco || plp.otherDrugs)) {
        return plp;
      }
      return undefined;
    })(),
    preferredEthnicities: row.preferred_ethnicities || [],
    preferredPolitics: row.preferred_politics || [],
    nonNegotiables: [],
    preferences: {
      ageMin: row.age_min ?? undefined,
      ageMax: row.age_max ?? undefined,
      heightMin: row.height_min ?? undefined,
      heightMax: row.height_max ?? undefined,
      ...(row.preferences || {}),
    },
    profileCompleted: row.profile_completed || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Resolves storage paths to signed URLs for an array of user profiles.
 * Handles both raw paths and already-expired signed URLs.
 */
export async function resolveProfilePhotos(profiles: UserProfile[]): Promise<void> {
  if (!profiles || profiles.length === 0) return;

  const extractPath = (url: string): string => {
    if (!url) return url;
    if (!url.startsWith('http')) return url;
    const match = url.match(/\/profile-photos\/(.+?)(?:\?|$)/);
    return match ? match[1] : url;
  };

  // Filter out invalid local file:// URIs and normalize to storage paths
  for (const p of profiles) {
    if (p.photos) {
      p.photos = p.photos
        .filter(photo => photo.url && !photo.url.startsWith('file://'))
        .map(photo => ({
          ...photo,
          url: extractPath(photo.url),
        }));
    }
  }

  // Collect unique paths needing signing
  const pathsToSign = new Set<string>();
  for (const p of profiles) {
    for (const photo of p.photos || []) {
      if (photo.url && !photo.url.startsWith('http')) {
        pathsToSign.add(photo.url);
      }
    }
  }

  if (pathsToSign.size === 0) return;

  const paths = Array.from(pathsToSign);
  const res = await getMultiplePhotoSignedUrls(paths, 86400);

  if (res.ok && res.data) {
    for (const p of profiles) {
      if (p.photos) {
        p.photos = p.photos.map(photo => ({
          ...photo,
          url: res.data![photo.url] || photo.url,
        }));
      }
    }
  } else {
    // Fallback to public URLs if signing fails
    for (const p of profiles) {
      if (p.photos) {
        p.photos = p.photos.map(photo => {
          if (photo.url && !photo.url.startsWith('http')) {
            const { data } = supabase.storage.from('profile-photos').getPublicUrl(photo.url);
            return { ...photo, url: data.publicUrl };
          }
          return photo;
        });
      }
    }
  }
}

function deriveKarmaTier(points: number): KarmaTier {
  if (points >= 500) return 'elite';
  if (points >= 150) return 'trusted';
  if (points >= 50) return 'solid';
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
  // Short-lived cache for friends area data (60s TTL)
  private friendsAreaCache: { data: FriendWithGridStatus[]; ts: number } | null = null;
  private static readonly FRIENDS_CACHE_TTL_MS = 60_000;

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

      // Build UserProfile objects from enriched profile data
      const profilesToResolve: UserProfile[] = [];
      const transformedProposals = filteredProposals.map((raw: any) => {
        const transformed = transformBackendProposal(raw);

        const userA: UserProfile = raw.user_a_profile
          ? mapProfileRow(raw.user_a_profile)
          : { id: raw.user_a_id, firstName: 'User A', photos: [] } as any;

        const userB: UserProfile = raw.user_b_profile
          ? mapProfileRow(raw.user_b_profile)
          : { id: raw.user_b_id, firstName: 'User B', photos: [] } as any;


        profilesToResolve.push(userA, userB);

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

      // Resolve all photos in parallel
      await resolveProfilePhotos(profilesToResolve);

      return transformedProposals;
    } catch (error: any) {
      logger.error('Failed to fetch proposals for voting', error.message);
      return [];
    }
  }

  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip'): Promise<void> {
    if (vote === 'skip') return;

    const userId = await getCurrentUserId();
    const voteType = vote === 'yes' ? 'YES' : 'NO';

    await castProposalVote(proposalId, userId, voteType as any);
    this.invalidateFriendsCache();
    if (!this.sessionVotedProposals.has(proposalId)) {
      this.sessionVotedProposals.add(proposalId);
      this.sessionVoteCount++;
      AsyncStorage.setItem(STORAGE_KEY_VOTES, String(this.sessionVoteCount)).catch(() => {});
    }
  }

  async submitRecommendation(recommendedPersonId: string, recommendedToFriendId: string, sourceProposalId?: string): Promise<void> {
    await submitFriendRecommendation(recommendedPersonId, recommendedToFriendId, sourceProposalId);
  }

  // ========================================================================
  // Friends (Supabase)
  // ========================================================================

  invalidateFriendsCache(): void {
    this.friendsAreaCache = null;
  }

  async getFriendsAsAnchors(forceRefresh = false): Promise<FriendWithGridStatus[]> {
    if (!forceRefresh && this.friendsAreaCache && Date.now() - this.friendsAreaCache.ts < CommunityBackendService.FRIENDS_CACHE_TTL_MS) {
      return this.friendsAreaCache.data;
    }

    const userId = await getCurrentUserId();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get all friendships (both directions) + blocked IDs in parallel
    const [blockedIds, { data: friendships1 }, { data: friendships2 }] = await Promise.all([
      getBlockedUserIds(userId),
      supabase
        .from('friends')
        .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date, streak_frozen')
        .eq('user_id', userId),
      supabase
        .from('friends')
        .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date, streak_frozen')
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

    // Fetch friend profiles, active proposals, matches, karma scores and photos in parallel
    const [
      { data: profiles },
      { data: friendProposalsA },
      { data: friendProposalsB },
      { data: matchesA },
      { data: matchesB },
      { data: userPhotos },
      { data: karmaScores },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, age, gender, pronouns, height_inches, height, ethnicity, religion, political_leaning, location, where_live_now, current_job, company_position, education_level, school, photos, interests, values, bio, lifestyle, drinking_frequency, cannabis_frequency, tobacco_frequency, other_drugs_frequency, partner_drinking, partner_cannabis, partner_tobacco, partner_other_drugs, partner_lifestyle_preferences, preferred_ethnicities, preferred_politics, age_min, age_max, height_min, height_max, preferences, profile_completed, profile_photo_path, created_at, updated_at')
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
      // Friend karma scores
      supabase
        .from('karma_scores')
        .select('user_id, karma_points, total_assists, total_proposals, badge_tier, proposal_success_rate, voting_accuracy_rate')
        .in('user_id', friendIds),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => {
      profileMap.set(p.user_id, p);
    });

    const karmaMap = new Map<string, any>();
    (karmaScores || []).forEach(k => {
      karmaMap.set(k.user_id, k);
    });

    // Build map: friendId → active proposal ID (if any)
    const friendProposalMap = new Map<string, string>();
    for (const p of (friendProposalsA || [])) {
      friendProposalMap.set(p.user_a_id, p.id);
    }
    for (const p of (friendProposalsB || [])) {
      friendProposalMap.set(p.user_b_id, p.id);
    }

    // Friends whose proposal involves the current user — can't vote on your own proposal
    const friendsProposedWithMe = new Set<string>();
    for (const p of (friendProposalsA || [])) {
      if (p.user_b_id === userId) friendsProposedWithMe.add(p.user_a_id);
    }
    for (const p of (friendProposalsB || [])) {
      if (p.user_a_id === userId) friendsProposedWithMe.add(p.user_b_id);
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
      } else if (friendsProposedWithMe.has(friendId)) {
        // Friend is proposed with current user → can't vote on your own proposal
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

        // Determine streak: if frozen, preserve DB value; otherwise check staleness
        let streakDays = f.streak_days || 0;
        if (!f.streak_frozen) {
          const lastMutual = f.last_mutual_date;
          if (lastMutual && lastMutual < yesterday) {
            streakDays = 0;
          }
        }

        const friendKarma = karmaMap.get(friendId);
        return {
          friendshipId: f.id,
          userId,
          friendId,
          friend: (() => {
            const p = profile ? mapProfileRow(profile) : { id: friendId, firstName: 'Friend' } as UserProfile;
            if (friendKarma) {
              (p as any).karma = {
                userId: friendId,
                karmaPoints: friendKarma.karma_points || 0,
                totalAssists: friendKarma.total_assists || 0,
                totalProposals: friendKarma.total_proposals || 0,
                badgeTier: friendKarma.badge_tier || 'new',
                proposalSuccessRate: friendKarma.proposal_success_rate || 0,
                votingAccuracyRate: friendKarma.voting_accuracy_rate || 0,
              };
            }
            return p;
          })(),
          isAnchorToday: true,
          hasCompletedGrid: alreadyHelped.has(friendId),
          addedAt: f.added_at || new Date().toISOString(),
          streakDays,
          assistsCount: friendKarma?.total_assists || 0,
          karmaScore: friendKarma ? {
            userId: friendId,
            karmaPoints: friendKarma.karma_points || 0,
            totalAssists: friendKarma.total_assists || 0,
            totalProposals: friendKarma.total_proposals || 0,
            badgeTier: friendKarma.badge_tier || 'new',
            proposalSuccessRate: friendKarma.proposal_success_rate || 0,
            votingAccuracyRate: friendKarma.voting_accuracy_rate || 0,
          } : undefined,
        };
      });

    // Use pre-fetched user_photos to fill in friends with empty JSONB photos
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
        }
      }
    }

    // Resolve all photos
    await resolveProfilePhotos(friends.map(f => f.friend));

    this.friendsAreaCache = { data: friends, ts: Date.now() };
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

      const filteredRaw = rawProposals.filter((raw: any) => {
        const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
        return !blockedIds.includes(partnerId);
      });

      const profilesToResolve: UserProfile[] = [];
      const proposals = filteredRaw.map((raw: any) => {
        const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
        const partnerProfile = raw.partner_profile
          ? mapProfileRow(raw.partner_profile)
          : { id: partnerId, firstName: 'Match', photos: [] } as any;

        profilesToResolve.push(partnerProfile);

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
          compatibilityScore: (() => {
            const s = raw.compatibility_score || 0;
            // Normalize: old proposals stored 0–1 decimal, new ones store 70–99 integer
            return s > 0 && s < 1 ? Math.round(s * 100) : Math.round(s);
          })(),
          endorsers: [],
          expiresAt: raw.decision_deadline_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          approvedAt: raw.confirmed_at || raw.sent_to_users_at || raw.created_at,
          receivedAt: raw.sent_to_users_at || raw.created_at,
          yourDecision: myDecision || 'pending',
          partnerDecision: theirDecision || 'pending',
          hasResponded: myDecision !== 'pending',
        };
      });

      await resolveProfilePhotos(profilesToResolve);

      // Fetch yes-voter profiles to populate endorsers (photo avatars shown on proposal card)
      const proposalIds = proposals.map((p: any) => p.proposalId);
      if (proposalIds.length > 0) {
        const { data: yesVotes } = await supabase
          .from('proposal_votes')
          .select('proposal_id, voter_user_id')
          .in('proposal_id', proposalIds)
          .eq('vote_type', 'YES');

        if (yesVotes && yesVotes.length > 0) {
          const uniqueVoterIds = [...new Set(yesVotes.map((v: any) => v.voter_user_id))];
          const [{ data: voterRows }, { data: voterPhotos }] = await Promise.all([
            supabase.from('user_profiles').select('*').in('user_id', uniqueVoterIds),
            supabase.from('user_photos').select('user_id, storage_path, is_main').in('user_id', uniqueVoterIds).eq('is_main', true),
          ]);

          if (voterRows && voterRows.length > 0) {
            const voterProfiles = voterRows.map(mapProfileRow);

            // Inject main photo from user_photos table (real users store photos there, not in user_profiles.photos)
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

            await resolveProfilePhotos(voterProfiles);
            const voterMap = new Map(voterProfiles.map(p => [p.userId, p]));

            // Group yes-voter IDs by proposal
            const votesByProposal = new Map<string, string[]>();
            for (const vote of yesVotes) {
              const list = votesByProposal.get(vote.proposal_id) ?? [];
              list.push(vote.voter_user_id);
              votesByProposal.set(vote.proposal_id, list);
            }

            // Assign first 3 endorsers to each proposal
            for (const proposal of proposals) {
              const voterIds = votesByProposal.get(proposal.proposalId) ?? [];
              proposal.endorsers = voterIds
                .slice(0, 3)
                .map((vid: string) => ({ endorserProfile: voterMap.get(vid) }))
                .filter((e: any) => e.endorserProfile);
            }
          }
        }
      }

      return proposals;
    } catch (error: any) {
      logger.error('Failed to fetch pending decisions', error.message);
      return [];
    }
  }

  async respondToMatchProposal(proposalId: string, accept: boolean, partnerInfo?: { name: string; photoUrl?: string }): Promise<void> {
    const userId = await getCurrentUserId();
    const decision = accept ? 'accepted' : 'declined';
    await decideOnProposal(proposalId, userId, decision);

    // Set ended event so MatchesScreen shows the "You passed" popup
    if (!accept && partnerInfo) {
      this.pendingEndedEvent = {
        type: 'you_rejected',
        eventId: `pass-${proposalId}-${Date.now()}`,
        partnerName: partnerInfo.name,
        partnerPhotoUrl: partnerInfo.photoUrl,
      };
    }
  }

  // ========================================================================
  // Active Match (Supabase)
  // ========================================================================

  async getActiveMatch(): Promise<ActiveMatch | null> {
    const userId = await getCurrentUserId();

    // Single query for both directions using .or()
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .in('status', ['active', 'accepted'])
      .limit(1);

    const match = matches?.[0] || null;
    if (!match) {
      // No active match — check if a match was recently ended by the OTHER user
      // so we can show the "match ended" popup
      if (!this.pendingEndedEvent) {
        await this.detectEndedMatchEvent(userId);
      }
      return null;
    }

    const partnerId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Fetch partner profile
    const { data: partnerRow } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', partnerId)
      .maybeSingle();

    const partnerProfile = partnerRow ? mapProfileRow(partnerRow) : { id: partnerId, firstName: 'Match', photos: [] } as any;

    await resolveProfilePhotos([partnerProfile]);

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

  async endActiveMatch(matchId: string, reason: string, partnerInfo?: { name: string; photoUrl?: string }): Promise<void> {
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
      this.pendingEndedEvent = {
        type: 'match_ended',
        eventId: `end-match-${matchId}-${Date.now()}`,
        partnerName: partnerInfo.name,
        partnerPhotoUrl: partnerInfo.photoUrl,
      };
    }
  }

  // ========================================================================
  // Karma (Supabase)
  // ========================================================================

  async getKarmaScore(): Promise<KarmaScore> {
    const userId = await getCurrentUserId();

    const { data: karma } = await supabase
      .from('karma_scores')
      .select('user_id, karma_points, total_assists, total_proposals, badge_tier, proposal_success_rate, voting_accuracy_rate')
      .eq('user_id', userId)
      .maybeSingle();

    if (!karma) {
      return {
        userId,
        karmaPoints: 0,
        totalAssists: 0,
        totalProposals: 0,
        badgeTier: 'new',
        proposalSuccessRate: 0,
        votingAccuracyRate: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const points = karma.karma_points || 0;
    return {
      userId,
      karmaPoints: points,
      totalAssists: karma.total_assists || 0,
      totalProposals: karma.total_proposals || 0,
      badgeTier: karma.badge_tier || deriveKarmaTier(points),
      proposalSuccessRate: karma.proposal_success_rate || 0,
      votingAccuracyRate: karma.voting_accuracy_rate || 0,
      lastUpdated: karma.updated_at || new Date().toISOString(),
    };
  }

  // ========================================================================
  // Community Task Progress (Supabase)
  // ========================================================================

  async getCommunityTaskProgress(): Promise<CommunityTask> {
    const userId = await getCurrentUserId();
    const lastReset = getLast7PMCentral();
    const today = new Date().toISOString().split('T')[0];

    // Count votes from the proposal_votes table since the last 7PM Central reset
    const { count: voteCount } = await supabase
      .from('proposal_votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_user_id', userId)
      .gte('created_at', new Date(lastReset).toISOString());

    // Reconciliation: use whichever is higher (DB or local session tracker)
    // to ensure immediate feedback while avoiding double-counting persisted votes.
    const votesCompleted = Math.max(voteCount || 0, this.sessionVoteCount);
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

    // Detect if the other person declined a proposal you accepted
    if (!activeMatch && pendingProposals.length === 0 && !this.pendingEndedEvent) {
      await this.detectPartnerDeclinedProposal();
    }

    return { friends, pendingProposals, activeMatch };
  }

  /**
   * Check for recently declined proposals where you accepted but the partner
   * declined. Sets pendingEndedEvent so MatchesScreen shows the popup.
   */
  private async detectPartnerDeclinedProposal(): Promise<void> {
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

      this.pendingEndedEvent = {
        type: 'they_rejected',
        eventId,
        partnerName: partnerRow?.first_name || 'Your match',
        partnerPhotoUrl: partnerRow?.profile_photo_path || undefined,
      };
    } catch {
      // Silent — don't break the main data load
    }
  }

  // ========================================================================
  // Friend Helped Tracking (backend records proposal submission for friend)
  // ========================================================================

  /**
   * Mark a friend as helped (i.e., the current user voted on their proposal).
   */
  async markFriendAsHelped(_friendId: string): Promise<void> {
    // No-op: streak updates are handled server-side in process-vote edge function.
    // hasCompletedGrid uses proposal_votes directly, not this function.
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

  /**
   * Check if a match was recently ended by the OTHER user.
   * If so, set pendingEndedEvent so MatchesScreen can show the popup.
   * Uses AsyncStorage to avoid showing the same event twice.
   */
  private async detectEndedMatchEvent(userId: string): Promise<void> {
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
        const match = exit.matches as any;
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

        this.pendingEndedEvent = {
          type: 'match_ended',
          eventId,
          partnerName: partnerRow?.first_name || 'Your match',
          partnerPhotoUrl: photoUrl,
          endReason: exit.exit_reason || undefined,
        };
        return; // Show one at a time
      }
    } catch (error) {
      // Silent fail — popup is non-critical
      console.warn('detectEndedMatchEvent failed:', error);
    }
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
