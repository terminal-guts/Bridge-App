/**
 * Image Utility Functions
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

  // Use double the requested size for high-density displays (retina)
  const targetSize = Math.round(size * 2);
  const transformParams = `width=${targetSize}&height=${targetSize}&resize=cover&quality=80`;

  // Public URLs: use the render/image transform endpoint
  if (url.includes('supabase.co') && url.includes('/object/public/')) {
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
           `?${transformParams}`;
  }

  // Signed URLs: append transform params (Supabase Storage supports this)
  if (url.includes('supabase.co') && url.includes('/object/sign/')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${transformParams}`;
  }

  return url;
};
