/**
 * Message Service - Friend messaging operations
 *
 * Extracted from messageService.ts for file-size management.
 * Contains: getFriendMessages, sendFriendMessage, markFriendMessagesAsRead,
 * subscribeToFriendMessages, getFriendUnreadCount, getBatchUnreadFriendIds.
 */

import { ApiResponse, Message } from '../types';
import { supabase, isRealSupabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { FEATURES } from '../config/features';
import { contentModerationService } from './contentModerationService';
import { RealtimeChannel } from '@supabase/supabase-js';

const logger = createLogger('MessageService');

const USE_REAL_BACKEND = FEATURES.MESSAGING_BACKEND_ENABLED && isRealSupabase();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string) => UUID_REGEX.test(id);

// Shared state — references from main messageService
import {
  mockMessages,
  mockCallbacks,
  activeChannels,
  generateMessageId,
  getCurrentUserId,
  uploadAudioFile,
} from './messageService.shared';

// ============================================================================
// Friend Message Types
// ============================================================================

interface DbFriendMessage {
  id: string;
  friendship_id: string;
  sender_id: string;
  receiver_id: string;
  type: 'text' | 'audio' | 'image';
  content: string;
  duration: number | null;
  sent_at: string;
  read_at: string | null;
}

const dbToFriendMessage = (dbMsg: DbFriendMessage): Message => ({
  id: dbMsg.id,
  matchId: dbMsg.friendship_id, // Reuse matchId field for friendshipId
  senderId: dbMsg.sender_id,
  type: dbMsg.type,
  content: dbMsg.content,
  duration: dbMsg.duration ?? undefined,
  sentAt: dbMsg.sent_at,
  readAt: dbMsg.read_at ?? undefined,
});

// ============================================================================
// Friend Message Operations
// ============================================================================

/**
 * Get messages for a specific friendship.
 * Queries by the user pair (sender/receiver) rather than friendship_id,
 * because the friends table stores two rows per pair and each user gets
 * a different friendship_id.
 */
export const getFriendMessages = async (userId: string, friendId: string): Promise<ApiResponse<Message[]>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(userId) || !isValidUUID(friendId)) {
      logger.info('[MESSAGE SERVICE] Mock: Getting friend messages:', userId, friendId);
      const messages = mockMessages[`friend_${userId}_${friendId}`] || [];
      return { ok: true, data: messages };
    }

    logger.info('[MESSAGE SERVICE] Fetching friend messages between:', userId, friendId);

    // Query messages where both users are involved (as sender or receiver)
    const { data, error } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)
      .order('sent_at', { ascending: true });

    if (error) {
      logger.error('[MESSAGE SERVICE] Friend fetch error:', error);
      return {
        ok: false,
        error: { code: 'FRIEND_MESSAGES_FETCH_ERROR', message: error.message },
      };
    }

    const messages = (data || []).map(dbToFriendMessage);
    logger.info('[MESSAGE SERVICE] Fetched', messages.length, 'friend messages');
    return { ok: true, data: messages };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Friend fetch exception:', error);
    return {
      ok: false,
      error: { code: 'FRIEND_MESSAGES_FETCH_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' },
    };
  }
};

/**
 * Send a message to a friend
 */
export const sendFriendMessage = async (
  friendshipId: string,
  receiverId: string,
  content: string,
  type: 'text' | 'audio' | 'image' = 'text',
  duration?: number,
): Promise<ApiResponse<Message>> => {
  try {
    logger.info(`[MESSAGE SERVICE] Sending ${type} friend message:`, friendshipId);

    const senderId = await getCurrentUserId();
    if (!senderId) {
      return { ok: false, error: { code: 'AUTH_ERROR', message: 'User not authenticated' } };
    }

    // Content moderation for text messages (skip for date proposals — system-generated)
    if (type === 'text' && !content.startsWith('\u{1F4C5} Date Proposal:')) {
      const moderationResult = await contentModerationService.analyzeText(content);
      if (!moderationResult.isSafe) {
        logger.warn('[MESSAGE SERVICE] Friend message blocked by content filter:', moderationResult.reason);
        return {
          ok: false,
          error: { code: 'CONTENT_VIOLATION', message: moderationResult.reason || 'Message contains inappropriate content.' },
        };
      }
    }

    // Handle audio upload
    let messageContent = content;
    if (type === 'audio' && content.startsWith('file://')) {
      const uploadResult = await uploadAudioFile(content, friendshipId, senderId);
      if (uploadResult.error) {
        return { ok: false, error: { code: 'UPLOAD_ERROR', message: uploadResult.error } };
      }
      messageContent = uploadResult.url;
    }

    const sentAt = new Date().toISOString();

    if (!USE_REAL_BACKEND || !isValidUUID(friendshipId)) {
      const messageId = generateMessageId();
      const newMessage: Message = {
        id: messageId,
        matchId: friendshipId,
        senderId,
        type,
        content: messageContent,
        duration,
        sentAt,
      };
      const mockKey = `friend_${friendshipId}`;
      if (!mockMessages[mockKey]) mockMessages[mockKey] = [];
      mockMessages[mockKey].push(newMessage);
      if (mockCallbacks[mockKey]) {
        mockCallbacks[mockKey].forEach(cb => cb(newMessage));
      }
      return { ok: true, data: newMessage };
    }

    // Let the database generate the UUID id via gen_random_uuid()
    const { data, error } = await supabase
      .from('friend_messages')
      .insert({
        friendship_id: friendshipId,
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
      logger.error('[MESSAGE SERVICE] Friend send error:', error);
      return { ok: false, error: { code: 'SEND_FRIEND_MESSAGE_ERROR', message: error.message } };
    }

    const savedMessage = dbToFriendMessage(data);
    logger.info('[MESSAGE SERVICE] Friend message sent:', savedMessage.id);
    return { ok: true, data: savedMessage };
  } catch (error: unknown) {
    logger.error('[MESSAGE SERVICE] Friend send exception:', error);
    return {
      ok: false,
      error: { code: 'SEND_FRIEND_MESSAGE_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' },
    };
  }
};

/**
 * Mark friend messages as read.
 * Uses direct update by user pair instead of friendship_id.
 */
export const markFriendMessagesAsRead = async (
  userId: string,
  friendId: string,
): Promise<ApiResponse<void>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(userId) || !isValidUUID(friendId)) {
      const mockKey = `friend_${userId}_${friendId}`;
      if (mockMessages[mockKey]) {
        mockMessages[mockKey] = mockMessages[mockKey].map(msg => ({
          ...msg,
          readAt: msg.senderId !== userId ? new Date().toISOString() : msg.readAt,
        }));
      }
      return { ok: true };
    }

    // Mark all unread messages FROM the friend TO the current user as read
    const { error } = await supabase
      .from('friend_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('sender_id', friendId)
      .is('read_at', null);

    if (error) {
      return { ok: false, error: { code: 'MARK_READ_ERROR', message: error.message } };
    }

    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: { code: 'MARK_READ_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' } };
  }
};

/**
 * Subscribe to real-time friend messages.
 * Filters by sender_id = friendId so we receive messages FROM the friend.
 * RLS ensures we only see rows where we are the receiver.
 */
export const subscribeToFriendMessages = (
  friendId: string,
  callback: (message: Message) => void,
): { unsubscribe: () => void } => {
  const channelKey = `friend_chat_${friendId}`;

  if (!USE_REAL_BACKEND || !isValidUUID(friendId)) {
    if (!mockCallbacks[channelKey]) mockCallbacks[channelKey] = [];
    mockCallbacks[channelKey].push(callback);
    return {
      unsubscribe: () => {
        mockCallbacks[channelKey] = mockCallbacks[channelKey].filter(cb => cb !== callback);
      },
    };
  }

  logger.info('[MESSAGE SERVICE] Subscribing to friend messages from:', friendId);

  const existingChannel = activeChannels.get(channelKey);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
    activeChannels.delete(channelKey);
  }

  const channel = supabase
    .channel(`friend_chat:${friendId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_messages',
        filter: `sender_id=eq.${friendId}`,
      },
      (payload) => {
        logger.info('[MESSAGE SERVICE] New friend message received:', payload);
        const newMessage = dbToFriendMessage(payload.new as DbFriendMessage);
        callback(newMessage);
      },
    )
    .subscribe((status) => {
      logger.info('[MESSAGE SERVICE] Friend subscription status:', status);
    });

  activeChannels.set(channelKey, channel);

  return {
    unsubscribe: () => {
      logger.info('[MESSAGE SERVICE] Unsubscribing from friend messages:', friendId);
      const ch = activeChannels.get(channelKey);
      if (ch) {
        supabase.removeChannel(ch);
        activeChannels.delete(channelKey);
      }
    },
  };
};

/**
 * Get unread friend message count.
 * Counts messages FROM the friend TO the user that haven't been read.
 */
export const getFriendUnreadCount = async (
  userId: string,
  friendId: string,
): Promise<ApiResponse<number>> => {
  try {
    if (!USE_REAL_BACKEND || !isValidUUID(userId) || !isValidUUID(friendId)) {
      const messages = mockMessages[`friend_${userId}_${friendId}`] || [];
      const count = messages.filter(m => m.senderId !== userId && !m.readAt).length;
      return { ok: true, data: count };
    }

    const { count, error } = await supabase
      .from('friend_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('sender_id', friendId)
      .is('read_at', null);

    if (error) {
      return { ok: false, error: { code: 'COUNT_ERROR', message: error.message } };
    }
    return { ok: true, data: count || 0 };
  } catch (error: unknown) {
    return { ok: false, error: { code: 'COUNT_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' } };
  }
};

/**
 * Batch check which friends have unread messages — single query instead of N.
 * Returns a set of friend IDs that have at least one unread message.
 */
export const getBatchUnreadFriendIds = async (
  userId: string,
  friendIds: string[],
): Promise<Set<string>> => {
  if (!USE_REAL_BACKEND || !isValidUUID(userId) || friendIds.length === 0) {
    return new Set();
  }
  try {
    const { data, error } = await supabase
      .from('friend_messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .in('sender_id', friendIds)
      .is('read_at', null);

    if (error || !data) return new Set();
    return new Set(data.map((r) => r.sender_id));
  } catch {
    return new Set();
  }
};
