/**
 * Image Utility Functions
 *
 * STUB — Multi-size image variants are blocked by a Supabase Pro requirement.
 *
 * The /render/image/ transform endpoint only works on Pro-plan projects, and
 * signed URLs embed the original path in the JWT token (so rewriting
 * /object/sign/ → /render/image/sign/ invalidates the signature). On the free
 * tier, the render endpoint returns errors that break images entirely.
 *
 * As a result, both helpers below are intentional pass-through stubs. Every
 * surface (72pt avatars, card thumbnails, 900pt hero) currently downloads the
 * same 1200×1600 @ 85% JPEG produced at upload time in photoService.ts. This
 * is a ~250–400 KB-per-avatar download cost that cannot be reduced client-side
 * without backend/infra changes.
 *
 * Real fix (deferred): see docs/TODO — requires Supabase Pro + upload-time
 * variant generation in photoService.compressImage (e.g. _sm/_md/_lg siblings).
 */

/**
 * STUB — returns pass-through URL.
 *
 * Multi-size variants blocked by Supabase Pro requirement; see docs/TODO.
 * Handles null/undefined gracefully (returns the input unchanged, including
 * undefined). All 28+ call sites still compile.
 */
export const getOptimizedImageUrl = (url: string | undefined, _size: number): string | undefined => {
  return url;
};

// ── Preset-based optimization ────────────────────────────────────────────────

/** Preset size tiers matching UI render contexts */
export type PhotoPreset = 'avatar' | 'card' | 'match' | 'profile';

/**
 * STUB — returns pass-through URL.
 *
 * Multi-size variants blocked by Supabase Pro requirement; see docs/TODO.
 * Handles null/undefined gracefully (returns the input unchanged). Kept so
 * all call sites still compile and so consumers can swap in real variant
 * URLs once backend upload-time variant generation lands.
 */
export function getOptimizedPhotoUrl(url: string | undefined, _preset: PhotoPreset): string | undefined {
  return url;
}
