/**
 * Generate Photo Blurhash — Supabase Edge Function
 *
 * Receives a storage path, downloads the image from Supabase Storage,
 * decodes it to pixel data, generates a blurhash string, and returns it.
 *
 * The client calls this after uploading a photo, then saves the blurhash
 * alongside the photo metadata in the user_profiles JSONB photos array.
 *
 * Request body: { storagePath: string }
 * Response:     { blurhash: string }
 */

import { createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from 'https://esm.sh/blurhash@2.0.5';
import { decode as decodeJpeg } from 'https://esm.sh/jpeg-js@0.4.4';
import { PNG } from 'https://esm.sh/pngjs@7.0.0';

const STORAGE_BUCKET = 'profile-photos';

// Tiny thumbnail size for fast blurhash encoding
const THUMB_SIZE = 32;
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 3;

/**
 * Decode raw image bytes (JPEG or PNG) into RGBA pixel data.
 * Returns { width, height, data } where data is Uint8ClampedArray of RGBA pixels.
 */
function decodeImageToPixels(
  imageBytes: Uint8Array,
  contentType: string,
): { width: number; height: number; data: Uint8ClampedArray } {
  if (contentType.includes('png')) {
    const png = PNG.sync.read(Buffer.from(imageBytes));
    return {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
  }

  // Default to JPEG decoding (all uploads are compressed to JPEG)
  const jpegData = decodeJpeg(imageBytes, { useTArray: true, formatAsRGBA: true });
  return {
    width: jpegData.width,
    height: jpegData.height,
    data: new Uint8ClampedArray(jpegData.data),
  };
}

/**
 * Downsample pixel data to a smaller size using nearest-neighbor.
 * Fast and good enough for blurhash input.
 */
function downsample(
  srcData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y++) {
    const srcY = Math.floor(y * yRatio);
    for (let x = 0; x < dstWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstIdx = (y * dstWidth + x) * 4;
      dst[dstIdx] = srcData[srcIdx];
      dst[dstIdx + 1] = srcData[srcIdx + 1];
      dst[dstIdx + 2] = srcData[srcIdx + 2];
      dst[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return dst;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { storagePath } = await req.json();

    if (!storagePath || typeof storagePath !== 'string') {
      return new Response(
        JSON.stringify({ error: 'storagePath is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createAdminClient();

    // Download image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError?.message);
      return new Response(
        JSON.stringify({ error: `Failed to download image: ${downloadError?.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get raw bytes
    const arrayBuffer = await fileData.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);

    // Detect content type (uploads are always JPEG, but handle PNG too)
    const contentType = fileData.type || 'image/jpeg';

    // Decode to pixel data
    const { width, height, data } = decodeImageToPixels(imageBytes, contentType);

    // Downsample to tiny thumbnail for fast encoding
    const thumbData = downsample(data, width, height, THUMB_SIZE, THUMB_SIZE);

    // Generate blurhash
    const blurhash = encode(thumbData, THUMB_SIZE, THUMB_SIZE, BLURHASH_X_COMPONENTS, BLURHASH_Y_COMPONENTS);

    return new Response(
      JSON.stringify({ blurhash }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('Blurhash generation error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
