/**
 * Community Backend Service - Friends area operations
 *
 * Extracted from communityBackendService.ts for file-size management.
 * Contains: fetchFriendsAsAnchors standalone function.
 */

import { supabase } from '../lib/supabase';
import {
  UserProfile,
  FriendWithGridStatus,
} from '../types/community';
import { getBlockedUserIds } from './blockService';
import { setCachedFriendsData } from './communityCache';
import { mapProfileRow, resolveProfilePhotos, getCurrentUserId } from './communityBackendService.helpers';
// DEFERRED: Crush — import dormant until feature is re-enabled
// import { getMyCrushIds, getCrushedOnMeIds } from './crushService';

/**
 * Fetch all friends as anchors with grid status.
 * Standalone function extracted from CommunityBackendService.
 */
export async function fetchFriendsAsAnchors(): Promise<FriendWithGridStatus[]> {
  const userId = await getCurrentUserId();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Get all friendships (both directions) + blocked IDs in parallel
  const [blockedIds, { data: friendships1 }, { data: friendships2 }] = await Promise.all([
    getBlockedUserIds(userId),
    supabase
      .from('friends')
      .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date, streak_frozen')
      .eq('user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('friends')
      .select('id, user_id, friend_id, added_at, streak_days, last_mutual_date, streak_frozen')
      .eq('friend_id', userId)
      .eq('status', 'accepted'),
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

  // Fetch friend profiles, proposals, matches, karma, photos, and votes
  // all in ONE parallel batch — eliminates sequential round-trips
  // DEFERRED: Crush data excluded while feature is dormant
  const [
    { data: profiles },
    { data: friendProposalsA },
    { data: friendProposalsB },
    { data: matchesA },
    { data: matchesB },
    { data: userPhotos },
    { data: karmaScores },
    { data: allUserVotes },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, age, gender, pronouns, location, current_job, profile_photo_path, photos, profile_completed, interests, values, role')
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
    // Pre-fetch recent user votes (pending proposals are always recent)
    supabase
      .from('proposal_votes')
      .select('proposal_id')
      .eq('voter_user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    // DEFERRED: Crush data — restore these two lines when crush feature is re-enabled:
    // getMyCrushIds(),
    // getCrushedOnMeIds(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
  const profileMap = new Map<string, Record<string, any>>();
  (profiles || []).forEach(p => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    profileMap.set(p.user_id, p as unknown as Record<string, any>);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
  const karmaMap = new Map<string, Record<string, any>>();
  (karmaScores || []).forEach(k => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    karmaMap.set(k.user_id, k as unknown as Record<string, any>);
  });

  // Build map: friendId -> ALL active proposal IDs (a friend can appear in multiple proposals)
  const friendProposalMap = new Map<string, string[]>();
  for (const p of (friendProposalsA || [])) {
    const existing = friendProposalMap.get(p.user_a_id) || [];
    existing.push(p.id);
    friendProposalMap.set(p.user_a_id, existing);
  }
  for (const p of (friendProposalsB || [])) {
    const existing = friendProposalMap.get(p.user_b_id) || [];
    existing.push(p.id);
    friendProposalMap.set(p.user_b_id, existing);
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

  // Filter pre-fetched votes/recs to only friends' active proposals (in-memory)
  const activeProposalIds = new Set(Array.from(friendProposalMap.values()).flat());
  const votedProposalIds = new Set<string>();

  for (const v of (allUserVotes || [])) {
    if (activeProposalIds.has(v.proposal_id)) votedProposalIds.add(v.proposal_id);
  }

  // Determine hasCompletedGrid for each friend:
  // false (Help) = friend has active proposal user has NEVER voted on or recommended from
  // true (Already Helped) = everything else
  const alreadyHelped = new Set<string>();
  for (const friendId of friendIds) {
    const proposalIds = friendProposalMap.get(friendId);
    if (!proposalIds || proposalIds.length === 0) {
      alreadyHelped.add(friendId);
    } else if (friendsProposedWithMe.has(friendId)) {
      alreadyHelped.add(friendId);
    } else if (friendsWithMatch.has(friendId)) {
      alreadyHelped.add(friendId);
    } else if (proposalIds.every(pid => votedProposalIds.has(pid))) {
      alreadyHelped.add(friendId);
    }
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- karma shape is dynamic
            (p as any).karma = {
              karma_points: (friendKarma.karma_points as number) || 0,
              badge_tier: (friendKarma.badge_tier as string) || 'new',
              total_assists: (friendKarma.total_assists as number) || 0,
              userId: friendId,
              karmaPoints: (friendKarma.karma_points as number) || 0,
              totalAssists: (friendKarma.total_assists as number) || 0,
              totalProposals: (friendKarma.total_proposals as number) || 0,
              badgeTier: (friendKarma.badge_tier as string) || 'new',
              proposalSuccessRate: (friendKarma.proposal_success_rate as number) || 0,
              votingAccuracyRate: (friendKarma.voting_accuracy_rate as number) || 0,
            };
          }
          return p;
        })(),
        isAnchorToday: true,
        hasCompletedGrid: alreadyHelped.has(friendId),
        isMatched: friendsWithMatch.has(friendId),
        addedAt: f.added_at || new Date().toISOString(),
        streakDays,
        assistsCount: friendKarma?.total_assists || 0,
        // DEFERRED: Crush — restore when feature is re-enabled
        // hasCrushed: myCrushIds.has(friendId),
        // crushedOnMe: crushedOnMeIds.has(friendId),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const photosByUser = new Map<string, Array<Record<string, any>>>();
    for (const p of userPhotos) {
      if (!photosByUser.has(p.user_id)) photosByUser.set(p.user_id, []);
      photosByUser.get(p.user_id)!.push(p);
    }
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

  // Filter out friends with missing/null profiles (e.g. deleted accounts or failed joins)
  const validFriends = friends.filter(f => {
    const p = f.friend;
    // Profile join failed — mapProfileRow was never called, so we got the fallback stub
    if (!p || (!p.firstName && !p.lastName)) return false;
    // Fallback stub from line 216: { id: friendId, firstName: 'Friend' }
    if (p.firstName === 'Friend' && !p.lastName && (!p.photos || p.photos.length === 0)) return false;
    return true;
  });

  // Persist to AsyncStorage for stale-while-revalidate on next cold open
  setCachedFriendsData(validFriends).catch(() => {});
  return validFriends;
}
