import { corsHeaders } from './cors.ts';

/**
 * Verifies that the caller has service_role access.
 * Accepts either:
 *   1. The short env-var key (SUPABASE_SERVICE_ROLE_KEY — set by Supabase runtime)
 *   2. A full service_role JWT (used by cron jobs and local .env)
 *
 * Returns null if authorized, or a 403 Response to return immediately if not.
 */
export function requireServiceRole(req: Request): Response | null {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  // Check 1: exact match against the runtime env var (short key format)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && token === serviceRoleKey) return null;

  // Check 2: decode JWT and verify it has service_role claim
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') return null;
    }
  } catch {
    // Invalid JWT — fall through to forbidden
  }

  return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
}
