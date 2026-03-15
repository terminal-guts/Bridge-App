/**
 * Support Chat Service
 *
 * Handles messaging between users and the Bridge support team.
 * Messages are stored in Supabase and forwarded to the founder via Twilio SMS.
 */

import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('SupportChatService');

export interface SupportMessage {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'admin';
  is_auto_reply: boolean;
  created_at: string;
}

/**
 * Fetch all support messages for the current user
 */
export async function getSupportMessages(): Promise<SupportMessage[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('support_messages')
    .select('id, user_id, content, sender, is_auto_reply, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch support messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Send a support message via the edge function
 */
export async function sendSupportMessage(content: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-support-message', {
    body: { content },
  });

  if (error) {
    logger.error('Failed to send support message:', error);
    return { ok: false, error: error.message || 'Failed to send message' };
  }

  return { ok: true };
}

/**
 * Subscribe to real-time support messages.
 * Calls the callback when a new admin message arrives.
 *
 * Since getAuthenticatedUserId is async, this sets up the subscription
 * asynchronously. The returned unsubscribe function handles cleanup.
 */
export function subscribeToSupportMessages(
  callback: (message: SupportMessage) => void
): { unsubscribe: () => void } {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let disposed = false;

  // Set up subscription asynchronously
  (async () => {
    const userId = await getAuthenticatedUserId();
    if (!userId || disposed) return;

    channel = supabase
      .channel(`support-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (disposed) return;
          const newMessage = payload.new as SupportMessage;
          if (newMessage.sender === 'admin') {
            callback(newMessage);
          }
        }
      )
      .subscribe();

    // If unsubscribe was called while we were awaiting auth, clean up immediately
    if (disposed) {
      supabase.removeChannel(channel);
      channel = null;
    }
  })();

  return {
    unsubscribe: () => {
      disposed = true;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    },
  };
}

/**
 * Mark admin messages as read
 */
export async function markAdminMessagesRead(): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  await supabase
    .from('support_conversations')
    .update({ has_unread_admin: false })
    .eq('user_id', userId);
}
