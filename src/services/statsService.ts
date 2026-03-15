import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('statsService');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PeriodStats {
  couples_set_up: number;
  total_votes_cast: number;
  accuracy: number;
  yes_rate: number;
  current_streak: number;
  longest_streak: number;
  karma_points: number;
  assists: number;
  friends_helped: number;
  weekly_rank: number;
  total_users: number;
  percentile: number;
}

export interface WeekStats extends PeriodStats {
  votes_trend: number;
  accuracy_trend: number;
  karma_trend: number;
  assists_trend: number;
}

export interface UserStats {
  all_time: PeriodStats & { first_assist_date: string | null };
  week: WeekStats;
}

export interface CampusPeriodStats {
  campus_name: string;
  total_couples_set_up: number;
  total_votes_cast: number;
  avg_approval_rate: number;
  active_matchmakers: number;
  proposals_this_week: number;
  top_matchmaker_name: string;
  top_matchmaker_assists: number;
  most_popular_day: string;
  streak_record: number;
  match_rate: number;
}

export interface CampusStats {
  all_time: CampusPeriodStats;
  week: CampusPeriodStats;
}

export interface StatsResponse {
  userStats: UserStats;
  campusStats: CampusStats;
}

// ─── Archetype ───────────────────────────────────────────────────────────────

export type Archetype = {
  name: string;
  emoji: string;
  description: string;
  gradient: [string, string];
};

export const getArchetype = (accuracy: number, yesRate: number, assists: number): Archetype => {
  if (assists >= 5 && accuracy >= 75) {
    return {
      name: 'The Cupid',
      emoji: '💘',
      description: 'High accuracy and lots of assists — you have a gift for seeing connections others miss.',
      gradient: ['#FF6B6B', '#EE5A24'],
    };
  }
  if (accuracy >= 80) {
    return {
      name: 'The Strategist',
      emoji: '🧠',
      description: 'Your votes are surgical. When you say yes, it means something.',
      gradient: ['#6C5CE7', '#A55EEA'],
    };
  }
  if (yesRate >= 70) {
    return {
      name: 'The Optimist',
      emoji: '☀️',
      description: 'You believe in love and it shows. Your enthusiasm lifts the whole community.',
      gradient: ['#FDCB6E', '#F0932B'],
    };
  }
  if (assists >= 3) {
    return {
      name: 'The Connector',
      emoji: '🔗',
      description: 'You bring people together. Your votes have directly helped couples form.',
      gradient: ['#00B894', '#10B981'],
    };
  }
  return {
    name: 'The Scout',
    emoji: '🔍',
    description: 'Careful and observant — you\'re building your matchmaking instincts.',
    gradient: ['#437FFF', '#2B65F9'],
  };
};

// ─── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<{ ok: true; data: StatsResponse } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-stats');

    if (error) {
      logger.error('Edge function error:', error);
      return { ok: false, error: error.message || 'Failed to fetch stats' };
    }

    if (data?.error) {
      logger.error('Stats API error:', data.error);
      return { ok: false, error: data.error };
    }

    return { ok: true, data: data as StatsResponse };
  } catch (err: unknown) {
    logger.error('fetchStats exception:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
