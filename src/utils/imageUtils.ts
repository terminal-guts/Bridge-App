/**
 * Image Utility Functions
 *
 * NOTE: Supabase image transforms (/render/image/) require a Pro plan.
 * On free-tier projects, the render endpoint returns errors, breaking images.
 * Signed URLs also embed the original path in the JWT token — rewriting
 * /object/sign/ to /render/image/sign/ invalidates the token.
 *
 * We therefore return signed/public URLs as-is. Images are already compressed
 * to 1200px max width at upload time (see photoService.ts), so on-the-fly
 * transforms are not needed.
 */

/**
 * Returns the image URL unchanged.
 *
 * Previously this rewrote Supabase URLs to the /render/image/ transform
 * endpoint, but that broke signed URLs (token path mismatch) and only works
 * on Pro-plan projects. Upload-time compression handles sizing.
 *
 * Kept as a function (rather than deleted) so all 28+ call sites still compile.
 */
export const getOptimizedImageUrl = (url: string | undefined, _size: number): string | undefined => {
  return url;
};

// ── Preset-based optimization ────────────────────────────────────────────────

/** Preset size tiers matching UI render contexts */
export type PhotoPreset = 'avatar' | 'card' | 'match' | 'profile';

/**
 * Returns the image URL unchanged.
 *
 * Previously this rewrote URLs to the /render/image/ transform endpoint,
 * but that broke signed URLs and requires a Pro-plan Supabase project.
 * Upload-time compression (1200px max, 85% JPEG) handles sizing adequately.
 *
 * Kept as a function so all call sites still compile.
 */
export function getOptimizedPhotoUrl(url: string | undefined, _preset: PhotoPreset): string | undefined {
  return url;
}
