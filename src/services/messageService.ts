/**
 * Message Service for Bridge Chat
 *
 * Provides real-time messaging functionality with Supabase backend.
 * Falls back to mock mode when MESSAGING_BACKEND_ENABLED is false.
 *
 * Features:
 * - Send text and audio messages
 * - Real-time message subscriptions via Supabase Realtime
 * - Audio file upload to Supabase Storage
 * - Read receipts
 * - Content moderation for text messages
 *
 * Friend messaging operations are in messageService.friends.ts.
 */

import { ApiResponse, Message } from '../types';
import { supabase, isRealSupabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MessageService');
import { FEATURES } from '../config/features';
import { contentModerationService } from './contentModerationService';

// Re-export friend messaging functions so existing imports keep working
export {
  getFriendMessages,
  sendFriendMessage,
  markFriendMessagesAsRead,
  subscribeToFriendMessages,
  getFriendUnreadCount,
  getBatchUnreadFriendIds,
} from './messageService.friends';

// Import shared state and utilities
import {
  mockMessages,
  mockCallbacks,
  activeChannels,
  generateMessageId,
  getCurrentUserId,
  uploadAudioFile,
  resetMockState,
} from './messageService.shared';

// ============================================================================
// Configuration
// ============================================================================

const USE_REAL_BACKEND = FEATURES.MESSAGING_BACKEND_ENABLED && isRealSupabase();

// UUID v4 regex — mock IDs like "active-match-1" are not valid UUIDs and
// must never reach Supabase (Postgres rejects them with code 22P02).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string) => UUID_REGEX.test(id);

// Log mode on initialization
logger.info(`[MESSAGE SERVICE] Mode: ${USE_REAL_BACKEND ? 'REAL SUPABASE' : 'MOCK'}`);

// ============================================================================
// Database Types (match Supabase schema)
// ============================================================================

interface DbMessage {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  type: 'text' | 'audio' | 'image';
  content: string;
  duration: number | null;
  sent_at: string;
  read_at: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database message to frontend Message type
 */
const dbToMessage = (dbMsg: DbMessage): Message => ({
  id: dbMsg.id,
  matchId: dbMsg.match_id,
  senderId: dbMsg.sender_id,
  type: dbMsg.type,
  content: dbMsg.content,
  duration: dbMsg.duration ?? undefined,
  sentAt: dbMsg.sent_at,
  readAt: dbMsg.read_at ?? undefined,
});

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Get messages for a specific match
 */
export const getMatchMessages = async (matchId: string): Promise<ApiResponse<Message[]>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(matchId)) {
      logger.info('[MESSAGE SERVICE] Mock: Getting messages for match:', matchId);
      const messages = mockMessages[matchId] || [];
      return { ok: true, data: messages };
    }

    logger.info('[MESSAGE SERVICE] Fetching messages for match:', matchId);

    const { data, error } = await supabase
      .from('messages')
      .select('id, match_id, sender_id, receiver_id, type, content, duration, sent_at, read_at')
      .eq('match_id', matchId)
      .order('sent_at', { ascending: true });

    if (error) {
      logger.error('[MESSAGE SERVICE] Fetch error:', error);
      return {
        ok: false,
        error: {
          code: 'MESSAGES_FETCH_ERROR',
          message: error.message,
        },
      };
    }

    const messages = (data || []).map(dbToMessage);
    logger.info('[MESSAGE SERVICE] Fetched', messages.length, 'messages');
    return { ok: true, data: messages };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Exception:', error);
    return {
      ok: false,
      error: {
        code: 'MESSAGES_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Send a message (text, audio, or image)
 */
export const sendMessage = async (
  matchId: string,
  receiverId: string,
  content: string,
  type: 'text' | 'audio' | 'image' = 'text',
  duration?: number,
  waveformData?: number[]
): Promise<ApiResponse<Message>> => {
  try {
    logger.info(`[MESSAGE SERVICE] Sending ${type} message to match:`, matchId);

    // Get current user ID
    const senderId = await getCurrentUserId();
    if (!senderId) {
      return {
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'User not authenticated',
        },
      };
    }

    // Match status check — prevent messaging on ended/expired matches
    if (matchId && USE_REAL_BACKEND) {
      const { data: match } = await supabase
        .from('matches')
        .select('status')
        .eq('id', matchId)
        .maybeSingle();

      if (!match || match.status !== 'active') {
        return {
          ok: false,
          error: {
            code: 'MATCH_ENDED',
            message: 'This match is no longer active',
          },
        };
      }
    }

    // Block check — prevent messaging if either user has blocked the other
    if (receiverId && USE_REAL_BACKEND) {
      const { data: blockRows } = await supabase
        .from('blocked_users')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),` +
          `and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`,
        )
        .limit(1);

      if (blockRows && blockRows.length > 0) {
        return {
          ok: false,
          error: {
            code: 'BLOCKED',
            message: 'Unable to send message',
          },
        };
      }
    }

    // Content moderation for text messages (skip for date proposals — system-generated)
    if (type === 'text' && !content.startsWith('\u{1F4C5} Date Proposal:')) {
      const moderationResult = await contentModerationService.analyzeText(content);
      if (!moderationResult.isSafe) {
        logger.warn('[MESSAGE SERVICE] Blocked by content filter:', moderationResult.reason);
        return {
          ok: false,
          error: {
            code: 'CONTENT_VIOLATION',
            message: moderationResult.reason || 'Message contains inappropriate content.',
          },
        };
      }
    }

    // Handle audio upload
    let messageContent = content;
    if (type === 'audio' && content.startsWith('file://')) {
      const uploadResult = await uploadAudioFile(content, matchId, senderId);
      if (uploadResult.error) {
        return {
          ok: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: uploadResult.error,
          },
        };
      }
      messageContent = uploadResult.url;
    }

    // Create message object
    const sentAt = new Date().toISOString();

    if (!USE_REAL_BACKEND || !isValidUUID(matchId)) {
      // Mock mode: store in memory
      const messageId = generateMessageId();
      const newMessage: Message = {
        id: messageId,
        matchId,
        senderId,
        type,
        content: messageContent,
        duration,
        waveformData,
        sentAt,
      };

      logger.info('[MESSAGE SERVICE] Mock: Storing message locally');
      if (!mockMessages[matchId]) {
        mockMessages[matchId] = [];
      }
      mockMessages[matchId].push(newMessage);

      // Trigger mock callbacks
      if (mockCallbacks[matchId]) {
        mockCallbacks[matchId].forEach(callback => callback(newMessage));
      }

      return { ok: true, data: newMessage };
    }

    // Real mode: insert into Supabase (let DB generate UUID id)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        receiver_id: receiverId,
        type,
        content: messageContent,
        duration: duration ?? null,
        sent_at: sentAt,
      })
      .select()
      .single();

    if (error) {
      logger.error('[MESSAGE SERVICE] Insert error:', error);
      return {
        ok: false,
        error: {
          code: 'SEND_MESSAGE_ERROR',
          message: error.message,
        },
      };
    }

    const savedMessage = dbToMessage(data);
    logger.info('[MESSAGE SERVICE] Message sent successfully:', savedMessage.id);
    return { ok: true, data: savedMessage };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Send exception:', error);
    return {
      ok: false,
      error: {
        code: 'SEND_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  matchId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(matchId)) {
      logger.info('[MESSAGE SERVICE] Mock: Marking messages as read:', matchId);
      if (mockMessages[matchId]) {
        mockMessages[matchId] = mockMessages[matchId].map(msg => ({
          ...msg,
          readAt: msg.senderId !== userId ? new Date().toISOString() : msg.readAt,
        }));
      }
      return { ok: true };
    }

    logger.info('[MESSAGE SERVICE] Marking messages as read:', matchId, userId);

    // Use RPC function for atomic update
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      p_match_id: matchId,
      p_user_id: userId,
    });

    if (error) {
      // If RPC doesn't exist, fall back to direct update
      const { error: updateError } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (updateError) {
        logger.error('[MESSAGE SERVICE] Mark read error:', updateError);
        return {
          ok: false,
          error: {
            code: 'MARK_READ_ERROR',
            message: updateError.message,
          },
        };
      }
    }

    logger.info('[MESSAGE SERVICE] Messages marked as read');
    return { ok: true };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Mark read exception:', error);
    return {
      ok: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to real-time messages for a match
 * Returns an object with unsubscribe function
 */
export const subscribeToMessages = (
  matchId: string,
  callback: (message: Message) => void
): { unsubscribe: () => void } => {
  if (!USE_REAL_BACKEND || !isValidUUID(matchId)) {
    logger.info('[MESSAGE SERVICE] Mock: Subscribing to match:', matchId);

    // Mock subscription using callbacks
    if (!mockCallbacks[matchId]) {
      mockCallbacks[matchId] = [];
    }
    mockCallbacks[matchId].push(callback);

    return {
      unsubscribe: () => {
        logger.info('[MESSAGE SERVICE] Mock: Unsubscribing from match:', matchId);
        mockCallbacks[matchId] = mockCallbacks[matchId].filter(cb => cb !== callback);
      },
    };
  }

  logger.info('[MESSAGE SERVICE] Subscribing to real-time messages for match:', matchId);

  // Clean up any existing subscription for this match
  const existingChannel = activeChannels.get(matchId);
  if (existingChannel) {
    logger.info('[MESSAGE SERVICE] Removing existing subscription for match:', matchId);
    supabase.removeChannel(existingChannel);
    activeChannels.delete(matchId);
  }

  // Create new channel for this match
  const channelName = `messages:${matchId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        logger.info('[MESSAGE SERVICE] New message received:', payload);
        const newMessage = dbToMessage(payload.new as DbMessage);
        callback(newMessage);
      }
    )
    .subscribe((status) => {
      logger.info('[MESSAGE SERVICE] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        logger.info('[MESSAGE SERVICE] Successfully subscribed to match:', matchId);
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('[MESSAGE SERVICE] Subscription error for match:', matchId);
      }
    });

  // Track the channel
  activeChannels.set(matchId, channel);

  return {
    unsubscribe: () => {
      logger.info('[MESSAGE SERVICE] Unsubscribing from match:', matchId);
      const ch = activeChannels.get(matchId);
      if (ch) {
        supabase.removeChannel(ch);
        activeChannels.delete(matchId);
      }
    },
  };
};

/**
 * Get unread message count for a match
 */
export const getUnreadCount = async (
  matchId: string,
  userId: string
): Promise<ApiResponse<number>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(matchId)) {
      const messages = mockMessages[matchId] || [];
      const count = messages.filter(m => m.senderId !== userId && !m.readAt).length;
      return { ok: true, data: count };
    }

    const { data, error } = await supabase.rpc('get_unread_count', {
      p_match_id: matchId,
      p_user_id: userId,
    });

    if (error) {
      // Fallback: count directly
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (countError) {
        return {
          ok: false,
          error: {
            code: 'COUNT_ERROR',
            message: countError.message,
          },
        };
      }

      return { ok: true, data: count || 0 };
    }

    return { ok: true, data: data || 0 };
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: 'COUNT_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
};

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up all active subscriptions
 * Call this when the user logs out or the app closes
 */
export const cleanupSubscriptions = async (): Promise<void> => {
  logger.info('[MESSAGE SERVICE] Cleaning up all subscriptions');
  const removePromises: Promise<unknown>[] = [];
  activeChannels.forEach((channel) => {
    removePromises.push(supabase.removeChannel(channel));
  });
  await Promise.all(removePromises);
  activeChannels.clear();
  resetMockState();
};

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Clear mock messages (for testing)
 */
export const clearMockMessages = (): void => {
  logger.info('[MESSAGE SERVICE] Clearing mock messages');
  resetMockState();
};

/**
 * Add mock message (for testing)
 */
export const addMockMessage = (matchId: string, message: Message): void => {
  if (!mockMessages[matchId]) {
    mockMessages[matchId] = [];
  }
  mockMessages[matchId].push(message);

  // Trigger callbacks
  if (mockCallbacks[matchId]) {
    mockCallbacks[matchId].forEach(callback => callback(message));
  }
};
