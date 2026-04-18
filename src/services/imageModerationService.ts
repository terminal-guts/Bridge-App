import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ImageModerationService');

export interface ImageModerationResult {
  approved: boolean;
  hasFace: boolean | null;
  reasons: string[];
}

/**
 * Check a profile photo for face detection (primary photos) and content safety.
 * Fails open — if the moderation service is unreachable, the photo is allowed.
 */
export const moderateImage = async (
  storagePath: string,
  isMain: boolean,
): Promise<ImageModerationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-image', {
      body: { storagePath, isMain },
    });

    if (error) {
      logger.error('[IMAGE MODERATION] Edge function error:', error);
      // Fail open
      return { approved: true, hasFace: null, reasons: [] };
    }

    if (!data) {
      return { approved: true, hasFace: null, reasons: [] };
    }

    if (!data.approved) {
      logger.warn('[IMAGE MODERATION] Photo rejected:', data.reasons);
    }

    return {
      approved: data.approved ?? true,
      hasFace: data.hasFace ?? null,
      reasons: data.reasons ?? [],
    };
  } catch (err) {
    logger.error('[IMAGE MODERATION] Unexpected error:', err);
    // Fail open
    return { approved: true, hasFace: null, reasons: [] };
  }
};
