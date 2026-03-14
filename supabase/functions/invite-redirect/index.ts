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
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Join Bridge</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
      color: #ffffff;
      text-align: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    .card {
      background: rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 40px 28px 36px;
      max-width: 380px;
      width: 100%;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 80px rgba(43, 101, 249, 0.08);
    }

    .wordmark {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -1.5px;
      background: linear-gradient(135deg, #5B8DFF 0%, #437FFF 50%, #2B65F9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 6px;
    }

    .tagline {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 0.3px;
      margin-bottom: 32px;
    }

    .divider {
      width: 40px;
      height: 2px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 1px;
      margin: 0 auto 28px;
    }

    .invite-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 10px;
    }

    .code {
      font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, monospace;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(43, 101, 249, 0.15);
      padding: 14px 24px;
      border-radius: 14px;
      border: 1px solid rgba(43, 101, 249, 0.3);
      margin-bottom: 28px;
      letter-spacing: 1px;
    }

    .btn {
      display: block;
      background: linear-gradient(135deg, #437FFF 0%, #2B65F9 100%);
      color: white;
      font-size: 17px;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 14px;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 20px rgba(43, 101, 249, 0.4);
      letter-spacing: 0.2px;
    }

    .btn:active {
      transform: scale(0.97);
      box-shadow: 0 2px 12px rgba(43, 101, 249, 0.3);
    }

    .hint {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 16px;
      line-height: 1.5;
    }

    .social-proof {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.35);
      margin-top: 28px;
      letter-spacing: 0.2px;
    }

    .dot {
      display: inline-block;
      width: 5px;
      height: 5px;
      background: #34d399;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
      box-shadow: 0 0 6px rgba(52, 211, 153, 0.5);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="wordmark">Bridge</div>
    <div class="tagline">Your friends help you find your person</div>
    <div class="divider"></div>
    <div class="invite-label">Your Invite Code</div>
    <div class="code">${code}</div>
    <a class="btn" href="${APP_STORE_URL}">Download Bridge</a>
    <p class="hint">Download Bridge, enter your code, and join your friend's crew.</p>
  </div>
  <p class="social-proof"><span class="dot"></span>Live at Rice University</p>

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
