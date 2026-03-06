import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Invite redirect edge function.
 *
 * URL: /invite-redirect?code=BRIDGE-XXXX-XXXX
 *
 * Returns an HTML page that:
 * 1. Tries to open the app via deep link (bridge://invite/CODE)
 * 2. Falls back to App Store after a short delay
 *
 * This is a simple "smart banner" approach that works without Universal Links setup.
 */

const APP_STORE_URL = 'https://apps.apple.com/app/bridge/id6759764704';
const APP_SCHEME = 'bridge';

serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';

  // Validate code format
  if (!/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return new Response('Invalid invite code', { status: 400 });
  }

  const deepLink = `${APP_SCHEME}://invite/${code}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Join Bridge</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #EEF3FF 0%, #FFFFFF 100%);
      color: #0B1226;
      text-align: center;
      padding: 24px;
    }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { font-size: 16px; color: #667085; margin: 0 0 24px; line-height: 1.5; }
    .code {
      font-family: monospace;
      font-size: 18px;
      font-weight: 700;
      color: #2B65F9;
      background: #F4F7FF;
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid #D1DEFF;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #2B65F9;
      color: white;
      font-size: 16px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
    }
    .sub { font-size: 13px; color: #9CA3AF; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="logo">🌉</div>
  <h1>You're invited to Bridge</h1>
  <p>A dating app where your friends pick who you date.</p>
  <div class="code">${code}</div>
  <a class="btn" href="${APP_STORE_URL}">Download Bridge</a>
  <p class="sub">After downloading, enter the code above to connect with your friend.</p>

  <script>
    // Try deep link first (works if app is installed)
    setTimeout(function() {
      window.location.href = '${deepLink}';
    }, 100);
    // If deep link fails (app not installed), user sees the download page
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
