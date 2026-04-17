import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Email Unsubscribe Handler
 *
 * Handles two flows:
 * - POST: One-click unsubscribe (RFC 8058) — email clients send this automatically
 * - GET:  User clicks the unsubscribe link in the email footer
 *
 * Note: Bridge verification codes are transactional (user-requested), so
 * unsubscribing won't block codes the user explicitly requests. But having
 * proper unsubscribe infrastructure improves sender reputation with Gmail,
 * Outlook, and university mail systems.
 */

const PAGE_HTML = (email: string, success: boolean) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bridge — Email Preferences</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #FDFAF7; color: #1E293B; }
    .card { max-width: 420px; padding: 48px 32px; text-align: center; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    p { color: #64748B; font-size: 16px; line-height: 1.6; }
    .email { font-weight: 600; color: #1E293B; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Bridge</h1>
    ${success
      ? `<p>You've unsubscribed <span class="email">${email}</span> from Bridge emails.</p>
         <p style="margin-top: 16px; font-size: 14px; color: #94A3B8;">If you request a verification code in the future, we'll still send it since you explicitly asked for it.</p>`
      : `<p>Something went wrong. Please try again or contact support.</p>`
    }
  </div>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createAdminClient();

  try {
    let email: string | null = null;

    if (req.method === "POST") {
      // RFC 8058 one-click unsubscribe — email client sends POST
      // Body may be form-encoded or JSON
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        email = formData.get("email") as string;
        // One-click may also just send List-Unsubscribe=One-Click without email
        // In that case, try to get email from query params
        if (!email) {
          const url = new URL(req.url);
          email = url.searchParams.get("email");
        }
      } else {
        try {
          const body = await req.json();
          email = body.email;
        } catch {
          const url = new URL(req.url);
          email = url.searchParams.get("email");
        }
      }
    } else if (req.method === "GET") {
      // User clicked unsubscribe link in email
      const url = new URL(req.url);
      email = url.searchParams.get("email");
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(PAGE_HTML("", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Record the unsubscribe (upsert — idempotent)
    const { error } = await admin
      .from("email_unsubscribes")
      .upsert(
        { email: normalizedEmail },
        { onConflict: "email", ignoreDuplicates: true },
      );

    if (error) {
      console.error("Unsubscribe error:", error.message);
    }

    // For POST (one-click), return 200 with no body
    if (req.method === "POST") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // For GET (browser click), return a nice HTML page
    return new Response(PAGE_HTML(normalizedEmail, !error), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("email-unsubscribe error:", err);
    return new Response(PAGE_HTML("", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
