import { corsHeaders } from './cors.ts';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares every byte even after finding a mismatch.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Verifies that the caller has service_role access.
 * Checks the Bearer token against both:
 *   1. SUPABASE_SERVICE_ROLE_KEY (v2 sb_secret_ format, auto-injected)
 *   2. BRIDGE_SERVICE_ROLE_JWT (legacy JWT format, used by cron jobs via vault)
 *
 * Returns null if authorized, or a 403 Response to return immediately if not.
 */
export async function requireServiceRole(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  // Check against v2 key (auto-injected by Supabase)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && constantTimeEqual(token, serviceRoleKey)) {
    return null; // Authorized
  }

  // Check against legacy JWT key (used by pg_cron jobs via vault)
  const legacyJwt = Deno.env.get('BRIDGE_SERVICE_ROLE_JWT');
  if (legacyJwt && constantTimeEqual(token, legacyJwt)) {
    return null; // Authorized
  }

  return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
}
