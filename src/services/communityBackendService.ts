/**
 * Community Backend Service - REAL IMPLEMENTATION
 *
 * Connects to Supabase for friends/matches/karma data
 * and Edge Functions for proposal voting/generation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Sentry } from '../lib/sentry';
import { getNext7PMCentral, getLast7PMCentral } from '../utils/centralTime';
import {
  Proposal,
  ActiveMatch,
  KarmaScore,
  UserProfile,
  CommunityTask,
  FriendWithGridStatus,
  MatchEndedEvent,
} from '../types/community';
import {
  castProposalVote,
  decideOnProposal,
} from './proposalApiService';
import { createLogger } from '../utils/secureLogger';
import {
  getCachedFriendsData,
  invalidateCachedFriendsData,
  getCachedVotingGate,
  setCachedVotingGate,
} from './communityCache';

// Re-export helpers so existing imports from this file keep working
export { mapProfileRow, resolveProfilePhotos } from './communityBackendService.helpers';
import { getCurrentUserId, deriveKarmaTier } from './communityBackendService.helpers';
import { fetchProposalsToVote, fetchPendingMatchProposals } from './communityBackendService.proposals';
import { fetchActiveMatch, endMatch, detectPartnerDeclinedProposal } from './communityBackendService.matches';
import { fetchFriendsAsAnchors } from './communityBackendService.friends';

const logger = createLogger('CommunityBackend');

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
  // Track which proposal IDs had a recommendation submitted this session.
  // Used alongside sessionVotedProposals to compute an accurate pending-action floor
  // in getCommunityTaskProgress before DB writes propagate.
  private sessionRecommendedProposals = new Set<string>();
  // Short-lived cache for friends area data (60s TTL)
  private friendsAreaCache: { data: FriendWithGridStatus[]; ts: number } | null = null;
  private static readonly FRIENDS_CACHE_TTL_MS = 60_000;

  // Full friends-area result cache for stale-while-revalidate
  private friendsAreaResultCache: {
    data: { friends: FriendWithGridStatus[]; pendingProposals: any[]; activeMatch: ActiveMatch | null };
    ts: number;
  } | null = null;
  private static readonly FRIENDS_AREA_RESULT_STALE_MS = 30_000; // serve stale for 30s
  private backgroundRefreshInFlight = false;

  // Timestamp of last full getFriendsAreaData completion — used by screens
  // to skip redundant refetches on rapid tab switches
  private lastFriendsAreaLoadAt = 0;

  // ========================================================================
  // Proposals (via Edge Functions)
  // ========================================================================

  async getProposalsToVote(): Promise<Proposal[]> {
    return fetchProposalsToVote();
  }

  async submitProposalVote(proposalId: string, vote: 'yes' | 'no'): Promise<void> {
    const userId = await getCurrentUserId();
    const voteTypeMap = { yes: 'YES', no: 'NO' } as const;
    const voteType = voteTypeMap[vote];

    await castProposalVote(proposalId, userId, voteType);
    this.invalidateFriendsCache();
    if (!this.sessionVotedProposals.has(proposalId)) {
      this.sessionVotedProposals.add(proposalId);
      this.sessionVoteCount++;
      AsyncStorage.setItem(STORAGE_KEY_VOTES, String(this.sessionVoteCount)).catch(() => {});
    }
  }

  // ========================================================================
  // Friends (Supabase)
  // ========================================================================

  /**
   * Record a recommendation submitted this session so getCommunityTaskProgress
   * counts it in the pending floor before the DB write propagates.
   */
  recordSessionRecommendation(proposalId: string): void {
    this.sessionRecommendedProposals.add(proposalId);
  }

  // Fire-and-forget: persist the recommendation to the DB via edge function.
  // Errors are swallowed — the session record is the source of truth for UX.
  async submitRecommendation(
    recommendedPersonId: string,
    recommendedToFriendId: string,
    sourceProposalId: string,
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('submit-recommendation', {
        body: {
          recommended_person_id: recommendedPersonId,
          recommended_to_friend_id: recommendedToFriendId,
          source_proposal_id: sourceProposalId,
        },
      });
      if (error) {
        Sentry.captureException(error, { extra: { fn: 'submitRecommendation' } });
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { fn: 'submitRecommendation' } });
    }
  }

  invalidateFriendsCache(): void {
    this.friendsAreaCache = null;
    this.friendsAreaResultCache = null;
    invalidateCachedFriendsData().catch(() => {});
  }

  async getFriendsAsAnchors(forceRefresh = false): Promise<FriendWithGridStatus[]> {
    if (!forceRefresh && this.friendsAreaCache && Date.now() - this.friendsAreaCache.ts < CommunityBackendService.FRIENDS_CACHE_TTL_MS) {
      return this.friendsAreaCache.data;
    }

    const friends = await fetchFriendsAsAnchors();
    this.friendsAreaCache = { data: friends, ts: Date.now() };
    return friends;
  }

  // ========================================================================
  // Pending Match Proposals (Supabase direct query)
  // ========================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- returns dynamic DB-derived objects
  async getPendingMatchProposals(): Promise<any[]> {
    return fetchPendingMatchProposals();
  }

  async respondToMatchProposal(proposalId: string, accept: boolean, partnerInfo?: { name: string; photoUrl?: string }): Promise<void> {
    const userId = await getCurrentUserId();
    const decision = accept ? 'accepted' : 'declined';
    await decideOnProposal(proposalId, userId, decision);

    // Optimistically update the cached result so MatchesScreen reflects the new
    // decision state instantly when it refocuses — no network round-trip needed.
    // Clone to avoid mutating references held by callers from previous reads.
    if (this.friendsAreaResultCache) {
      const updatedData = { ...this.friendsAreaResultCache.data };
      if (accept) {
        // Mark yourDecision = accepted in the cached proposal (clone the array + matching item)
        updatedData.pendingProposals = updatedData.pendingProposals.map((p: any) => {
          if (p.proposalId === proposalId || p.id === proposalId) {
            return { ...p, yourDecision: 'accepted', hasResponded: true };
          }
          return p;
        });
      } else {
        // Remove the proposal from cache — declined proposals disappear from the list
        updatedData.pendingProposals = updatedData.pendingProposals
          .filter((p: any) => p.proposalId !== proposalId && p.id !== proposalId);
      }
      // Keep cache timestamp fresh so stale-while-revalidate serves it immediately,
      // but reset backgroundRefreshInFlight so a real fetch runs in the background.
      this.friendsAreaResultCache = { data: updatedData, ts: Date.now() };
      this.backgroundRefreshInFlight = false;
    }

    // Reset the load timer so useFocusEffect bypasses the 10s debounce guard
    // and triggers a reload as soon as MatchesScreen regains focus.
    this.lastFriendsAreaLoadAt = 0;

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
    return fetchActiveMatch(
      (event) => { this.pendingEndedEvent = event; },
      () => this.pendingEndedEvent,
    );
  }

  async endActiveMatch(matchId: string, reason: string, partnerInfo?: { name: string; photoUrl?: string }): Promise<void> {
    await endMatch(matchId, reason, partnerInfo, (event) => { this.pendingEndedEvent = event; });
  }

  // ========================================================================
  // Karma (Supabase)
  // ========================================================================

  async getKarmaScore(): Promise<KarmaScore> {
    const userId = await getCurrentUserId();

    const { data: karma, error: karmaError } = await supabase
      .from('karma_scores')
      .select('user_id, karma_points, total_assists, total_proposals, badge_tier, proposal_success_rate, voting_accuracy_rate, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (karmaError) {
      logger.error('Failed to fetch karma score', karmaError.message);
    }

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

    // Count votes + recommendations since the last 7PM Central reset
    const resetISO = new Date(lastReset).toISOString();
    const [voteResult, recResult] = await Promise.all([
      supabase
        .from('proposal_votes')
        .select('id', { count: 'exact', head: true })
        .eq('voter_user_id', userId)
        .gte('created_at', resetISO),
      supabase
        .from('friend_recommendations')
        .select('id', { count: 'exact', head: true })
        .eq('recommender_id', userId)
        .gte('created_at', resetISO),
    ]);

    if (voteResult.error) {
      logger.error('Failed to fetch vote count', voteResult.error.message);
    }
    if (recResult.error) {
      logger.error('Failed to fetch recommendation count', recResult.error.message);
    }

    const voteCount = voteResult.count;
    const recCount = recResult.count;

    // Only actual votes count toward the gate — recommendations do not.
    const dbVotes = voteCount || 0;
    // DB is source of truth. Session count is used as a floor for votes
    // taken this session that may not have propagated to DB yet.
    const pendingSessionVotes = this.sessionVotedProposals.size;
    const votesCompleted = Math.max(dbVotes, pendingSessionVotes);
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
  // Cached Friends Area (stale-while-revalidate for cold opens)
  // ========================================================================

  /**
   * Returns cached friends data from AsyncStorage if available.
   * Used by CommunityScreen to render instantly on cold open.
   */
  async getCachedFriendsArea(): Promise<FriendWithGridStatus[] | null> {
    return getCachedFriendsData();
  }

  // ========================================================================
  // Voting Gate Cache
  // ========================================================================

  async getCachedVotingComplete(cycleId: string): Promise<boolean | null> {
    return getCachedVotingGate(cycleId);
  }

  async cacheVotingComplete(completed: boolean, cycleId: string): Promise<void> {
    await setCachedVotingGate(completed, cycleId);
  }

  // ========================================================================
  // Friends Area Aggregate
  // ========================================================================

  async getFriendsAreaData(): Promise<{
    friends: FriendWithGridStatus[];
    pendingProposals: any[];
    activeMatch: ActiveMatch | null;
  }> {
    // Stale-while-revalidate: return cached result immediately, refresh in background
    if (
      this.friendsAreaResultCache &&
      Date.now() - this.friendsAreaResultCache.ts < CommunityBackendService.FRIENDS_AREA_RESULT_STALE_MS
    ) {
      this.lastFriendsAreaLoadAt = Date.now();
      // Trigger background refresh if not already in-flight
      if (!this.backgroundRefreshInFlight) {
        this.backgroundRefreshInFlight = true;
        this._fetchFriendsAreaData(true).then(result => {
          this.friendsAreaResultCache = { data: result, ts: Date.now() };
        }).catch((err) => {
          logger.error('Background friends-area refresh failed', err instanceof Error ? err.message : String(err));
        }).finally(() => {
          this.backgroundRefreshInFlight = false;
        });
      }
      return this.friendsAreaResultCache.data;
    }

    try {
      const result = await this._fetchFriendsAreaData(false);
      this.friendsAreaResultCache = { data: result, ts: Date.now() };
      this.lastFriendsAreaLoadAt = Date.now();
      return result;
    } catch (error) {
      // If we have stale cache, return it rather than crashing the screen
      if (this.friendsAreaResultCache) {
        logger.error('getFriendsAreaData failed, returning stale cache', error instanceof Error ? error.message : String(error));
        return this.friendsAreaResultCache.data;
      }
      throw error;
    }
  }

  private async _fetchFriendsAreaData(forceRefresh: boolean): Promise<{
    friends: FriendWithGridStatus[];
    pendingProposals: any[];
    activeMatch: ActiveMatch | null;
  }> {
    const [friends, pendingProposals, activeMatch] = await Promise.all([
      this.getFriendsAsAnchors(forceRefresh),
      this.getPendingMatchProposals(),
      this.getActiveMatch(),
    ]);

    // Detect if the other person declined a proposal you accepted
    if (!activeMatch && pendingProposals.length === 0 && !this.pendingEndedEvent) {
      await this.detectPartnerDeclinedProposal();
    }

    return { friends, pendingProposals, activeMatch };
  }

  /** Timestamp of last getFriendsAreaData() completion (ms since epoch). */
  getLastFriendsAreaLoadTime(): number {
    return this.lastFriendsAreaLoadAt;
  }

  private async detectPartnerDeclinedProposal(): Promise<void> {
    await detectPartnerDeclinedProposal((event) => { this.pendingEndedEvent = event; });
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

  /**
   * Called on app foreground — checks whether the daily cycle boundary (7 PM Central)
   * passed while the app was backgrounded. If so, resets vote counts and invalidates
   * stale caches so the user sees fresh data instead of yesterday's state.
   *
   * Also invalidates the friends area cache if the app was backgrounded for more than
   * 2 minutes, since match/proposal states may have changed server-side.
   */
  checkForegroundStaleness(): void {
    const now = Date.now();

    // If the daily cycle boundary passed, reset session state
    if (now >= this.nextResetAt) {
      logger.info('Daily cycle boundary passed while backgrounded — resetting');
      this.nextResetAt = getNext7PMCentral();
      this.sessionVoteCount = 0;
      this.sessionVotedProposals.clear();
      this.sessionRecommendedProposals.clear();
      AsyncStorage.setItem(STORAGE_KEY_NEXT_RESET, String(this.nextResetAt)).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEY_VOTES, '0').catch(() => {});
      this.invalidateFriendsCache();
      this.notifyStateChange();
      return; // notifyStateChange triggers reloads — no need to also invalidate below
    }

    // If the cached data is older than 2 minutes, invalidate so the next read
    // does a real fetch instead of serving stale-while-revalidate data
    if (this.friendsAreaResultCache && now - this.friendsAreaResultCache.ts > 120_000) {
      this.friendsAreaResultCache = null;
    }
  }

  getNextResetAt(): number {
    return this.nextResetAt;
  }

  triggerReset(): void {
    this.nextResetAt = getNext7PMCentral();
    this.sessionVoteCount = 0;
    this.sessionVotedProposals.clear();
    this.sessionRecommendedProposals.clear();
    AsyncStorage.setItem(STORAGE_KEY_NEXT_RESET, String(this.nextResetAt)).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEY_VOTES, '0').catch(() => {});
    this.notifyStateChange();
  }
}

export const communityBackendService = new CommunityBackendService();
export default communityBackendService;
