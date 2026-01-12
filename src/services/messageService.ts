/**
 * Message Service - MOCK VERSION
 *
 * Provides in-memory chat messaging for development without backend
 */

import { ApiResponse, Message, Conversation } from '../types';
import { contentModerationService } from './contentModerationService';

// In-memory message storage
let mockMessages: { [matchId: string]: Message[] } = {};

/**
 * Get messages for a specific match - MOCK VERSION
 */
export const getMatchMessages = async (matchId: string): Promise<ApiResponse<Message[]>> => {
  try {
    console.log('[MOCK MESSAGES] Getting messages for match:', matchId);

    // Return messages for this match or empty array
    const messages = mockMessages[matchId] || [];

    return { ok: true, data: messages };
  } catch (error: any) {
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
 * Send a message - MOCK VERSION
 */
export const sendMessage = async (
  matchId: string,
  receiverId: string,
  messageText: string
): Promise<ApiResponse<Message>> => {
  try {
    console.log('[MOCK MESSAGES] Sending message:', matchId, receiverId, messageText);

    // 1. Content Moderation Check
    const moderationResult = await contentModerationService.analyzeText(messageText);

    if (!moderationResult.isSafe) {
      console.warn('[MESSAGE] Blocked by content filter:', moderationResult.reason);
      return {
        ok: false,
        error: {
          code: 'CONTENT_VIOLATION',
          message: moderationResult.reason || 'Message contains inappropriate content.',
        },
      };
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      matchId,
      senderId: '00000000-0000-0000-0000-000000000001', // Current user
      content: messageText,
      sentAt: new Date().toISOString(),
    };

    // Add to in-memory storage
    if (!mockMessages[matchId]) {
      mockMessages[matchId] = [];
    }
    mockMessages[matchId].push(newMessage);

    return {
      ok: true,
      data: newMessage,
    };
  } catch (error: any) {
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
 * Mark messages as read - MOCK VERSION
 */
export const markMessagesAsRead = async (
  matchId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  try {
    console.log('[MOCK MESSAGES] Marking messages as read:', matchId, userId);

    // Update messages in memory
    if (mockMessages[matchId]) {
      mockMessages[matchId] = mockMessages[matchId].map(msg => ({
        ...msg,
        readAt: msg.senderId !== userId ? new Date().toISOString() : msg.readAt,
      }));
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Subscribe to messages - MOCK VERSION
 * Returns a no-op subscription since we don't have real-time in mock mode
 */
export const subscribeToMessages = (
  matchId: string,
  callback: (message: Message) => void
) => {
  console.log('[MOCK MESSAGES] Mock subscription to match:', matchId);

  // Return a mock subscription object
  return {
    unsubscribe: () => {
      console.log('[MOCK MESSAGES] Unsubscribing from match:', matchId);
    },
  };
};
