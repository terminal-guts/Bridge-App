/**
 * Photo Service
 *
 * Handles profile photo uploads, compression, and storage management.
 * Provides optimized image processing for mobile performance.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import { Photo, ApiResponse } from '../types';
import { requireAuth } from '../utils/auth';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RateLimitAction,
  formatRetryTime,
} from '../utils/rateLimiter';
import { createLogger } from '../utils/secureLogger';
import { Platform } from 'react-native';

// Create namespaced logger for this service
const logger = createLogger('PhotoService');

// Constants
const STORAGE_BUCKET = 'profile-photos';
const MAX_PHOTO_WIDTH = 1200; // Max width in pixels
const MAX_PHOTO_HEIGHT = 1600; // Max height in pixels
const JPEG_QUALITY = 0.85; // 85% quality for good balance
const MAX_PHOTOS_PER_USER = 6;

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
const createErrorResponse = (code: string, message: string): ApiResponse<any> => {
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
  } catch (error: any) {
    logger.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Convert base64 string to ArrayBuffer (React Native compatible)
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  // Remove data URL prefix if present
  const base64String = base64.replace(/^data:image\/\w+;base64,/, '');

  // Decode base64 to binary string
  const binaryString = typeof atob !== 'undefined'
    ? atob(base64String)
    : Buffer.from(base64String, 'base64').toString('binary');

  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
};

/**
 * Convert image URI to ArrayBuffer for upload (React Native compatible)
 * Tries multiple methods with fallbacks for maximum compatibility
 */
const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  logger.debug('Reading file from URI:', uri.substring(0, 50));

  // METHOD 1: Try using FileSystem with string literal encoding
  try {
    logger.debug('Method 1: Trying FileSystem with string literal encoding...');

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any, // Use string literal instead of enum
    });

    logger.debug('File read successfully with Method 1, converting to ArrayBuffer...');
    const arrayBuffer = base64ToArrayBuffer(base64);
    logger.debug('ArrayBuffer created, size:', arrayBuffer.byteLength);

    return arrayBuffer;
  } catch (error: any) {
    logger.warn('Method 1 failed:', error.message);
  }

  // METHOD 2: Try using FileSystem with EncodingType enum (if it exists)
  try {
    logger.debug('Method 2: Trying FileSystem with EncodingType enum...');

    // Check if EncodingType exists
    if ((FileSystem as any).EncodingType?.Base64) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      logger.debug('File read successfully with Method 2, converting to ArrayBuffer...');
      const arrayBuffer = base64ToArrayBuffer(base64);
      logger.debug('ArrayBuffer created, size:', arrayBuffer.byteLength);

      return arrayBuffer;
    } else {
      logger.debug('EncodingType.Base64 not available, skipping Method 2');
    }
  } catch (error: any) {
    logger.warn('Method 2 failed:', error.message);
  }

  // METHOD 3: Try using fetch API to read file as arrayBuffer
  try {
    logger.debug('Method 3: Trying fetch API to read file...');

    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    logger.debug('File read successfully with Method 3, ArrayBuffer size:', arrayBuffer.byteLength);

    return arrayBuffer;
  } catch (error: any) {
    logger.warn('Method 3 failed:', error.message);
  }

  // METHOD 4: Try using XMLHttpRequest (React Native fallback)
  try {
    logger.debug('Method 4: Trying XMLHttpRequest...');

    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', uri, true);
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.debug('File read successfully with Method 4, ArrayBuffer size:', xhr.response.byteLength);
          resolve(xhr.response);
        } else {
          reject(new Error(`XMLHttpRequest failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('XMLHttpRequest failed'));
      xhr.send();
    });
  } catch (error: any) {
    logger.error('Method 4 failed:', error.message);
  }

  // All methods failed
  logger.error('All methods to read file failed!');
  throw new Error('Failed to process image: All file reading methods failed. Please ensure photo permissions are granted.');
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

    // Step 1: Compress and optimize image
    logger.debug('Compressing image...');
    const compressedUri = await compressImage(imageUri, compressionOptions);

    // Step 2: Convert to ArrayBuffer
    logger.debug('Converting to ArrayBuffer...');
    const arrayBuffer = await uriToArrayBuffer(compressedUri);

    // Step 3: Generate storage path
    const photoId = generatePhotoId();
    const extension = getFileExtension(imageUri);
    const storagePath = generateStoragePath(userId, photoId, extension);

    logger.debug('Uploading to Supabase Storage:', storagePath);

    // Step 4: Upload to Supabase Storage using ArrayBuffer
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing photos
      });

    if (uploadError) {
      logger.error('Upload failed:', uploadError);
      return createErrorResponse('UPLOAD_FAILED', uploadError.message);
    }

    // Step 5: Create photo metadata with storage path
    // SECURITY: We no longer use public URLs - clients will request signed URLs as needed
    const photo: Photo = {
      id: photoId,
      url: storagePath, // Store the path instead of public URL
      isMain,
      order,
    };

    logger.info('Photo uploaded successfully:', photo);

    return {
      ok: true,
      data: {
        photo,
        publicUrl: storagePath, // Return path for now, signed URL generated on demand
      },
    };
  } catch (error: any) {
    logger.error('Photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error.message || 'Failed to upload photo');
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
  } catch (error: any) {
    logger.error('Photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error.message || 'Failed to upload photo');
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

    const uploadedPhotos: Photo[] = [];
    const errors: string[] = [];

    // Upload photos sequentially to avoid overwhelming the server
    for (let i = 0; i < imageUris.length; i++) {
      const result = await uploadPhotoInternal(
        userId,
        imageUris[i],
        i,
        i === 0, // First photo is main photo
        compressionOptions
      );

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

    return createErrorResponse('ALL_UPLOADS_FAILED', errors.join('; '));
  } catch (error: any) {
    logger.error('Multiple photo upload error:', error);
    return createErrorResponse('UPLOAD_ERROR', error.message || 'Failed to upload photos');
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
  } catch (error: any) {
    logger.error('Photo deletion error:', error);
    return createErrorResponse('DELETE_ERROR', error.message || 'Failed to delete photo');
  }
};

/**
 * Delete multiple photos from storage
 * SECURITY FIX: Gets userId from authenticated session, not from client
 */
export const deleteMultiplePhotos = async (
  photoIds: string[]
): Promise<ApiResponse<void>> => {
  try {
    // SECURITY: Auth check performed in deletePhoto() for each photo
    const errors: string[] = [];

    for (const photoId of photoIds) {
      const result = await deletePhoto(photoId);
      if (!result.ok) {
        errors.push(`${photoId}: ${result.error?.message}`);
      }
    }

    if (errors.length > 0) {
      return createErrorResponse('PARTIAL_DELETE_FAILED', errors.join('; '));
    }

    return {
      ok: true,
    };
  } catch (error: any) {
    return createErrorResponse('DELETE_ERROR', error.message || 'Failed to delete photos');
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
  expiresIn: number = 3600
): Promise<ApiResponse<string>> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      return createErrorResponse(
        'SIGNED_URL_FAILED',
        error?.message || 'Failed to generate signed URL'
      );
    }

    return {
      ok: true,
      data: data.signedUrl,
    };
  } catch (error: any) {
    return createErrorResponse(
      'SIGNED_URL_ERROR',
      error.message || 'Failed to generate signed URL'
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
  expiresIn: number = 3600
): Promise<ApiResponse<Record<string, string>>> => {
  try {
    if (!storagePaths || storagePaths.length === 0) {
      return {
        ok: true,
        data: {},
      };
    }

    const urlMap: Record<string, string> = {};
    const errors: string[] = [];

    // Generate signed URLs for each path
    for (const path of storagePaths) {
      const result = await getPhotoSignedUrl(path, expiresIn);
      if (result.ok && result.data) {
        urlMap[path] = result.data;
      } else {
        errors.push(`Failed to generate URL for ${path}`);
      }
    }

    if (errors.length > 0 && Object.keys(urlMap).length === 0) {
      return createErrorResponse('ALL_URLS_FAILED', errors.join('; '));
    }

    return {
      ok: true,
      data: urlMap,
    };
  } catch (error: any) {
    return createErrorResponse(
      'SIGNED_URLS_ERROR',
      error.message || 'Failed to generate signed URLs'
    );
  }
};

/**
 * DEPRECATED: Get public URL for a photo
 * @deprecated Use getPhotoSignedUrl instead - photos are now private
 */
export const getPhotoUrl = (storagePath: string): string => {
  logger.warn('getPhotoUrl is deprecated. Use getPhotoSignedUrl for private bucket access.');
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};

/**
 * Reorder photos by updating their order property
 * Returns updated photos array
 */
export const reorderPhotos = (photos: Photo[], newOrder: number[]): Photo[] => {
  return photos.map((photo, index) => ({
    ...photo,
    order: newOrder[index],
  }));
};

/**
 * Set a photo as the main profile photo
 */
export const setMainPhoto = (photos: Photo[], photoId: string): Photo[] => {
  return photos.map(photo => ({
    ...photo,
    isMain: photo.id === photoId,
  }));
};

/**
 * Validate photo count before upload
 */
export const canUploadMorePhotos = (currentPhotoCount: number): boolean => {
  return currentPhotoCount < MAX_PHOTOS_PER_USER;
};

/**
 * Get remaining photo slots
 */
export const getRemainingPhotoSlots = (currentPhotoCount: number): number => {
  return Math.max(0, MAX_PHOTOS_PER_USER - currentPhotoCount);
};
