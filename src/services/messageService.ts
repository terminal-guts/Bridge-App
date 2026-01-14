/**
 * Message Service - MOCK VERSION
 *
 * Provides in-memory chat messaging for development without backend
 */

import { ApiResponse, Message, Conversation } from '../types';
import { contentModerationService } from './contentModerationService';

// In-memory message storage
let mockMessages: { [matchId: string]: Message[] } = {};

// Mock subscription callbacks
let mockCallbacks: { [matchId: string]: ((message: Message) => void)[] } = {};

/**
 * Get messages for a specific match - MOCK VERSION
 */
export const getMatchMessages = async (matchId: string): Promise<ApiResponse<Message[]>> => {
  try {
    console.log('[MOCK MESSAGES] Getting messages for match:', matchId);

    // Return messages for this match or empty array
    let messages = mockMessages[matchId] || [];

    // Add a mock audio message if there are no messages yet (for testing)
    if (messages.length === 0 && !mockMessages[matchId]) {
      messages = [
        {
          id: 'mock-audio-1',
          matchId,
          senderId: 'other-user',
          type: 'audio',
          content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 300000,
          sentAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        }
      ];
      mockMessages[matchId] = [...messages];
    }

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
  messageText: string,
  type: 'text' | 'audio' | 'image' = 'text',
  duration?: number,
  waveformData?: number[]
): Promise<ApiResponse<Message>> => {
  try {
    console.log(`[MOCK MESSAGES] Sending ${type} message:`, matchId, receiverId);

    // 1. Content Moderation Check - ONLY for text messages
    if (type === 'text') {
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
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      matchId,
      senderId: '00000000-0000-0000-0000-000000000001', // Current user
      type,
      content: messageText,
      duration,
      waveformData,
      sentAt: new Date().toISOString(),
    };

    // Add to in-memory storage
    if (!mockMessages[matchId]) {
      mockMessages[matchId] = [];
    }
    mockMessages[matchId].push(newMessage);

    // Trigger mock subscription callbacks
    if (mockCallbacks[matchId]) {
      mockCallbacks[matchId].forEach(callback => callback(newMessage));
    }

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

  if (!mockCallbacks[matchId]) {
    mockCallbacks[matchId] = [];
  }
  mockCallbacks[matchId].push(callback);

  // Return a mock subscription object
  return {
    unsubscribe: () => {
      console.log('[MOCK MESSAGES] Unsubscribing from match:', matchId);
      mockCallbacks[matchId] = mockCallbacks[matchId].filter(cb => cb !== callback);
    },
  };
};
