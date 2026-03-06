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
 */

import { ApiResponse, Message } from '../types';
import { supabase, isRealSupabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MessageService');
import { FEATURES } from '../config/features';
import { contentModerationService } from './contentModerationService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base64-arraybuffer';

// ============================================================================
// Configuration
// ============================================================================

const USE_REAL_BACKEND = FEATURES.MESSAGING_BACKEND_ENABLED && isRealSupabase();
const STORAGE_BUCKET = 'chat-audio';

// UUID v4 regex — mock IDs like "active-match-1" are not valid UUIDs and
// must never reach Supabase (Postgres rejects them with code 22P02).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string) => UUID_REGEX.test(id);

// Log mode on initialization
logger.info(`[MESSAGE SERVICE] Mode: ${USE_REAL_BACKEND ? 'REAL SUPABASE' : 'MOCK'}`);

// ============================================================================
// Mock Data Storage (for development)
// ============================================================================

let mockMessages: { [matchId: string]: Message[] } = {};
let mockCallbacks: { [matchId: string]: ((message: Message) => void)[] } = {};

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

/**
 * Generate a unique message ID
 */
const generateMessageId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

async function getCurrentUserId(): Promise<string> {
  if (!USE_REAL_BACKEND) {
    return '00000000-0000-0000-0000-000000000001';
  }
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ============================================================================
// Audio Upload Functions
// ============================================================================

/**
 * Upload audio file to Supabase Storage
 * Returns the public URL of the uploaded file
 */
const uploadAudioFile = async (
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Audio upload exception:', error);
    return { url: '', error: error.message || 'Failed to upload audio' };
  }
};

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
      .select('*')
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Exception:', error);
    return {
      ok: false,
      error: {
        code: 'MESSAGES_FETCH_ERROR',
        message: error.message || 'An unexpected error occurred',
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
    if (type === 'text' && !content.startsWith('📅 Date Proposal:')) {
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Send exception:', error);
    return {
      ok: false,
      error: {
        code: 'SEND_MESSAGE_ERROR',
        message: error.message || 'An unexpected error occurred',
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Mark read exception:', error);
    return {
      ok: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

// ============================================================================
// Real-time Subscriptions
// ============================================================================

// Track active subscriptions
const activeChannels: Map<string, RealtimeChannel> = new Map();

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
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'COUNT_ERROR',
        message: error.message,
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
export const cleanupSubscriptions = (): void => {
  logger.info('[MESSAGE SERVICE] Cleaning up all subscriptions');
  activeChannels.forEach((channel, matchId) => {
    supabase.removeChannel(channel);
  });
  activeChannels.clear();
  mockMessages = {};
  mockCallbacks = {};
};

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Clear mock messages (for testing)
 */
export const clearMockMessages = (): void => {
  logger.info('[MESSAGE SERVICE] Clearing mock messages');
  mockMessages = {};
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

// ============================================================================
// Friend Message Operations
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Friend fetch exception:', error);
    return {
      ok: false,
      error: { code: 'FRIEND_MESSAGES_FETCH_ERROR', message: error.message || 'An unexpected error occurred' },
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
    if (type === 'text' && !content.startsWith('📅 Date Proposal:')) {
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
  } catch (error: any) {
    logger.error('[MESSAGE SERVICE] Friend send exception:', error);
    return {
      ok: false,
      error: { code: 'SEND_FRIEND_MESSAGE_ERROR', message: error.message || 'An unexpected error occurred' },
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
  } catch (error: any) {
    return { ok: false, error: { code: 'MARK_READ_ERROR', message: error.message } };
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
  } catch (error: any) {
    return { ok: false, error: { code: 'COUNT_ERROR', message: error.message } };
  }
};
