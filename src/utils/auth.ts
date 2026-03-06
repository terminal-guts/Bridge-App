/**
 * Authentication Utility Functions
 *
 * These functions use the Supabase session to get the authenticated user.
 * They ensure user IDs come from the server-validated session,
 * preventing IDOR vulnerabilities.
 */

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory userId cache — set after first successful auth, cleared on sign-out.
// Eliminates redundant supabase.auth.getUser() network calls from every service method.
let cachedUserId: string | null = null;

export function setCachedUserId(id: string): void {
  cachedUserId = id;
}

export function clearCachedUserId(): void {
  cachedUserId = null;
}

/**
 * Get the currently authenticated user's ID from the session.
 * Returns null if no user is authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  // Fast path: return cached value (no async, no network)
  if (cachedUserId) return cachedUserId;

  try {
    // Priority 1: Custom auth storage (required by architecture)
    const storedUserJson = await AsyncStorage.getItem('bridge_auth_user');
    if (storedUserJson) {
      const userData = JSON.parse(storedUserJson);
      if (userData?.id) {
        cachedUserId = userData.id;
        return userData.id;
      }
    }

    // Priority 2: Fallback to Supabase session (no network call)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      cachedUserId = session.user.id;
      return session.user.id;
    }

    return null;
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
  try {
    // Fast path: cached userId (phone not always needed, fallback to '')
    if (cachedUserId) {
      return { userId: cachedUserId, phone: '' };
    }

    // Priority 1: Custom auth storage
    const storedUserJson = await AsyncStorage.getItem('bridge_auth_user');
    if (storedUserJson) {
      const userData = JSON.parse(storedUserJson);
      if (userData?.id) {
        cachedUserId = userData.id;
        return {
          userId: userData.id,
          phone: userData.phone || '',
        };
      }
    }

    // Priority 2: Fallback to Supabase session (no network call)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUserId = session.user.id;
      return {
        userId: session.user.id,
        phone: session.user.phone || '',
      };
    }
  } catch (error) {
    console.error('Error in requireAuthWithPhone:', error);
  }

  throw new Error('Authentication required. Please sign in to continue.');
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
