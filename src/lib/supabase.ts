/**
 * Supabase Client for Bridge
 *
 * Creates a real Supabase client when credentials are available,
 * otherwise falls back to a mock client for development.
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('Supabase');

// Get Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have real credentials
const hasRealCredentials = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'mock-url' &&
  supabaseAnonKey !== 'mock-key' &&
  supabaseUrl.includes('supabase.co');

// Log the connection mode
if (hasRealCredentials) {
  logger.info('Connecting to real Supabase instance');
} else {
  logger.info('Using mock Supabase client - no valid credentials found');
  logger.info('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for real database');
}

/**
 * Real Supabase client - only created if credentials are valid
 */
let realSupabase: SupabaseClient | null = null;

if (hasRealCredentials) {
  realSupabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Export the appropriate client based on credentials.
 * Mock client is only available in dev builds — production always uses real Supabase.
 */
let supabaseClient: SupabaseClient;

if (realSupabase) {
  supabaseClient = realSupabase;
} else if (__DEV__) {
  // Dynamic require — mock client only loads in development
  const { createMockSupabaseClient } = require('./supabaseMock');
  supabaseClient = createMockSupabaseClient(logger) as unknown as SupabaseClient;
} else {
  throw new Error('No Supabase credentials found in production build');
}

export const supabase = supabaseClient;

/**
 * Helper to check if we're using real Supabase
 */
export const isRealSupabase = (): boolean => !!hasRealCredentials;

/**
 * Get the Supabase URL (useful for debugging)
 */
export const getSupabaseUrl = (): string | undefined => supabaseUrl;
