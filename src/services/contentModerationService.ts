import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ContentModerationService');

export const contentModerationService = {
    /**
     * Analyze text for harmful content using the moderate-text Supabase edge function
     * (PII detection, banned phrases, asking-out behavior).
     * Fails open — if the function is unreachable, messages are allowed through.
     */
    analyzeText: async (text: string): Promise<{ isSafe: boolean; reason?: string }> => {
        try {
            logger.info('[CONTENT MODERATION] Analyzing text...');

            const { data, error } = await supabase.functions.invoke('moderate-text', {
                body: { text },
            });

            if (error) {
                logger.error('[CONTENT MODERATION] Edge function error:', error);
                // Fail open to avoid blocking legitimate messages on error
                return { isSafe: true };
            }

            if (!data?.is_safe) {
                let reason = 'Content flagged as inappropriate.';

                if (data?.pii?.pii_detected) reason = 'Personal information detected (PII).';
                else if (data?.banned_check?.flagged) reason = 'Contains restricted phrases.';
                else if (data?.asking_out?.is_asking_out) reason = 'Asking out behavior detected (please keep convo in app for now).';

                logger.warn(`[CONTENT MODERATION] Text blocked: ${reason}`);
                return { isSafe: false, reason };
            }

            logger.info('[CONTENT MODERATION] Text is safe.');
            return { isSafe: true };

        } catch (error) {
            logger.error('[CONTENT MODERATION] Unexpected error:', error);
            return { isSafe: true };
        }
    }
};
