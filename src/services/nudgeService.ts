import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('NudgeService');

/**
 * Send a nudge to a friend via the send-nudge edge function.
 * The edge function verifies friendship and sends an Expo push notification.
 */
export async function sendNudge(friendId: string): Promise<{ ok: boolean; pushDelivered?: boolean }> {
    try {
        const { data, error } = await supabase.functions.invoke('send-nudge', {
            body: { friendId },
        });

        if (error) {
            logger.error('[NudgeService] Edge function error:', error.message);
            return { ok: false };
        }

        return { ok: true, pushDelivered: data?.push_delivered ?? false };
    } catch (err: any) {
        logger.error('[NudgeService] Failed to send nudge:', err.message);
        return { ok: false };
    }
}
