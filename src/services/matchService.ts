/**
 * Match Service
 *
 * User reports and shared match utilities.
 */

import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MatchService');

// ============================================================================
// USER REPORTS
// ============================================================================

/**
 * Submit a user report and send a notification to the team.
 * Inserts a record into `user_reports` and fires a background edge function.
 *
 * Guards:
 * - Validates required fields before hitting the DB
 * - Prevents self-reports
 * - Deduplicates: skips insert if an identical report already exists (same reporter + reported + reason)
 */
export const submitUserReport = async (params: {
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
}): Promise<void> => {
  const { reporterId, reportedUserId, reason, details, reportedUserName } = params;

  // Basic validation
  if (!reporterId || !reportedUserId || !reason) {
    throw new Error('Missing required report fields');
  }
  if (reporterId === reportedUserId) {
    throw new Error('Cannot report yourself');
  }

  const trimmedDetails = details.trim() || '';

  // Dedup: check for an existing report with the same reporter + reported + reason
  // within the last 24 hours to prevent accidental double-submission
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('user_reports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('reported_user_id', reportedUserId)
    .eq('reason', reason)
    .gte('created_at', cutoff)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already reported — silently succeed so the UI doesn't show an error
    return;
  }

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    details: trimmedDetails,
  });
  if (error) throw error;

  // Fetch reporter's name for the notification email (fire-and-forget)
  const { data: reporterProfile } = await supabase
    .from('user_profiles')
    .select('first_name')
    .eq('user_id', reporterId)
    .single();

  supabase.functions.invoke('notify-report', {
    body: {
      reporter_name: reporterProfile?.first_name || 'Unknown',
      reported_name: reportedUserName,
      reason,
      details: trimmedDetails,
    },
  }).catch((err) => {
    logger.warn('[Report] Failed to notify founder via email:', err);
  });
};
