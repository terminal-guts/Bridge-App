/**
 * Message Service - Shared state and utilities
 *
 * Extracted from messageService.ts so both messageService.ts and
 * messageService.friends.ts can share state without circular imports.
 */

import { Message } from '../types';
import { supabase, isRealSupabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { FEATURES } from '../config/features';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base64-arraybuffer';

const logger = createLogger('MessageService');

const USE_REAL_BACKEND = FEATURES.MESSAGING_BACKEND_ENABLED && isRealSupabase();
const STORAGE_BUCKET = 'chat-audio';

// ============================================================================
// Shared Mutable State
// ============================================================================

export let mockMessages: { [matchId: string]: Message[] } = {};
export let mockCallbacks: { [matchId: string]: ((message: Message) => void)[] } = {};
export const activeChannels: Map<string, RealtimeChannel> = new Map();

// ============================================================================
// Shared Helpers
// ============================================================================

export const generateMessageId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export async function getCurrentUserId(): Promise<string> {
  if (!USE_REAL_BACKEND) {
    return '00000000-0000-0000-0000-000000000001';
  }
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

/**
 * Upload audio file to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export const uploadAudioFile = async (
  localUri: string,
  matchId: string,
  senderId: string
): Promise<{ url: string; error: string | null }> => {
  if (!USE_REAL_BACKEND) {
    // In mock mode, just return the local URI
    logger.info('[MESSAGE SERVICE] Mock mode: using local URI for audio');
    return { url: localUri, error: null };
  }

  try {
    // Generate unique filename with correct extension
    const timestamp = Date.now();
    const uriExt = localUri.match(/\.(\w+)$/)?.[1] || 'm4a';
    const ext = ['m4a', 'mp4', 'webm', 'aac', 'mpeg'].includes(uriExt) ? uriExt : 'm4a';
    const contentTypeMap: Record<string, string> = {
      m4a: 'audio/mp4',
      mp4: 'audio/mp4',
      webm: 'audio/webm',
      aac: 'audio/aac',
      mpeg: 'audio/mpeg',
    };
    const filename = `${matchId}/${senderId}/${timestamp}.${ext}`;
    const contentType = contentTypeMap[ext] || 'audio/mp4';

    // Read the file as base64 and decode to ArrayBuffer (avoids RN blob corruption)
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = base64Decode(base64);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      logger.error('[MESSAGE SERVICE] Audio upload error:', error);
      return { url: '', error: error.message };
    }

    // Get signed URL (more reliable than public URL for iOS AVPlayer)
    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filename, 60 * 60 * 24 * 365); // 1 year expiry

    if (signError || !signedData?.signedUrl) {
      logger.error('[MESSAGE SERVICE] Signed URL error:', signError);
      // Fallback to public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filename);
      logger.info('[MESSAGE SERVICE] Audio uploaded (public):', urlData.publicUrl);
      return { url: urlData.publicUrl, error: null };
    }

    logger.info('[MESSAGE SERVICE] Audio uploaded (signed):', signedData.signedUrl);
    return { url: signedData.signedUrl, error: null };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Audio upload exception:', error);
    return { url: '', error: error instanceof Error ? error.message : 'Failed to upload audio' };
  }
};

// ============================================================================
// Cleanup helpers (mutate shared state)
// ============================================================================

export function resetMockState(): void {
  mockMessages = {};
  mockCallbacks = {};
}
