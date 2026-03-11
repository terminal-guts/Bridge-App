import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FOUNDER_PHONE = '+16466236536';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const twiml = (body = '') =>
    new Response(`<Response>${body}</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string | null;
    const from = formData.get('From') as string | null;

    // Only accept replies from the founder
    if (from !== FOUNDER_PHONE) {
      console.warn('Rejected reply from unauthorized number:', from);
      return twiml();
    }

    if (!body || body.trim().length === 0) {
      return twiml();
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const trimmed = body.trim();
    let userId: string | null = null;
    let replyContent: string;

    // Check if message starts with #xxxx to explicitly target a user
    const prefixMatch = trimmed.match(/^#([a-f0-9]{4})\s*(.*)?$/is);

    if (prefixMatch) {
      const userIdPrefix = prefixMatch[1].toLowerCase();
      replyContent = (prefixMatch[2] || '').trim();

      // Look up user by ID prefix (cast UUID to text for LIKE)
      const { data: conversations } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `SELECT json_agg(t) FROM (SELECT user_id FROM support_conversations WHERE user_id::text LIKE '${userIdPrefix}%' ORDER BY last_message_at DESC LIMIT 1) t`,
        });

      const users = conversations as any;
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.error('No user found for prefix:', userIdPrefix);
        return twiml(`<Message>No user found for #${userIdPrefix}</Message>`);
      }

      userId = users[0].user_id;

      // Update reply context to this user
      await supabaseAdmin
        .from('support_reply_context')
        .update({ current_user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', 1);

      // If they just typed #xxxx with no message, confirm the switch
      if (!replyContent) {
        // Get user's name for confirmation
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('first_name')
          .eq('id', userId)
          .single();

        const name = profile?.first_name || 'User';
        const prefix = userId.substring(0, 4);
        return twiml(`<Message>Switched to ${name} (#${prefix}). Just reply to send messages.</Message>`);
      }
    } else {
      // Plain reply — route to current reply context (last user who messaged)
      replyContent = trimmed;

      const { data: context } = await supabaseAdmin
        .from('support_reply_context')
        .select('current_user_id')
        .eq('id', 1)
        .single();

      if (!context?.current_user_id) {
        console.error('No reply context set');
        return twiml(`<Message>No active conversation. Reply to a user's message or type #xxxx to pick one.</Message>`);
      }

      userId = context.current_user_id;
    }

    // Insert admin message
    const { error: msgError } = await supabaseAdmin
      .from('support_messages')
      .insert({
        user_id: userId,
        content: replyContent,
        sender: 'admin',
        is_auto_reply: false,
      });

    if (msgError) {
      console.error('Failed to insert admin reply:', msgError);
      return twiml(`<Message>Error sending message. Try again.</Message>`);
    }

    // Update conversation
    await supabaseAdmin
      .from('support_conversations')
      .update({
        has_unread_admin: true,
        last_message_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Send push notification
    try {
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('push_token')
        .eq('user_id', userId)
        .single();

      if (settings?.push_token) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: settings.push_token,
            title: 'Bridge Team',
            body: 'New message from Bridge support',
            data: { screen: 'SupportChat' },
          }),
        });
      }
    } catch (pushErr) {
      console.error('Push notification failed:', pushErr);
    }

    return twiml();
  } catch (err) {
    console.error('receive-support-reply error:', err);
    return twiml();
  }
});
