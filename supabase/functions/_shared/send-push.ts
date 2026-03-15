/**
 * Shared push notification sender for all edge functions.
 *
 * Handles:
 * - Push token lookup
 * - User preference checks (server-side)
 * - Daily cap enforcement (Tier 2 engagement: 3/day)
 * - Cooldown enforcement (per notification type)
 * - Copy variant rotation
 * - Expo push API delivery
 * - Logging to notification_log table
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Daily cap for engagement notifications
const ENGAGEMENT_DAILY_CAP = 3;

// Total daily cap across all categories
const TOTAL_DAILY_CAP = 6;

// Cooldown hours by notification type
const COOLDOWN_HOURS: Record<string, number> = {
  streak_at_risk: 24,
  vote_reminder: 20,       // slightly less than 24h so it doesn't drift
  ice_breaker: 0,           // no cooldown, dedup via metadata (once per match per user)
  morning_leaderboard: 20,
  match_expiring: 0,        // no cooldown, but only once per proposal (use metadata)
  dormant: 72,              // minimum, escalates based on tier
  shared_celebration: 0,    // 1 per match event (use metadata)
};

// Which preference gate applies to each notification type
const PREFERENCE_GATE: Record<string, 'pref_matches_enabled' | 'pref_messages_enabled' | 'pref_nudges_enabled'> = {
  match: 'pref_matches_enabled',
  message: 'pref_messages_enabled',
  deciding: 'pref_matches_enabled',
  match_expiring: 'pref_matches_enabled',
  vote_reminder: 'pref_nudges_enabled',
  shared_celebration: 'pref_matches_enabled',
  ice_breaker: 'pref_matches_enabled',
  morning_leaderboard: 'pref_nudges_enabled',
  streak_at_risk: 'pref_nudges_enabled',
  dormant: 'pref_nudges_enabled',
  weekly_recap: 'pref_matches_enabled',
};

export interface PushPayload {
  userId: string;
  notificationType: string;
  category: 'transactional' | 'engagement' | 'ritual' | 'reengagement' | 'weekly';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  copyVariant?: number;
  metadata?: Record<string, unknown>;  // for dedup (proposal_id, match_id, etc.)
}

export interface PushResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send a push notification to a user with all safety checks.
 */
export async function sendPush(
  supabase: SupabaseClient,
  payload: PushPayload,
): Promise<PushResult> {
  const {
    userId,
    notificationType,
    category,
    title,
    body,
    data = {},
    copyVariant = 0,
    metadata = {},
  } = payload;

  try {
    // 1. Look up push token + preferences
    const { data: settings } = await supabase
      .from('user_settings')
      .select('push_token, push_enabled, pref_matches_enabled, pref_messages_enabled, pref_nudges_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (!settings?.push_token || settings.push_enabled === false) {
      return { sent: false, reason: 'no_token_or_disabled' };
    }

    // 2. Check user preference for this notification type
    const prefKey = PREFERENCE_GATE[notificationType];
    if (prefKey && settings[prefKey] === false) {
      return { sent: false, reason: 'preference_disabled' };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 3. Check total daily cap (all categories)
    const { count: totalToday } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    if ((totalToday ?? 0) >= TOTAL_DAILY_CAP && category !== 'transactional') {
      return { sent: false, reason: 'total_daily_cap' };
    }

    // 4. Check engagement daily cap (3/day for Tier 2)
    if (category === 'engagement') {
      const { count: engagementToday } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category', 'engagement')
        .gte('sent_at', `${today}T00:00:00Z`)
        .lt('sent_at', `${today}T23:59:59Z`);

      if ((engagementToday ?? 0) >= ENGAGEMENT_DAILY_CAP) {
        return { sent: false, reason: 'engagement_daily_cap' };
      }
    }

    // 5. Check cooldown for this notification type
    const cooldownHours = COOLDOWN_HOURS[notificationType] ?? 0;
    if (cooldownHours > 0) {
      const cooldownSince = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .gte('sent_at', cooldownSince);

      if ((recentCount ?? 0) > 0) {
        return { sent: false, reason: 'cooldown' };
      }
    }

    // 6. Check metadata-based dedup (e.g., only one match_expiring per proposal)
    if (metadata.dedup_key) {
      const { count: dedupCount } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .contains('metadata', { dedup_key: metadata.dedup_key });

      if ((dedupCount ?? 0) > 0) {
        return { sent: false, reason: 'dedup' };
      }
    }

    // 7. Send via Expo push API
    const pushPayload = {
      to: settings.push_token,
      title,
      body,
      data: {
        ...data,
        type: notificationType,
      },
      sound: 'default' as const,
      priority: category === 'transactional' ? 'high' as const : 'default' as const,
    };

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.json();
    const delivered = pushResponse.ok && !pushResult?.data?.[0]?.status?.includes('error');

    if (!delivered) {
      console.error(`[send-push] Expo delivery failed for ${userId}:`, pushResult);
    }

    // 8. Log to notification_log (even if delivery failed — we still "sent" it)
    await supabase.from('notification_log').insert({
      user_id: userId,
      notification_type: notificationType,
      category,
      copy_variant: copyVariant,
      metadata,
    });

    return { sent: delivered, reason: delivered ? undefined : 'expo_delivery_failed' };
  } catch (err) {
    console.error(`[send-push] Error for user ${userId}:`, err);
    return { sent: false, reason: 'error' };
  }
}

/**
 * Send push notifications to multiple users in batches.
 * Returns count of successfully sent notifications.
 */
export async function sendPushBatch(
  supabase: SupabaseClient,
  payloads: PushPayload[],
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const payload of payloads) {
    const result = await sendPush(supabase, payload);
    if (result.sent) {
      sent++;
    } else if (result.reason === 'error' || result.reason === 'expo_delivery_failed') {
      failed++;
    } else {
      skipped++;
    }
  }

  return { sent, skipped, failed };
}

/**
 * Get the next copy variant for a notification type for a user.
 * Rotates through 0..maxVariants-1 sequentially.
 */
export async function getNextCopyVariant(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string,
  maxVariants: number,
): Promise<number> {
  const { data: lastLog } = await supabase
    .from('notification_log')
    .select('copy_variant')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastVariant = lastLog?.copy_variant ?? -1;
  return (lastVariant + 1) % maxVariants;
}
