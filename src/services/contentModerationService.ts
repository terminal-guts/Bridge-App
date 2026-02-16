import { ApiResponse } from '../types';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ContentModerationService');

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bridge-frontend-production.up.railway.app';

export const contentModerationService = {
    /**
     * Analyze text for harmful content using our Python backend (PII, Banned Phrases, Asking Out)
     */
    analyzeText: async (text: string): Promise<{ isSafe: boolean; reason?: string }> => {
        try {
            logger.info('[CONTENT MODERATION] Analyzing text via backend...');

            // Send to Python backend which handles Comprehend + Local Asking Out detection
            const response = await fetch(`${API_URL}/moderate-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('[CONTENT MODERATION] Backend Error:', response.status, errorText);
                // Fail open to avoid blocking legitimate messages on error
                return { isSafe: true };
            }

            const data = await response.json();

            // Backend returns:
            // {
            //   "is_safe": boolean,
            //   "sentiment": {...},
            //   "pii": {...},
            //   "banned_check": {...},
            //   "asking_out": {...}
            // }

            if (!data.is_safe) {
                let reason = 'Content flagged as inappropriate.';

                if (data.pii?.pii_detected) reason = 'Personal information detected (PII).';
                else if (data.banned_check?.flagged) reason = 'Contains restricted phrases.';
                else if (data.asking_out?.is_asking_out) reason = 'Asking out behavior detected (please keep convo in app for now).';

                logger.warn(`[CONTENT MODERATION] Text blocked: ${reason}`, { details: data });
                return {
                    isSafe: false,
                    reason
                };
            }

            logger.info('[CONTENT MODERATION] Text is safe.');
            return { isSafe: true };

        } catch (error) {
            logger.error('[CONTENT MODERATION] Unexpected error:', error);
            return { isSafe: true };
        }
    }
};
