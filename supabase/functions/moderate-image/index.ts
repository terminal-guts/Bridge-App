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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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

    // ── Download image from Supabase Storage ─────────────────────────────
    const supabase = createAdminClient();

    // Generate a short-lived signed URL for Google Vision API to fetch
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 300); // 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError?.message);
      // Fail open — allow the photo if we can't generate a URL
      return Response.json({
        approved: true,
        hasFace: null,
        safeSearch: null,
        reasons: ['Could not access image for moderation'],
      }, { headers: corsHeaders });
    }

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

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: signedUrlData.signedUrl } },
            features: [
              { type: 'FACE_DETECTION', maxResults: 5 },
              { type: 'SAFE_SEARCH_DETECTION' },
            ],
          }],
        }),
      },
    );

    if (!visionResponse.ok) {
      console.error('Vision API error:', visionResponse.status, await visionResponse.text());
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

    if (!result || result.error) {
      console.error('Vision API result error:', result?.error);
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

    // Face detection
    const faces = result.faceAnnotations || [];
    const hasFace = faces.length > 0;
    const faceConfidence = hasFace ? faces[0].detectionConfidence : null;

    if (isMain && !hasFace) {
      reasons.push('Your main photo needs to clearly show your face.');
    }
    if (isMain && hasFace && faceConfidence !== null && faceConfidence < 0.3) {
      reasons.push('Your face is not clearly visible in this photo.');
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
