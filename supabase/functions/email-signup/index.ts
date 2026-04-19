import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";

// ── Constants ────────────────────────────────────────────────────────
const ALLOWED_DOMAIN = "rice.edu";
// Per-email send burst window — 5 sends per 10 minutes (was 5/hour, which
// locked legitimate users out for ~56 minutes if they hit cooldown 5 times
// before their email arrived). 10-minute window still bounds brute-force.
const MAX_CODES_PER_EMAIL = 5;
const EMAIL_RATE_WINDOW_MINUTES = 10;
// Raised from 20 → 60 because Rice campus shares NAT — during orientation
// / signup bursts, a dozen students on the same Wi-Fi can burn a 20/hr
// ceiling in minutes. 60/hr still caps IP-level abuse.
const MAX_SENDS_PER_IP_PER_HOUR = 60;
const MAX_ATTEMPTS_PER_CODE = 5;
const CODE_EXPIRY_MINUTES = 10;

// ── Helpers ──────────────────────────────────────────────────────────

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

/** Generate a 6-digit OTP with rejection sampling (no modulo bias). */
function generateOTP(): string {
  let num: number;
  do {
    num = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (num >= 4294000000); // Reject to avoid modulo bias
  return String(num % 1000000).padStart(6, "0");
}

/** SHA-256 hash of code+email. Returns hex string. */
async function hashCode(code: string, email: string): Promise<string> {
  const data = new TextEncoder().encode(code + ":" + email.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Short random ID included in every email so Gmail can't identify
 *  repeated content across threaded OTP emails. Without this, Gmail
 *  collapses the expiry line on every email after the first in a
 *  thread and replaces it with a "•••" show-trimmed-content icon —
 *  users perceive the email as broken/old-format even though the HTML
 *  is identical.
 *
 *  Format: 8 hex chars with a dash in the middle (e.g. `22fecf-a8`).
 *  Intentionally different shape from the 6-digit numeric code so users
 *  who glance at an email notification on their phone don't confuse
 *  this ID for the verification code. 4 bytes of randomness is plenty
 *  for uniqueness (this isn't security-bearing). */
function generateEmailRef(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 6)}-${hex.slice(6)}`;
}

/** Constant-time comparison for hex strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/** Build branded HTML email with just the 6-digit code.
 *
 *  Design notes for deliverability / rendering:
 *  - Arial/Helvetica for universal rendering (Gmail web strips `-apple-system`
 *    and falls back to serif).
 *  - Code uses CSS `letter-spacing` for visual spacing — CSS-only and does
 *    NOT go into the clipboard when the user copies the code, so paste
 *    yields a clean "123456" (earlier attempts using &nbsp; between digits
 *    broke paste on the verify screen).
 *  - No hidden preheader: Gmail rendered the hidden div as a "show trimmed
 *    content" (•••) icon inside the code box, which cluttered the email.
 *    For a message this short, Gmail's natural preview (grabbing "Bridge"
 *    or "Your verification code:") is fine.
 *  - No visible footer + no List-Unsubscribe headers: this is a purely
 *    transactional OTP email; users requested the code explicitly, so there
 *    is nothing to unsubscribe from. Advertising unsub on transactional
 *    mail invites accidental clicks that hurt reputation. */
function buildVerificationEmail(code: string, ref: string): string {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 420px; margin: 0 auto; padding: 40px 24px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #1E293B; font-size: 24px; font-weight: 700; margin: 0; font-family: Arial, Helvetica, sans-serif;">Bridge</h1>
  </div>
  <p style="color: #64748B; font-size: 16px; margin-bottom: 24px; text-align: center; font-family: Arial, Helvetica, sans-serif;">
    Your verification code:
  </p>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563EB; font-family: Arial, Helvetica, sans-serif; line-height: 1.2;">${code}</div>
  </div>
  <p style="color: #94A3B8; font-size: 13px; text-align: center; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
    This code expires in ${CODE_EXPIRY_MINUTES} minutes.<br/>
    If you didn't request this, you can safely ignore this email.
  </p>
  <p style="color: #CBD5E1; font-size: 10px; text-align: center; margin-top: 24px; font-family: Arial, Helvetica, sans-serif;">
    Email ID: ${ref} (not your code)
  </p>
</div>`.trim();
}

/** Plain-text alternative for multipart/alternative MIME. Required for
 *  deliverability — HTML-only emails score higher on Gmail/Outlook spam
 *  filters, and some clients (watchOS, screen readers) prefer text. */
function buildVerificationTextEmail(code: string, ref: string): string {
  return `Bridge

Your verification code: ${code}

This code expires in ${CODE_EXPIRY_MINUTES} minutes.
If you didn't request this, you can safely ignore this email.

Email ID: ${ref} (not your code)`;
}

/** Get client IP from request headers. */
function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Send Handler ─────────────────────────────────────────────────────

async function handleSend(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  clientIP: string,
  flow: "signup" | "login" = "signup",
): Promise<Response> {
  // 1. Run the three independent pre-send checks in parallel — per-email
  //    rate limit, per-IP rate limit, and user status lookup. Sequentially
  //    these cost ~3 round-trips (~150ms); parallel is one round-trip
  //    latency. Early-return logic happens AFTER all three resolve — the
  //    wasted work on a rate-limited path is tiny (~one extra SELECT) and
  //    only happens on error paths, never on the happy path.
  const windowMs = EMAIL_RATE_WINDOW_MINUTES * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  const ipWindowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [emailRateResult, ipRateResult, userLookupResult] = await Promise.all([
    admin
      .from("email_verification_codes")
      .select("created_at")
      .eq("email", email)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true }),
    clientIP && clientIP !== "unknown"
      ? admin
          .from("email_verification_codes")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", clientIP)
          .gte("created_at", ipWindowStart)
      : Promise.resolve({ count: 0, error: null }),
    admin.rpc("get_user_by_email", { p_email: email }),
  ]);

  const { data: recentCodes, error: emailCountErr } = emailRateResult;
  const { count: ipCount } = ipRateResult as { count: number | null };
  const { data: existingUser } = userLookupResult;

  // 1a. Per-email rate limit check
  if (emailCountErr) {
    console.error("Rate limit check error:", emailCountErr.message);
    return jsonResponse({ error: "Service temporarily unavailable. Please try again." }, 500);
  }
  if ((recentCodes?.length ?? 0) >= MAX_CODES_PER_EMAIL) {
    // Tell the user exactly when they can try again — don't leave them guessing.
    const oldest = recentCodes![0].created_at as string;
    const retryAtMs = new Date(oldest).getTime() + windowMs;
    const minutes = Math.max(1, Math.ceil((retryAtMs - Date.now()) / 60000));
    return jsonResponse({
      error: `Too many code requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(60, Math.ceil((retryAtMs - Date.now()) / 1000)),
    });
  }

  // 1b. Per-IP rate limit check (ipCount is null when clientIP was unknown — treated as 0)
  if ((ipCount ?? 0) >= MAX_SENDS_PER_IP_PER_HOUR) {
    return jsonResponse({ error: "Too many requests. Please try again later." });
  }

  // 2. User status check — the app blocks the user explicitly on the wrong flow.
  //    Previously this used anti-enumeration (silent success on account mismatch),
  //    but that left real users confused — they got no code and thought signup was
  //    broken. Product decision 2026-04-17: prioritize clarity over enumeration hiding.
  //    Per-IP and per-email rate limits above still bound brute-force enumeration.

  const userExists = existingUser && existingUser.length > 0;
  const hasProfileRow = userExists && existingUser[0].has_profile === true;

  if (flow === "login") {
    // Login: user MUST exist. Otherwise tell them to sign up.
    if (!userExists) {
      return jsonResponse({
        error: "No account found with this email. Tap Sign Up instead.",
        code: "NO_ACCOUNT",
      });
    }
    // User exists — proceed to send code.
  } else {
    // Signup: block if a user_profiles row exists for this email (Rule B).
    // A profile row is created the moment the user first verifies an OTP
    // (via ensureProfileRow in OnboardingScreen). Treating that as the
    // commitment point means partially-onboarded users must sign in — which
    // auto-resumes onboarding — or delete their account to start fresh.
    // This avoids the hazard where `profile_completed` flipping back to
    // false (e.g. a photo was deleted) would let someone silently overwrite
    // their real profile data by re-running the signup flow.
    if (hasProfileRow) {
      return jsonResponse({
        error: "You already have an account. Tap Sign In instead.",
        code: "ACCOUNT_EXISTS",
      });
    }
  }

  // 3. Invalidate any existing unused codes for this email
  await admin
    .from("email_verification_codes")
    .update({ used: true })
    .eq("email", email)
    .eq("used", false);

  // 4. Generate and hash the code + a per-email ref (defeats Gmail thread
  //    trimming — see generateEmailRef comment).
  const code = generateOTP();
  const codeHash = await hashCode(code, email);
  const emailRef = generateEmailRef();

  // 5. Send via Resend FIRST — only insert DB record if send succeeds
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not set");
    return jsonResponse({ error: "Email service not configured." }, 500);
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Bridge <verify@bridgedate.app>",
      to: [email],
      subject: "Your Bridge verification code",
      html: buildVerificationEmail(code, emailRef),
      text: buildVerificationTextEmail(code, emailRef),
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend email failed:", errText);
    return jsonResponse({ error: "Failed to send verification email. Please try again." }, 500);
  }

  // 6. Insert code into DB (email sent successfully). We no longer persist
  //    the send-time `flow` value — send-side business logic (NO_ACCOUNT for
  //    login, ACCOUNT_EXISTS for signup) runs in memory before this point,
  //    and the verify path doesn't need to cross-check the flow.
  const { error: insertErr } = await admin.from("email_verification_codes").insert({
    email,
    code_hash: codeHash,
    ip_address: clientIP,
    expires_at: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
  });

  if (insertErr) {
    console.error("Failed to insert verification code:", insertErr.message);
    return jsonResponse({ error: "Failed to save verification code. Please try again." }, 500);
  }

  return jsonResponse({ ok: true });
}

// ── Verify Handler ───────────────────────────────────────────────────

async function handleVerify(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  code: string,
): Promise<Response> {
  // 1. Look up latest valid code (row lock to prevent race condition).
  //    PostgREST doesn't support FOR UPDATE, so we use a two-step approach:
  //    select the code, then immediately increment attempts as our "lock".
  const { data: codes, error: lookupErr } = await admin
    .from("email_verification_codes")
    .select("id, code_hash, attempts")
    .eq("email", email)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (lookupErr) {
    console.error("Code lookup error:", lookupErr.message);
    return jsonResponse({ error: "Service temporarily unavailable. Please try again." }, 500);
  }

  if (!codes || codes.length === 0) {
    return jsonResponse({ error: "Code expired. Please request a new one." });
  }

  const codeRow = codes[0];

  // 2. Check attempt limit BEFORE incrementing so MAX_ATTEMPTS_PER_CODE truly
  //    means N allowed attempts. codeRow.attempts is the pre-increment count;
  //    if it's already at the ceiling, this request is the (N+1)th so reject.
  if (codeRow.attempts >= MAX_ATTEMPTS_PER_CODE) {
    await admin
      .from("email_verification_codes")
      .update({ used: true })
      .eq("id", codeRow.id);
    return jsonResponse(
      { error: "Too many attempts. Please request a new code." },
    );
  }

  // 3. Increment attempts atomically (now that we know this attempt is within the limit)
  const { error: attemptErr } = await admin
    .from("email_verification_codes")
    .update({ attempts: codeRow.attempts + 1 })
    .eq("id", codeRow.id);

  if (attemptErr) {
    console.error("Attempt increment error:", attemptErr.message);
  }

  // 4. Constant-time hash comparison
  const submittedHash = await hashCode(code, email);
  if (!timingSafeEqual(submittedHash, codeRow.code_hash)) {
    return jsonResponse({ error: "Incorrect code. Please try again." });
  }

  // 5. Code matches — create or find user
  const { data: existingUsers } = await admin.rpc("get_user_by_email", {
    p_email: email,
  });

  const userExists = existingUsers && existingUsers.length > 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const tempPassword = crypto.randomUUID();
  let userId: string;
  let userEmail: string;

  if (userExists) {
    // Existing user (abandoned signup or re-signup) — update password
    userId = existingUsers[0].id;
    userEmail = existingUsers[0].email;
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });
    if (updateErr) {
      console.error("Failed to update user password:", updateErr.message);
      return jsonResponse({ error: "Failed to verify. Please try again." }, 500);
    }
  } else {
    // New user — create account
    const { data: newUser, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
    if (createErr) {
      console.error("Failed to create user:", createErr.message);
      // Might be a race condition — try the existing user path
      const { data: retryUsers } = await admin.rpc("get_user_by_email", {
        p_email: email,
      });
      if (retryUsers && retryUsers.length > 0) {
        userId = retryUsers[0].id;
        userEmail = retryUsers[0].email;
        const { error: retryUpdateErr } = await admin.auth.admin.updateUserById(
          userId,
          { password: tempPassword },
        );
        if (retryUpdateErr) {
          return jsonResponse({ error: "Failed to verify. Please try again." }, 500);
        }
      } else {
        return jsonResponse({ error: "Failed to create account. Please try again." }, 500);
      }
    } else {
      userId = newUser.user.id;
      userEmail = newUser.user.email!;
    }
  }

  // 6. Sign in to get session tokens
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInErr } =
    await anonClient.auth.signInWithPassword({
      email,
      password: tempPassword,
    });

  if (signInErr || !signInData.session) {
    console.error("Sign-in failed:", signInErr?.message);
    // DON'T mark code as used — let user retry
    return jsonResponse({ error: "Failed to establish session. Please try again." }, 500);
  }

  // 7. ONLY NOW mark code as used (session creation succeeded)
  await admin
    .from("email_verification_codes")
    .update({ used: true })
    .eq("id", codeRow.id);

  // 8. Clean up old codes (fire-and-forget)
  admin
    .from("email_verification_codes")
    .delete()
    .eq("email", email)
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(() => {})
    .catch(() => {});

  // 9. Return session + user
  return jsonResponse({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    user: { id: userId!, email: userEmail! },
  });
}

// ── Entry Point ──────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, action, code, flow } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return jsonResponse({ error: "Email is required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes("@") || normalizedEmail.length > 320) {
      return jsonResponse({ error: "Invalid email address." });
    }

    // Server-side domain validation
    if (!isAllowedDomain(normalizedEmail)) {
      return jsonResponse(
        { error: "Only @rice.edu email addresses are allowed." },
      );
    }

    const admin = createAdminClient();
    const clientIP = getClientIP(req);

    if (action === "send") {
      const sendFlow = flow === "login" ? "login" : "signup";
      return await handleSend(admin, normalizedEmail, clientIP, sendFlow);
    }

    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return jsonResponse({ error: "Verification code is required." });
      }
      const trimmedCode = code.trim();
      if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
        return jsonResponse({ error: "Code must be 6 digits." });
      }
      return await handleVerify(admin, normalizedEmail, trimmedCode);
    }

    return jsonResponse({ error: "Invalid action. Use 'send' or 'verify'." });
  } catch (err) {
    console.error("email-signup error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
