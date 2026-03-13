import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('leaderboardService');

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  weeklyKarma: number;
  rank: number;
  rankChange: number;
  photoUrl: string | null;
  isFriend: boolean;
  isAnonymous?: boolean;
}

export interface LeaderboardCurrentUser extends LeaderboardEntry {
  spotsBehindFirst: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardCurrentUser | null;
  weekStart: string;
  totalParticipants: number;
}

export async function fetchLeaderboard(limit = 50): Promise<{ ok: true; data: LeaderboardResponse } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-leaderboard', {
      body: { limit },
    });

    if (error) {
      logger.error('Edge function error:', error);
      return { ok: false, error: error.message || 'Failed to fetch leaderboard' };
    }

    if (data?.error) {
      logger.error('Leaderboard API error:', data.error);
      return { ok: false, error: data.error };
    }

    return { ok: true, data: data as LeaderboardResponse };
  } catch (err: any) {
    logger.error('fetchLeaderboard exception:', err);
    return { ok: false, error: err.message || 'Network error' };
  }
}
