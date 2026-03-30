/**
 * Photo Service
 *
 * Handles profile photo uploads, compression, and storage management.
 * Provides optimized image processing for mobile performance.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { Photo, ApiResponse } from '../types';
import { getAuthenticatedUserId, requireAuth } from '../utils/auth';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RateLimitAction,
  formatRetryTime,
} from '../utils/rateLimiter';
import { createLogger } from '../utils/secureLogger';
import { generateBlurhash } from '../utils/blurhashService';

// Create namespaced logger for this service
const logger = createLogger('PhotoService');

// Constants
const STORAGE_BUCKET = 'profile-photos';
const MAX_PHOTO_WIDTH = 1200; // Max width in pixels
const MAX_PHOTO_HEIGHT = 1600; // Max height in pixels
const JPEG_QUALITY = 0.85; // 85% quality for good balance
const MAX_PHOTOS_PER_USER = 3;

// Supported image formats
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

/**
 * Image compression and optimization options
 */
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Upload result with photo metadata
 */
interface UploadResult {
  photo: Photo;
  publicUrl: string;
}

/**
 * Error response helper
 */
const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => {
  return {
    ok: false,
    error: { code, message },
  };
};

/**
 * Generate unique photo ID
 */
const generatePhotoId = (): string => {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Extract file extension from URI
 */
const getFileExtension = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  return SUPPORTED_FORMATS.includes(extension) ? extension : 'jpg';
};

/**
 * Generate storage path for photo
 * Format: {userId}/{photoId}.{extension}
 */
const generateStoragePath = (userId: string, photoId: string, extension: string): string => {
  return `${userId}/${photoId}.${extension}`;
};

/**
 * Compress and optimize image for upload
 * Resizes to max dimensions and compresses to reduce file size
 */
const compressImage = async (
  uri: string,
  options: CompressionOptions = {}
): Promise<string> => {
  try {
    const {
      maxWidth = MAX_PHOTO_WIDTH,
      maxHeight = MAX_PHOTO_HEIGHT,
      quality = JPEG_QUALITY,
    } = options;

    // Resize and compress image
    // Only specify width to maintain aspect ratio - height will auto-calculate
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG, // Convert to JPEG for best compatibility
      }
    );

    return manipulatedImage.uri;
  } catch (error: unknown) {
    logger.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Read image URI as base64 string for upload
 * Uses fetch + FileReader (standard API, works with Expo SDK 54+)
 */
const uriToBase64 = async (uri: string): Promise<string> => {
  logger.debug('Reading file as base64 from URI:', uri.substring(0, 50));

  const response = await fetch(uri);
  const blob = await response.blob();

  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:image/jpeg;base64,AAAA..." — strip the prefix
      const dataUrl = reader.result as string;
      const base64String = dataUrl.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error('Failed to extract base64 from data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  logger.debug('File read successfully, base64 length:', base64.length);
  return base64;
};

/**
 * Internal upload function (for use by uploadMultiplePhotos)
 */
const uploadPhotoInternal = async (
  userId: string,
  imageUri: string,
  order: number,
  isMain: boolean = false,
  compressionOptions?: CompressionOptions
): Promise<ApiResponse<UploadResult>> => {
  try {

    // Validate inputs
    if (!imageUri) {
      return createErrorResponse('INVALID_INPUT', 'Image URI is required');
    }

    // Step 1: Compress and optimize image (always outputs JPEG)
    logger.debug('Compressing image...');
    const compressedUri = await compressImage(imageUri, compressionOptions);

    // Step 2: Read file as base64
    logger.debug('Reading file as base64...');
    const base64Data = await uriToBase64(compressedUri);

    // Step 3: Generate storage path (always .jpg since compression outputs JPEG)
    const photoId = generatePhotoId();
    const storagePath = generateStoragePath(userId, photoId, 'jpg');

    logger.debug('Uploading to Supabase Storage:', storagePath);

    // Step 4: Upload to Supabase Storage using decoded base64
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, decode(base64Data), {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Upload failed:', uploadError);
      return createErrorResponse('UPLOAD_FAILED', uploadError.message);
    }

    // Step 5: Generate blurhash via edge function (non-blocking — if it fails, photo still works)
    let blurhash: string | undefined;
    try {
      blurhash = await generateBlurhash(storagePath);
      if (blurhash) {
        logger.info('Blurhash generated for photo:', photoId);
      }
    } catch (blurhashError: unknown) {
      logger.warn('Blurhash generation failed (non-blocking):', blurhashError instanceof Error ? blurhashError.message : String(blurhashError));
    }

    // Step 6: Create photo metadata with storage path
    // SECURITY: We no longer use public URLs - clients will request signed URLs as needed
    const photo: Photo = {
      id: photoId,
      url: storagePath, // Store the path instead of public URL
      isMain,
      order,
      ...(blurhash ? { blurhash } : {}),
    };

    logger.info('Photo uploaded successfully:', photo);

    return {
      ok: true,
      data: {
        photo,
        publicUrl: storagePath, // Return path for now, signed URL generated on demand
      },
    };
  } catch (error: unknown) {
    logger.error('Photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error instanceof Error ? error.message : 'Failed to upload photo');
  }
};

/**
 * Upload single photo to Supabase Storage
 * Compresses image, uploads to storage, and returns photo metadata
 * SECURITY FIX: Gets userId from authenticated session, not from client
 * SECURITY: Rate limited to prevent abuse
 */
export const uploadPhoto = async (
  imageUri: string,
  order: number,
  isMain: boolean = false,
  compressionOptions?: CompressionOptions
): Promise<ApiResponse<UploadResult>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // SECURITY: Check rate limit before uploading
    const rateLimitResult = await checkRateLimit(userId, RateLimitAction.PHOTO_UPLOAD);

    if (!rateLimitResult.ok) {
      return createErrorResponse(
        'RATE_LIMIT_CHECK_FAILED',
        rateLimitResult.error?.message || 'Failed to check rate limit'
      );
    }

    if (!rateLimitResult.data || !rateLimitResult.data.allowed) {
      const retryTime = formatRetryTime(rateLimitResult.data?.retryAfterSeconds ?? 60);
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        `Too many photo uploads. Please try again in ${retryTime}.`
      );
    }

    // Record the attempt for rate limiting
    await recordRateLimitAttempt(userId, RateLimitAction.PHOTO_UPLOAD, {
      timestamp: new Date().toISOString(),
    });

    // Call internal function with authenticated userId
    return uploadPhotoInternal(userId, imageUri, order, isMain, compressionOptions);
  } catch (error: unknown) {
    logger.error('Photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error instanceof Error ? error.message : 'Failed to upload photo');
  }
};

/**
 * Upload multiple photos in sequence
 * Returns array of successfully uploaded photos
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const uploadMultiplePhotos = async (
  imageUris: string[],
  compressionOptions?: CompressionOptions
): Promise<ApiResponse<Photo[]>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Validate input
    if (!imageUris || imageUris.length === 0) {
      return createErrorResponse('INVALID_INPUT', 'Image URIs are required');
    }

    if (imageUris.length > MAX_PHOTOS_PER_USER) {
      return createErrorResponse(
        'TOO_MANY_PHOTOS',
        `Maximum ${MAX_PHOTOS_PER_USER} photos allowed`
      );
    }

    const results = await Promise.all(
      imageUris.map((uri, i) =>
        uploadPhotoInternal(userId, uri, i, i === 0, compressionOptions)
      )
    );

    const uploadedPhotos: Photo[] = [];
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.ok && result.data) {
        uploadedPhotos.push(result.data.photo);
      } else {
        errors.push(`Photo ${i + 1}: ${result.error?.message || 'Unknown error'}`);
      }
    }

    // Return success if at least one photo uploaded
    if (uploadedPhotos.length > 0) {
      return {
        ok: true,
        data: uploadedPhotos,
      };
    }

    return createErrorResponse('PHOTO_UPLOAD_FAILED', errors.join('; '));
  } catch (error: unknown) {
    logger.error('Multiple photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error instanceof Error ? error.message : 'Failed to upload photos');
  }
};

/**
 * Delete photo from Supabase Storage
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const deletePhoto = async (photoId: string): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Get user ID from authenticated session
    const userId = await requireAuth();

    // Find all files for this user to locate the photo
    const { data: fileList, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId);

    if (listError) {
      return createErrorResponse('LIST_FAILED', listError.message);
    }

    // Find the file with matching photoId
    const fileToDelete = fileList?.find(file => file.name.startsWith(photoId));

    if (!fileToDelete) {
      return createErrorResponse('PHOTO_NOT_FOUND', 'Photo not found in storage');
    }

    const storagePath = `${userId}/${fileToDelete.name}`;

    // Delete the file
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (deleteError) {
      return createErrorResponse('DELETE_FAILED', deleteError.message);
    }

    logger.info('Photo deleted successfully:', storagePath);

    return {
      ok: true,
    };
  } catch (error: unknown) {
    logger.error('Photo deletion error:', error);
    return createErrorResponse('DELETE_ERROR', error instanceof Error ? error.message : 'Failed to delete photo');
  }
};

/**
 * Get signed URL for a photo (private bucket access)
 * SECURITY: Photos are now private, so we generate time-limited signed URLs
 *
 * @param storagePath - The storage path to the photo
 * @param expiresIn - Time in seconds until URL expires (default: 1 hour)
 */
export const getPhotoSignedUrl = async (
  storagePath: string,
  expiresIn: number = 86400
): Promise<ApiResponse<string>> => {
  try {
    // If we're using mock Supabase, createSignedUrl won't work normally with real auth.
    // However, real Supabase requires an authenticated session for signed URLs on private buckets.
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      logger.warn('[PhotoService] Attempting to get signed URL without user identity');
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      logger.error('[PhotoService] createSignedUrl failed for:', storagePath, error?.message);
      return createErrorResponse(
        'SIGNED_URL_FAILED',
        error?.message || 'Failed to generate signed URL'
      );
    }

    return {
      ok: true,
      data: data.signedUrl,
    };
  } catch (error: unknown) {
    return createErrorResponse(
      'SIGNED_URL_ERROR',
      error instanceof Error ? error.message : 'Failed to generate signed URL'
    );
  }
};

/**
 * Get signed URLs for multiple photos
 * Efficiently generates signed URLs for an array of storage paths
 *
 * @param storagePaths - Array of storage paths
 * @param expiresIn - Time in seconds until URLs expire (default: 1 hour)
 */
export const getMultiplePhotoSignedUrls = async (
  storagePaths: string[],
  expiresIn: number = 86400
): Promise<ApiResponse<Record<string, string>>> => {
  try {
    if (!storagePaths || storagePaths.length === 0) {
      return {
        ok: true,
        data: {},
      };
    }

    // Batch API: one network call for all paths instead of N sequential calls
    const { data: signedUrls, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(storagePaths, expiresIn);

    if (error || !signedUrls) {
      return createErrorResponse('ALL_URLS_FAILED', error?.message || 'Failed to generate signed URLs');
    }

    const urlMap: Record<string, string> = {};
    for (let i = 0; i < signedUrls.length; i++) {
      const item = signedUrls[i];
      if (item.signedUrl) {
        // Use the original input path as key (guaranteed to match callers' lookup),
        // falling back to item.path if the index is out of range.
        const key = i < storagePaths.length ? storagePaths[i] : item.path!;
        urlMap[key] = item.signedUrl;
      }
    }

    return {
      ok: true,
      data: urlMap,
    };
  } catch (error: unknown) {
    return createErrorResponse(
      'SIGNED_URLS_ERROR',
      error instanceof Error ? error.message : 'Failed to generate signed URLs'
    );
  }
};

