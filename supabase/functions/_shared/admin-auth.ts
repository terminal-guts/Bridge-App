import { corsHeaders } from './cors.ts';
import * as jose from 'https://deno.land/x/jose@v4.15.4/index.ts';

/**
 * Verifies that the caller has service_role access.
 * Accepts a full service_role JWT (used by cron jobs).
 * Verifies the JWT signature using the Supabase JWT secret and checks that
 * the `role` claim equals `service_role`.
 *
 * Returns null if authorized, or a 403 Response to return immediately if not.
 */
export async function requireServiceRole(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  if (!jwtSecret) {
    console.error('requireServiceRole: SUPABASE_JWT_SECRET not set');
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.role !== 'service_role') {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }
    return null;
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }
}
