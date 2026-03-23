import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_DOMAIN = "rice.edu";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAllowedDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN || (domain?.endsWith(`.${ALLOWED_DOMAIN}`) ?? false);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT (must be logged in via phone)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { email, action = "send", code } = body;

    if (!email || typeof email !== "string") {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isAllowedDomain(normalizedEmail)) {
      return jsonResponse({ error: "Only @rice.edu emails are allowed" }, 400);
    }

    // ─── SEND ────────────────────────────────────────────────
    if (action === "send") {
      // Use a fresh anon client to trigger Supabase's built-in OTP email.
      // This sends the email via Supabase's email system (uses the Magic Link template).
      // It does NOT affect the user's current phone session.
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: otpError } = await anonClient.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        console.error("Failed to send OTP:", otpError.message);
        return jsonResponse({ error: "Failed to send verification email. Please try again." }, 500);
      }

      return jsonResponse({ ok: true, message: "Verification code sent" });
    }

    // ─── VERIFY ──────────────────────────────────────────────
    if (action === "verify") {
      if (!code) {
        return jsonResponse({ error: "Missing verification code" }, 400);
      }

      // Verify the OTP server-side using a fresh anon client.
      // The session created here stays on the server — it does NOT replace
      // the user's phone session on the client.
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
        email: normalizedEmail,
        token: code,
        type: "email",
      });

      if (verifyError) {
        console.error("OTP verification failed:", verifyError.message);
        return jsonResponse({ error: verifyError.message || "Incorrect code. Please try again." }, 400);
      }

      if (!verifyData?.session) {
        return jsonResponse({ error: "Verification failed. Please request a new code." }, 400);
      }

      // Code is valid — mark the email as verified on the phone user's profile
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await adminClient
        .from("user_profiles")
        .update({
          rice_email: normalizedEmail,
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to update profile:", updateError.message);
        // Don't fail — the code was valid, email is verified
      }

      return jsonResponse({ ok: true, verified: true });
    }

    return jsonResponse({ error: "Invalid action. Use 'send' or 'verify'." }, 400);
  } catch (err) {
    console.error("send-email-verification error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
