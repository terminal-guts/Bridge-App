import { corsHeaders } from './cors.ts';

/**
 * Verifies that the caller provided the service_role key in the Authorization header.
 * Use this at the top of cron/admin-only edge functions to prevent unauthorized access.
 *
 * Returns null if authorized, or a 403 Response to return immediately if not.
 */
export function requireServiceRole(req: Request): Response | null {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceRoleKey || token !== serviceRoleKey) {
    return Response.json(
      { error: 'Forbidden' },
      { status: 403, headers: corsHeaders },
    );
  }

  return null;
}
