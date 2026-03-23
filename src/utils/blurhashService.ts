/**
 * Blurhash Service
 *
 * Calls the `generate-photo-blurhash` Supabase edge function to produce
 * a blurhash string for a given storage path. The blurhash is stored
 * alongside the photo metadata in the JSONB photos array and used by
 * expo-image's `placeholder` prop for instant blurred previews.
 */

import { supabase } from '../lib/supabase';
import { createLogger } from './secureLogger';

const logger = createLogger('BlurhashService');

/**
 * Generate a blurhash string for a photo stored in Supabase Storage.
 *
 * @param storagePath - The storage path (e.g. "userId/photo_123.jpg")
 * @returns The blurhash string, or undefined if generation fails
 */
export async function generateBlurhash(storagePath: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-photo-blurhash', {
      body: { storagePath },
    });

    if (error) {
      logger.warn('[BlurhashService] Edge function error:', error.message);
      return undefined;
    }

    if (data?.blurhash && typeof data.blurhash === 'string') {
      return data.blurhash;
    }

    logger.warn('[BlurhashService] No blurhash in response');
    return undefined;
  } catch (err: unknown) {
    logger.warn('[BlurhashService] Failed to generate blurhash:', err instanceof Error ? err.message : String(err));
    return undefined;
  }
}
