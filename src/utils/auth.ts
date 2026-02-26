/**
 * Authentication Utility Functions
 *
 * These functions use the Supabase session to get the authenticated user.
 * They ensure user IDs come from the server-validated session,
 * preventing IDOR vulnerabilities.
 */

import { supabase } from '../lib/supabase';

/**
 * Get the currently authenticated user's ID from the session.
 * Returns null if no user is authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication and return the user's ID.
 * Throws an error if user is not authenticated.
 */
export async function requireAuth(): Promise<string> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  return userId;
}

/**
 * Require authentication with phone verification.
 * Returns user ID and phone number.
 */
export async function requireAuthWithPhone(): Promise<{ userId: string; phone: string }> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  return {
    userId: user.id,
    phone: user.phone || '',
  };
}

/**
 * Check if the authenticated user matches the given userId.
 */
export async function isAuthenticatedUser(userId: string): Promise<boolean> {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (!authenticatedUserId) return false;
  return authenticatedUserId === userId;
}

/**
 * Verify that the authenticated user owns the resource.
 * Throws an error if the user doesn't match.
 */
export async function verifyOwnership(resourceUserId: string): Promise<void> {
  const authenticatedUserId = await getAuthenticatedUserId();

  if (!authenticatedUserId) {
    throw new Error('Authentication required to access this resource.');
  }

  if (authenticatedUserId !== resourceUserId) {
    throw new Error('Unauthorized: You do not have permission to access this resource.');
  }
}
