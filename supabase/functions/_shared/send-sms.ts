/**
 * Shared SMS sender for web-facing notification functions.
 *
 * Web users don't have Expo push tokens, so SMS is the fallback delivery
 * channel. Runs in parallel with sendPush — if a user has both a phone
 * number and a push token, they receive both.
 *
 * Requires env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER
 *   BRIDGE_WEB_URL  (e.g. https://bridge.app — no trailing slash)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SmsPayload {
  userId: string;
  /** Short message text (shown before the URL). Keep under 130 chars. */
  body: string;
  /** Path to append to BRIDGE_WEB_URL, e.g. '/community'. Include leading slash. */
  path: string;
}

export interface SmsResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send an SMS to a user via Twilio.
 * Silently skips users who have no phone number on their auth record.
 * Logs every attempt (sent or skipped) to notification_log.
 */
export async function sendSms(
  supabase: SupabaseClient,
  payload: SmsPayload,
): Promise<SmsResult> {
  const { userId, body, path } = payload;

  try {
    // 1. Look up user's phone number from auth
    const { data: { user }, error: userErr } = await (supabase.auth as any).admin.getUserById(userId);
    if (userErr || !user) {
      return { sent: false, reason: 'user_not_found' };
    }

    const phone = user.phone;
    if (!phone) {
      return { sent: false, reason: 'no_phone' };
    }

    // 2. Build message
    const baseUrl = Deno.env.get('BRIDGE_WEB_URL') ?? 'https://bridge.app';
    const url = `${baseUrl}${path}`;
    const message = `${body}\n\n${url}`;

    // 3. Send via Twilio REST API
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !from) {
      console.error('[send-sms] Missing Twilio env vars');
      return { sent: false, reason: 'missing_twilio_config' };
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: from, Body: message }),
    });

    const delivered = response.ok;

    if (!delivered) {
      const errBody = await response.text().catch(() => '');
      console.error(`[send-sms] Twilio error for ${userId}: ${response.status} ${errBody}`);
    }

    // 4. Log to notification_log
    await supabase.from('notification_log').insert({
      user_id: userId,
      notification_type: 'sms',
      category: 'sms',
      copy_variant: 0,
      metadata: { path, delivered },
    });

    return { sent: delivered, reason: delivered ? undefined : 'twilio_error' };
  } catch (err) {
    console.error(`[send-sms] Error for user ${userId}:`, err);
    return { sent: false, reason: 'error' };
  }
}
