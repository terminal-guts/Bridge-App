/**
 * Community Backend Service - Helper utilities
 *
 * Extracted from communityBackendService.ts for file-size management.
 * Contains: mapProfileRow, resolveProfilePhotos, prefetchProfileImages,
 * deriveKarmaTier, getCurrentUserId.
 */

import { supabase } from '../lib/supabase';
import { UserProfile, KarmaTier } from '../types/community';
import { getMultiplePhotoSignedUrls } from './photoService';
import { getAuthenticatedUserId } from '../utils/auth';
import {
  getCachedPhotoUrls,
  mergeCachedPhotoUrls,
} from './communityCache';

// ============================================================================
// Auth Helper
// ============================================================================

export async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ============================================================================
// Profile Row Mapping
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
export function mapProfileRow(row: Record<string, any>): UserProfile {
  // Filter out local file:// URIs — these are device-local ImagePicker cache paths
  // that were incorrectly saved to the DB instead of Supabase storage paths.
  const rawPhotos = ((row.photos && row.photos.length > 0)
    ? row.photos
    : (row.profile_photo_path ? [{ id: '1', url: row.profile_photo_path, is_main: true, display_order: 0 }] : [])
  ).filter((p: Record<string, unknown>) => p.url && !(p.url as string).startsWith('file://'));

  return {
    id: row.user_id || row.id,
    userId: row.user_id || row.id,
    firstName: (row.first_name || '').replace(/[''"`]+$/, '').trim(),
    lastName: (row.last_name || '').replace(/[''"`]+$/, '').trim(),
    age: row.age || 0,
    gender: row.gender || [],
    pronouns: row.pronouns || '',
    customPronouns: row.custom_pronouns || undefined,
    height: row.height_inches ? String(row.height_inches) : (row.height || ''),
    ethnicity: row.ethnicity || '',
    religion: row.religion || '',
    politicalLeaning: row.political_leaning || '',
    location: row.location || row.where_live_now || '',
    currentJob: row.current_job || '',
    company: row.company_position || '',
    companyPosition: row.company_position || '',
    educationLevel: row.education_level || '',
    school: row.school || '',
    photos: rawPhotos.map((p: Record<string, unknown>) => ({
      id: (p.id || p.url) as string,
      url: p.url as string,
      isMain: (p.is_main ?? p.isMain ?? false) as boolean,
      order: (p.display_order ?? p.order ?? 0) as number,
    })),
    interests: row.interests || [],
    values: row.values || [],
    bio: row.bio || '',
    lifestyle: row.lifestyle || {},
    drinkingFrequency: row.drinking_frequency || undefined,
    cannabisFrequency: row.cannabis_frequency || undefined,
    tobaccoFrequency: row.tobacco_frequency || undefined,
    otherDrugsFrequency: row.other_drugs_frequency || undefined,
    partnerLifestylePreferences: (() => {
      // Check raw fields first (most reliable — not affected by JSON serialization)
      if (row.partner_drinking || row.partner_cannabis || row.partner_tobacco || row.partner_other_drugs) {
        return {
          drinking: row.partner_drinking?.length ? row.partner_drinking : undefined,
          cannabis: row.partner_cannabis?.length ? row.partner_cannabis : undefined,
          tobacco: row.partner_tobacco?.length ? row.partner_tobacco : undefined,
          otherDrugs: row.partner_other_drugs?.length ? row.partner_other_drugs : undefined,
        };
      }
      // Fall back to nested object if it has actual content
      const plp = row.partner_lifestyle_preferences;
      if (plp && (plp.drinking || plp.cannabis || plp.tobacco || plp.otherDrugs)) {
        return plp;
      }
      return undefined;
    })(),
    preferredEthnicities: row.preferred_ethnicities || [],
    preferredPolitics: row.preferred_politics || [],
    nonNegotiables: [],
    preferences: {
      ageMin: row.age_min ?? undefined,
      ageMax: row.age_max ?? undefined,
      heightMin: row.height_min ?? undefined,
      heightMax: row.height_max ?? undefined,
      ...(row.preferences || {}),
    },
    isPaused: row.is_paused ?? undefined,
    profileCompleted: row.profile_completed || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ============================================================================
// Photo Resolution
// ============================================================================

/**
 * Resolves storage paths to signed URLs for an array of user profiles.
 * Handles both raw paths and already-expired signed URLs.
 */
export async function resolveProfilePhotos(profiles: UserProfile[]): Promise<void> {
  if (!profiles || profiles.length === 0) return;

  const extractPath = (url: string): string => {
    if (!url) return url;
    if (!url.startsWith('http')) return url;
    const match = url.match(/\/profile-photos\/(.+?)(?:\?|$)/);
    return match ? match[1] : url;
  };

  // Filter out invalid local file:// URIs and normalize to storage paths
  for (const p of profiles) {
    if (p.photos) {
      p.photos = p.photos
        .filter(photo => photo.url && !photo.url.startsWith('file://'))
        .map(photo => ({
          ...photo,
          url: extractPath(photo.url),
        }));
    }
  }

  // Collect unique paths needing signing
  const pathsToSign = new Set<string>();
  for (const p of profiles) {
    for (const photo of p.photos || []) {
      if (photo.url && !photo.url.startsWith('http')) {
        pathsToSign.add(photo.url);
      }
    }
  }

  if (pathsToSign.size === 0) return;

  // Check photo URL cache first — avoid re-signing URLs that are still valid
  const cachedUrls = await getCachedPhotoUrls();
  const alreadyCached: Record<string, string> = {};
  const needsSigning: string[] = [];

  for (const path of pathsToSign) {
    if (cachedUrls[path]) {
      alreadyCached[path] = cachedUrls[path];
    } else {
      needsSigning.push(path);
    }
  }

  // Apply cached URLs immediately
  if (Object.keys(alreadyCached).length > 0) {
    for (const p of profiles) {
      if (p.photos) {
        p.photos = p.photos.map(photo => ({
          ...photo,
          url: alreadyCached[photo.url] || photo.url,
        }));
      }
    }
  }

  // Sign only the uncached paths
  if (needsSigning.length === 0) return;

  const res = await getMultiplePhotoSignedUrls(needsSigning, 86400);

  if (res.ok && res.data) {
    // Persist newly signed URLs to cache
    mergeCachedPhotoUrls(res.data).catch(() => {});

    for (const p of profiles) {
      if (p.photos) {
        p.photos = p.photos.map(photo => ({
          ...photo,
          url: res.data![photo.url] || photo.url,
        }));
      }
    }
  } else {
    // Fallback to public URLs if signing fails
    for (const p of profiles) {
      if (p.photos) {
        p.photos = p.photos.map(photo => {
          if (photo.url && !photo.url.startsWith('http')) {
            const { data } = supabase.storage.from('profile-photos').getPublicUrl(photo.url);
            return { ...photo, url: data.publicUrl };
          }
          return photo;
        });
      }
    }
  }

  // Fire-and-forget: prefetch signed URLs into expo-image disk cache
  prefetchProfileImages(profiles);
}

/** Prefetch all signed photo URLs so expo-image has them cached before render. */
export function prefetchProfileImages(profiles: UserProfile[]): void {
  const urls: string[] = [];
  for (const p of profiles) {
    for (const photo of p.photos || []) {
      if (photo.url && photo.url.startsWith('http')) {
        urls.push(photo.url);
      }
    }
  }
  if (urls.length === 0) return;
  // Dynamic import to avoid pulling expo-image into service bundle eagerly
  import('expo-image').then(({ Image }) => {
    Image.prefetch(urls);
  }).catch(() => {});
}

// ============================================================================
// Karma Tier
// ============================================================================

export function deriveKarmaTier(points: number): KarmaTier {
  if (points >= 500) return 'elite';
  if (points >= 150) return 'trusted';
  if (points >= 50) return 'solid';
  return 'new';
}
