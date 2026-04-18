/**
 * Profile Service - Photo operations
 *
 * Extracted from profileService.ts for file-size management.
 * Contains: addProfilePhotos, removeProfilePhoto, reorderProfilePhotos, setMainProfilePhoto.
 */

import { ApiResponse, Photo } from '../types';
import { createLogger } from '../utils/secureLogger';
import { uploadMultiplePhotos, deletePhoto } from './photoService';

const logger = createLogger('ProfileService');

const createErrorResponse = <T = never>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

// Lazy imports to avoid circular dependency — these are resolved at call time
const getProfileFns = () => import('./profileService');

/**
 * Add photos to the user's profile.
 * Uploads to Supabase Storage and then updates profile metadata.
 */
export const addProfilePhotos = async (
  imageUris: string[],
): Promise<ApiResponse<Photo[]>> => {
  try {
    logger.info('[ProfileService] addProfilePhotos:', imageUris.length);

    // 1. Upload files to Supabase Storage
    const uploadRes = await uploadMultiplePhotos(imageUris);
    if (!uploadRes.ok || !uploadRes.data) {
      // Surface moderation rejection verbatim so callers can show the targeted prompt.
      if (uploadRes.error?.code === 'MODERATION_REJECTED') {
        return createErrorResponse('MODERATION_REJECTED', uploadRes.error.message);
      }
      return createErrorResponse('UPLOAD_FAILED', uploadRes.error?.message || 'Failed to upload photos');
    }

    const newPhotos = uploadRes.data;

    // 2. Update profile with new photo metadata
    const { getUserProfile, updateUserProfile } = await getProfileFns();
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const existing = profileRes.data.photos || [];
    const allPhotos = [...existing, ...newPhotos];

    await updateUserProfile({ photos: allPhotos });

    return { ok: true, data: newPhotos };
  } catch (error: unknown) {
    logger.error('[ProfileService] addProfilePhotos error:', error);
    return createErrorResponse('ADD_PHOTOS_ERROR', error instanceof Error ? error.message : 'Failed to add photos');
  }
};

/**
 * Remove a photo from the user's profile.
 * Removes from the JSONB metadata array AND deletes the underlying Storage
 * object so we don't accumulate orphans in the profile-photos bucket.
 */
export const removeProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    const { getUserProfile, updateUserProfile } = await getProfileFns();
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const updatedPhotos = (profileRes.data.photos || []).filter(p => p.id !== photoId);
    await updateUserProfile({ photos: updatedPhotos });

    // Storage cleanup is best-effort: if the file was already missing or the
    // Storage call fails, we still consider the removal successful at the
    // profile level. The orphan-cleanup edge function (future) will sweep
    // anything that slips through.
    deletePhoto(photoId).catch(err => {
      logger.warn('[ProfileService] Storage delete failed (non-blocking):', err?.message);
    });

    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('REMOVE_PHOTO_ERROR', error instanceof Error ? error.message : 'Failed to remove photo');
  }
};

/**
 * Reorder profile photos.
 */
export const reorderProfilePhotos = async (
  reorderedPhotos: Photo[],
): Promise<ApiResponse<void>> => {
  try {
    const { updateUserProfile } = await getProfileFns();
    await updateUserProfile({ photos: reorderedPhotos });
    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('REORDER_PHOTOS_ERROR', error instanceof Error ? error.message : 'Failed to reorder photos');
  }
};

/**
 * Set the main (primary) profile photo.
 */
export const setMainProfilePhoto = async (
  photoId: string,
): Promise<ApiResponse<void>> => {
  try {
    const { getUserProfile, updateUserProfile } = await getProfileFns();
    const profileRes = await getUserProfile();
    if (!profileRes.ok || !profileRes.data) throw new Error('Could not fetch profile');

    const updatedPhotos = (profileRes.data.photos || []).map(p => ({
      ...p,
      isMain: p.id === photoId,
    }));
    await updateUserProfile({ photos: updatedPhotos });

    return { ok: true };
  } catch (error: unknown) {
    return createErrorResponse('SET_MAIN_PHOTO_ERROR', error instanceof Error ? error.message : 'Failed to set main photo');
  }
};
