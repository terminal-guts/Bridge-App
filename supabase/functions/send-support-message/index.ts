import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keyword auto-reply rules
const AUTO_REPLIES: { keywords: RegExp; reply: string }[] = [
  {
    keywords: /\b(bug|crash|broken|error|glitch|not working)\b/i,
    reply: "Thanks for flagging this! We're looking into it and will follow up.",
  },
  {
    keywords: /\b(suggestion|idea|feature|should|could you add|wish)\b/i,
    reply: "Love the idea! We've noted it down. If it makes it in, you'll hear from us.",
  },
  {
    keywords: /\b(slow|lag|loading|freeze|stuck)\b/i,
    reply: "Sorry about that! We're working on performance improvements. Which screen is giving you trouble?",
  },
  {
    keywords: /\b(help|how do i|confused|can't find)\b/i,
    reply: "Happy to help! Can you tell us more about what you're trying to do?",
  },
];

function getAutoReply(content: string): string {
  for (const rule of AUTO_REPLIES) {
    if (rule.keywords.test(content)) {
      return rule.reply;
    }
  }
  return "Got it — we'll get back to you soon!";
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's JWT for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Parse body
    const { content } = await req.json();
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (content.length > 1000) {
      return new Response(JSON.stringify({ error: 'Content exceeds 1000 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 10 messages per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from('support_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Rate limit check failed:', countError);
    } else if ((count ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 10 messages per hour.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert conversation
    const { error: convError } = await supabaseAdmin
      .from('support_conversations')
      .upsert(
        {
          user_id: userId,
          last_message_at: new Date().toISOString(),
          has_unread_user: true,
        },
        { onConflict: 'user_id' }
      );

    if (convError) {
      console.error('Conversation upsert failed:', convError);
    }

    // Insert user message
    const { data: message, error: msgError } = await supabaseAdmin
      .from('support_messages')
      .insert({
        user_id: userId,
        content: content.trim(),
        sender: 'user',
      })
      .select()
      .single();

    if (msgError) {
      return new Response(JSON.stringify({ error: 'Failed to send message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-reply
    const autoReplyText = getAutoReply(content);
    const { error: autoReplyError } = await supabaseAdmin
      .from('support_messages')
      .insert({
        user_id: userId,
        content: autoReplyText,
        sender: 'admin',
        is_auto_reply: true,
      });

    if (autoReplyError) {
      console.error('Auto-reply insert failed:', autoReplyError);
    }

    // Update conversation to mark admin has unread (user sent a message)
    await supabaseAdmin
      .from('support_conversations')
      .update({ has_unread_user: true })
      .eq('user_id', userId);

    // Set this user as the current reply target so founder can just reply naturally (upsert to guarantee row exists)
    await supabaseAdmin
      .from('support_reply_context')
      .upsert({ id: 1, current_user_id: userId, updated_at: new Date().toISOString() });

    // Get user's first name for SMS
    let firstName = 'User';
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', userId)
      .single();

    if (profile?.first_name) {
      firstName = profile.first_name;
    }

    // Twilio SMS forwarding
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER');
    const founderPhone = '+16466236536';

    if (twilioSid && twilioAuth && twilioFrom) {
      const userIdPrefix = userId.substring(0, 4);
      const smsBody = `[Bridge] ${firstName} (#${userIdPrefix}):\n"${content.trim()}"`;

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const credentials = btoa(`${twilioSid}:${twilioAuth}`);

        const formData = new URLSearchParams();
        formData.append('To', founderPhone);
        formData.append('From', twilioFrom);
        formData.append('Body', smsBody);

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (!twilioRes.ok) {
          const errText = await twilioRes.text();
          console.error('Twilio SMS failed:', errText);
        }
      } catch (smsErr) {
        console.error('Twilio SMS error:', smsErr);
      }
    }

    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-support-message error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
