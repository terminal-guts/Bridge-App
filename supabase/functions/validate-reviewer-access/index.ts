import { corsHeaders } from '../_shared/cors.ts';

const REVIEWER_PASSWORD = Deno.env.get('REVIEWER_PASSWORD');
// Strip backslash escapes — Supabase secrets dashboard may escape special chars like !
const REVIEWER_AUTH_PASSWORD = Deno.env.get('REVIEWER_AUTH_PASSWORD')?.replace(/\\/g, '');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!REVIEWER_PASSWORD) {
      console.error('REVIEWER_PASSWORD secret not configured');
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const valid = password === REVIEWER_PASSWORD;

    // On success, return the Supabase Auth password so the client can sign in
    // without ever having the auth password embedded in its bundle.
    return new Response(
      JSON.stringify({
        valid,
        ...(valid && REVIEWER_AUTH_PASSWORD ? { authPassword: REVIEWER_AUTH_PASSWORD } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
