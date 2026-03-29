/**
 * Image Utility Functions
 *
 * Uses Supabase Storage image transformation API to serve
 * correctly-sized images instead of full-resolution originals.
 */

/**
 * Optimizes a Supabase image URL by adding transformation parameters.
 *
 * @param url The original image URL
 * @param size The target size (width and height)
 * @returns Optimized URL or original URL if not a Supabase public URL
 */
export const getOptimizedImageUrl = (url: string | undefined, size: number): string | undefined => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('supabase.co')) return url;
  // Don't double-transform
  if (url.includes('width=')) return url;

  // Use double the requested size for high-density displays (retina)
  const targetSize = Math.round(size * 2);
  const transformParams = `width=${targetSize}&height=${targetSize}&resize=cover&quality=80`;

  // Public URLs: use the render/image transform endpoint
  if (url.includes('supabase.co') && url.includes('/object/public/')) {
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
           `?${transformParams}`;
  }

  // Signed URLs: route through render/image endpoint for actual transformation.
  if (url.includes('supabase.co') && url.includes('/object/sign/')) {
    const renderUrl = url.replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}${transformParams}`;
  }

  return url;
};

// ── Preset-based optimization ────────────────────────────────────────────────

/** Preset size tiers matching UI render contexts */
export type PhotoPreset = 'avatar' | 'card' | 'match' | 'profile';

const PRESET_PARAMS: Record<PhotoPreset, string> = {
  /** UserRow, FriendRequestCard, endorser avatars (~48-68px rendered) */
  avatar: 'width=120&height=120&resize=cover&quality=75',
  /** ProposalPhotoCard side-by-side cards */
  card: 'width=400&height=560&resize=cover&quality=80',
  /** Match card / awaiting-response background photo */
  match: 'width=600&height=800&resize=cover&quality=80',
  /** Full profile view (ProfileView, MatchProposalScreen) */
  profile: 'width=800&height=1000&resize=cover&quality=85',
};

/**
 * Appends Supabase image transformation params using named presets.
 * Only transforms Supabase Storage URLs; returns others unchanged.
 */
export function getOptimizedPhotoUrl(url: string | undefined, preset: PhotoPreset): string | undefined {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('supabase.co')) return url;

  // Don't double-transform
  if (url.includes('width=')) return url;

  const params = PRESET_PARAMS[preset];

  // Public URLs: use the render/image transform endpoint
  if (url.includes('/object/public/')) {
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
           `?${params}`;
  }

  // Signed URLs: route through the render/image endpoint so transformations are applied.
  // The JWT token is valid for both /object/sign/ and /render/image/sign/ — Supabase
  // validates the token claims (bucket+path+expiry), not which endpoint issued it.
  if (url.includes('/object/sign/')) {
    const renderUrl = url.replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}${params}`;
  }

  return url;
}
