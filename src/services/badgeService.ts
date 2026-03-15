/**
 * Badge Service
 *
 * Handles friend badge CRUD operations with content moderation.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { FriendBadge, FriendBadgeWithGiver, AwardBadgeInput, UpdateBadgeInput } from '../types/badges';
import { requireAuth } from '../utils/auth';
import { createLogger } from '../utils/secureLogger';
import { contentModerationService } from './contentModerationService';

const logger = createLogger('BadgeService');

const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'cock', 'pussy', 'cunt',
  'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore',
  'kill', 'rape', 'nazi', 'hitler',
];

const createErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  ok: false,
  error: { code, message },
});

const formatBadge = (data: Record<string, unknown>): FriendBadge => ({
  id: data.id as string,
  giverId: data.giver_id as string,
  receiverId: data.receiver_id as string,
  iconName: data.icon_name as string,
  message: data.message as string,
  isFeatured: data.is_featured as boolean,
  isHidden: data.is_hidden as boolean,
  createdAt: data.created_at as string,
  updatedAt: data.updated_at as string,
});

const formatBadgeWithGiver = (data: Record<string, unknown>): FriendBadgeWithGiver => ({
  ...formatBadge(data),
  giverFirstName: (data.giver_profile as Record<string, unknown> | null)?.first_name as string || 'Friend',
  giverPhotoUrl: ((data.giver_profile as Record<string, unknown> | null)?.photos as Array<Record<string, unknown>> | undefined)?.[0]?.url as string | undefined,
});

function checkBlockedWords(message: string): string | null {
  const lower = message.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return `Message contains inappropriate language.`;
    }
  }
  return null;
}

export const awardBadge = async (input: AwardBadgeInput): Promise<ApiResponse<FriendBadge>> => {
  try {
    const userId = await requireAuth();

    const blocked = checkBlockedWords(input.message);
    if (blocked) return createErrorResponse('BLOCKED_CONTENT', blocked);

    const modResult = await contentModerationService.analyzeText(input.message);
    if (!modResult.isSafe) {
      return createErrorResponse('MODERATION_FAILED', modResult.reason || 'Content flagged as inappropriate.');
    }

    const { data, error } = await supabase
      .from('friend_badges')
      .insert({
        giver_id: userId,
        receiver_id: input.receiverId,
        icon_name: input.iconName,
        message: input.message,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return createErrorResponse('ALREADY_EXISTS', 'You already gave this friend a badge.');
      }
      return createErrorResponse('INSERT_ERROR', error.message);
    }

    return { ok: true, data: formatBadge(data) };
  } catch (error: unknown) {
    logger.error('Award badge failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('AWARD_ERROR', error instanceof Error ? error.message : 'Failed to award badge');
  }
};

export const updateBadge = async (badgeId: string, input: UpdateBadgeInput): Promise<ApiResponse<FriendBadge>> => {
  try {
    const userId = await requireAuth();

    if (input.message) {
      const blocked = checkBlockedWords(input.message);
      if (blocked) return createErrorResponse('BLOCKED_CONTENT', blocked);

      const modResult = await contentModerationService.analyzeText(input.message);
      if (!modResult.isSafe) {
        return createErrorResponse('MODERATION_FAILED', modResult.reason || 'Content flagged as inappropriate.');
      }
    }

    const updateData: Record<string, string> = {};
    if (input.iconName) updateData.icon_name = input.iconName;
    if (input.message) updateData.message = input.message;

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('NO_CHANGES', 'Nothing to update.');
    }

    const { data, error } = await supabase
      .from('friend_badges')
      .update(updateData)
      .eq('id', badgeId)
      .eq('giver_id', userId)
      .select()
      .single();

    if (error) return createErrorResponse('UPDATE_ERROR', error.message);
    return { ok: true, data: formatBadge(data) };
  } catch (error: unknown) {
    logger.error('Update badge failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('UPDATE_ERROR', error instanceof Error ? error.message : 'Failed to update badge');
  }
};

export const deleteBadge = async (badgeId: string): Promise<ApiResponse<void>> => {
  try {
    const userId = await requireAuth();

    const { error } = await supabase
      .from('friend_badges')
      .delete()
      .eq('id', badgeId)
      .eq('giver_id', userId);

    if (error) return createErrorResponse('DELETE_ERROR', error.message);
    return { ok: true };
  } catch (error: unknown) {
    logger.error('Delete badge failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('DELETE_ERROR', error instanceof Error ? error.message : 'Failed to delete badge');
  }
};

export const getReceivedBadges = async (userId?: string): Promise<ApiResponse<FriendBadgeWithGiver[]>> => {
  try {
    const authUserId = await requireAuth();
    const targetId = userId || authUserId;

    const { data, error } = await supabase
      .from('friend_badges')
      .select(`
        *,
        giver_profile:user_profiles!fk_giver_profile(first_name, photos)
      `)
      .eq('receiver_id', targetId)
      .order('created_at', { ascending: false });

    if (error) return createErrorResponse('FETCH_ERROR', error.message);

    const badges = (data || [])
      .filter((b: Record<string, unknown>) => {
        if (targetId === authUserId) return true;
        return !b.is_hidden;
      })
      .map(formatBadgeWithGiver);

    return { ok: true, data: badges };
  } catch (error: unknown) {
    logger.error('Get received badges failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to fetch badges');
  }
};

export const getFeaturedBadges = async (userId: string): Promise<ApiResponse<FriendBadgeWithGiver[]>> => {
  try {
    await requireAuth();

    const { data, error } = await supabase
      .from('friend_badges')
      .select(`
        *,
        giver_profile:user_profiles!fk_giver_profile(first_name, photos)
      `)
      .eq('receiver_id', userId)
      .eq('is_featured', true)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) return createErrorResponse('FETCH_ERROR', error.message);

    const badges = (data || []).map(formatBadgeWithGiver);
    return { ok: true, data: badges };
  } catch (error: unknown) {
    logger.error('Get featured badges failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to fetch featured badges');
  }
};

export const toggleFeatured = async (badgeId: string, isFeatured: boolean): Promise<ApiResponse<FriendBadge>> => {
  try {
    const userId = await requireAuth();

    if (isFeatured) {
      const { data: current } = await supabase
        .from('friend_badges')
        .select('id')
        .eq('receiver_id', userId)
        .eq('is_featured', true);

      if (current && current.length >= 3) {
        return createErrorResponse('MAX_FEATURED', 'You can only feature up to 3 badges.');
      }
    }

    const { data, error } = await supabase
      .from('friend_badges')
      .update({ is_featured: isFeatured })
      .eq('id', badgeId)
      .eq('receiver_id', userId)
      .select()
      .single();

    if (error) return createErrorResponse('UPDATE_ERROR', error.message);
    return { ok: true, data: formatBadge(data) };
  } catch (error: unknown) {
    logger.error('Toggle featured failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('UPDATE_ERROR', error instanceof Error ? error.message : 'Failed to toggle featured');
  }
};

export const toggleHidden = async (badgeId: string, isHidden: boolean): Promise<ApiResponse<FriendBadge>> => {
  try {
    const userId = await requireAuth();

    const updateData: Record<string, boolean> = { is_hidden: isHidden };
    if (isHidden) {
      updateData.is_featured = false;
    }

    const { data, error } = await supabase
      .from('friend_badges')
      .update(updateData)
      .eq('id', badgeId)
      .eq('receiver_id', userId)
      .select()
      .single();

    if (error) return createErrorResponse('UPDATE_ERROR', error.message);
    return { ok: true, data: formatBadge(data) };
  } catch (error: unknown) {
    logger.error('Toggle hidden failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('UPDATE_ERROR', error instanceof Error ? error.message : 'Failed to toggle hidden');
  }
};

export const getBadgeForFriend = async (friendId: string): Promise<ApiResponse<FriendBadge | null>> => {
  try {
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('friend_badges')
      .select('*')
      .eq('giver_id', userId)
      .eq('receiver_id', friendId)
      .maybeSingle();

    if (error) return createErrorResponse('FETCH_ERROR', error.message);
    return { ok: true, data: data ? formatBadge(data) : null };
  } catch (error: unknown) {
    logger.error('Get badge for friend failed:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Failed to check badge');
  }
};
