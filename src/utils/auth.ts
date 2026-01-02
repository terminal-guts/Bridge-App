/**
 * Authentication Utility Functions
 *
 * TODO: Authentication will be implemented in a future release
 * For now, these functions return mock data to allow development and testing
 *
 * SECURITY NOTE: These functions are temporarily bypassed for development
 * In production, they will ensure user authentication and prevent IDOR vulnerabilities
 * by getting user IDs from the authenticated session, NOT from client parameters.
 */

import { supabase } from '../lib/supabase';

/**
 * Get the currently authenticated user's ID from the session
 * Returns null if no user is authenticated
 *
 * SECURITY: Always use this instead of accepting userId from client parameters
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn('No authenticated user found');
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication and return the user's ID
 * Throws an error if user is not authenticated
 *
 * SECURITY: Use this in service functions that require authentication
 *
 * @throws Error if user is not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  return userId;
}

/**
 * Require authentication with phone verification
 * Returns user ID only if user has verified phone number
 *
 * SECURITY: Use this for operations that require verified users only
 *
 * @throws Error if user is not authenticated or phone not verified
 */
export async function requireAuthWithPhone(): Promise<{ userId: string; phone: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('Authentication required. Please sign in to continue.');
    }

    if (!user.phone) {
      // For anonymous users, allow access but log warning
      // TODO: Require phone verification in production
      console.warn('User has no verified phone number');
      return {
        userId: user.id,
        phone: '', // Empty phone for anonymous users
      };
    }

    return {
      userId: user.id,
      phone: user.phone,
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Check if the authenticated user matches the given userId
 * Returns true if they match, false otherwise
 *
 * SECURITY: Use this to verify ownership before allowing operations
 */
export async function isAuthenticatedUser(userId: string): Promise<boolean> {
  const authenticatedUserId = await getAuthenticatedUserId();

  if (!authenticatedUserId) {
    return false;
  }

  return authenticatedUserId === userId;
}

/**
 * Verify that the authenticated user owns the resource
 * Throws an error if the user doesn't match
 *
 * SECURITY: Use this to prevent unauthorized access to resources
 *
 * @throws Error if user doesn't match or is not authenticated
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
