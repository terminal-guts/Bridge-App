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

  // If it's a Supabase public URL, we can use the built-in image transformation service
  if (url.includes('supabase.co') && url.includes('/object/public/')) {
    // Use double the requested size for high-density displays (retina)
    const targetSize = Math.round(size * 2);

    // Transform from /object/public/ to /render/image/public/ which supports transformations
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
           `?width=${targetSize}&height=${targetSize}&resize=cover&quality=80`;
  }

  return url;
};
