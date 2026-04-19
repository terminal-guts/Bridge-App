import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const STORAGE_BUCKET = 'profile-photos';

// SafeSearch likelihood levels ordered by severity
const LIKELIHOOD_ORDER = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];

function likelihoodAtLeast(value: string, threshold: string): boolean {
  return LIKELIHOOD_ORDER.indexOf(value) >= LIKELIHOOD_ORDER.indexOf(threshold);
}

// Uint8Array → base64. Plain per-byte loop — predictable on the Deno edge runtime.
// String.fromCharCode.apply can hang for ~550KB inputs here; manual chunked
// variants with Array.from also stall, so we stick with the byte-by-byte loop.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  console.log('[moderate-image] ENTER', req.method, 'hasAuth=', !!req.headers.get('Authorization'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[moderate-image] returning 401 — no auth header');
      return Response.json({ error: 'Missing authorization header' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // ── Parse request ────────────────────────────────────────────────────
    const { storagePath, isMain } = await req.json();
    if (!storagePath || typeof storagePath !== 'string') {
      return Response.json({ error: 'storagePath is required' }, { status: 400, headers: corsHeaders });
    }

    // ── Download image bytes from Supabase Storage ───────────────────────
    // We send bytes inline to Vision API (image.content), not a signed URL.
    // Works in local dev (where localhost is unreachable from Google's servers)
    // and prod, avoids a second network hop, and sidesteps signed-URL expiry races.
    const supabase = createAdminClient();

    console.log('[moderate-image] downloading', storagePath);
    const { data: imageBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !imageBlob) {
      console.error('[moderate-image] download error:', downloadError?.message);
      // Fail open — allow the photo if we can't access it
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Could not access image for moderation'],
      }, { headers: corsHeaders });
    }

    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
    console.log('[moderate-image] downloaded bytes:', imageBytes.length);
    const imageBase64 = bytesToBase64(imageBytes);
    console.log('[moderate-image] base64 len:', imageBase64.length);

    // ── Call Google Vision API ────────────────────────────────────────────
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_VISION_API_KEY not set');
      // Fail open
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Image moderation not configured'],
      }, { headers: corsHeaders });
    }

    console.log('[moderate-image] calling Vision API...');
    const visionStart = Date.now();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    let visionResponse: Response;
    try {
      visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: imageBase64 },
              features: [
                { type: 'FACE_DETECTION', maxResults: 5 },
                { type: 'SAFE_SEARCH_DETECTION' },
              ],
            }],
          }),
          signal: abortController.signal,
        },
      );
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('[moderate-image] Vision fetch failed:', msg);
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Moderation service unreachable'],
      }, { headers: corsHeaders });
    }
    clearTimeout(timeoutId);
    console.log('[moderate-image] Vision response status:', visionResponse.status, 'after', Date.now() - visionStart, 'ms');

    if (!visionResponse.ok) {
      const errBody = await visionResponse.text();
      console.error('[moderate-image] Vision API HTTP error:', visionResponse.status, errBody);
      // Fail open
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Moderation service unavailable'],
      }, { headers: corsHeaders });
    }

    const visionData = await visionResponse.json();
    const result = visionData.responses?.[0];
    console.log('[moderate-image] Vision result summary:', JSON.stringify({
      faces: result?.faceAnnotations?.length ?? 0,
      faceConf: result?.faceAnnotations?.[0]?.detectionConfidence ?? null,
      safeSearch: result?.safeSearchAnnotation ?? null,
      hasError: !!result?.error,
    }));

    if (!result || result.error) {
      console.error('[moderate-image] Vision API result error:', result?.error);
      // Fail open
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Moderation could not process image'],
      }, { headers: corsHeaders });
    }

    // ── Evaluate results ─────────────────────────────────────────────────
    const reasons: string[] = [];

    // Face detection — applies to every photo, not just the main one.
    // Product rule: every profile photo must clearly show a person.
    // `isMain` is accepted but currently unused by the face rule; kept in the
    // request shape so future per-slot policies don't require a redeploy.
    void isMain;
    const faces = result.faceAnnotations || [];
    const hasFace = faces.length > 0;
    const faceConfidence = hasFace ? faces[0].detectionConfidence : null;

    if (!hasFace) {
      reasons.push('This photo needs to clearly show a person.');
    } else if (faceConfidence !== null && faceConfidence < 0.3) {
      reasons.push('The face in this photo isn\'t clearly visible.');
    }

    // SafeSearch
    const ss = result.safeSearchAnnotation;
    const safeSearch = ss ? {
      adult: ss.adult,
      violence: ss.violence,
      racy: ss.racy,
      medical: ss.medical,
    } : null;

    if (ss) {
      if (likelihoodAtLeast(ss.adult, 'POSSIBLE')) {
        reasons.push('This photo may contain inappropriate content.');
      }
      if (likelihoodAtLeast(ss.violence, 'LIKELY')) {
        reasons.push('This photo may contain violent content.');
      }
      if (likelihoodAtLeast(ss.racy, 'LIKELY')) {
        reasons.push('This photo may be too suggestive.');
      }
      if (likelihoodAtLeast(ss.medical, 'LIKELY')) {
        reasons.push('This photo may contain graphic content.');
      }
    }

    return Response.json({
      approved: reasons.length === 0,
      hasFace,
      faceConfidence,
      safeSearch,
      reasons,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error('moderate-image error:', err);
    // Fail open on unexpected errors
    return Response.json({
      approved: true,
      hasFace: null,
      safeSearch: null,
      reasons: ['Moderation error — photo allowed'],
    }, { headers: corsHeaders });
  }
});
