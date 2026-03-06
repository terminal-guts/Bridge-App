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
 * Mock Supabase client for development without backend
 */
const createMockClient = () => {
  const mockQuery: any = {
    select: (columns?: string) => mockQuery,
    eq: (column: string, value: any) => mockQuery,
    neq: (column: string, value: any) => mockQuery,
    gt: (column: string, value: any) => mockQuery,
    lt: (column: string, value: any) => mockQuery,
    gte: (column: string, value: any) => mockQuery,
    lte: (column: string, value: any) => mockQuery,
    like: (column: string, value: any) => mockQuery,
    ilike: (column: string, value: any) => mockQuery,
    is: (column: string, value: any) => mockQuery,
    in: (column: string, values: any[]) => mockQuery,
    contains: (column: string, value: any) => mockQuery,
    containedBy: (column: string, value: any) => mockQuery,
    or: (filters: string) => mockQuery,
    order: (column: string, options?: any) => mockQuery,
    limit: (count: number) => mockQuery,
    range: (from: number, to: number) => mockQuery,
    single: async () => ({ data: null, error: { code: 'PGRST116', message: 'No data' } }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: async (resolve: any) => resolve({ data: [], error: null }),
    insert: (data: any) => ({
      ...mockQuery,
      select: () => ({
        single: async () => ({
          data: Array.isArray(data) ? data[0] : data,
          error: null
        }),
        then: async (resolve: any) => resolve({
          data: Array.isArray(data) ? data : [data],
          error: null
        }),
      }),
      then: async (resolve: any) => resolve({ data: null, error: null }),
    }),
    update: (data: any) => mockQuery,
    upsert: (data: any, options?: any) => mockQuery,
    delete: () => mockQuery,
  };

  return {
    auth: {
      signInWithOtp: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      signInAnonymously: async () => ({
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@bridge.app',
            phone: '+1234567890',
          },
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
          },
        },
        error: null,
      }),
      getUser: async () => ({
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@bridge.app',
            phone: '+1234567890',
          },
        },
        error: null,
      }),
      verifyOtp: async () => ({
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@bridge.app',
            phone: '+1234567890',
          },
        },
        error: null,
      }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        logger.debug('Mock onAuthStateChange called - returning mock subscription');
        setTimeout(() => {
          callback('SIGNED_IN', {
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'dev@bridge.app',
              phone: '+1234567890',
            },
            access_token: 'mock-token',
          });
        }, 0);

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                logger.debug('Mock auth subscription unsubscribed');
              },
            },
          },
        };
      },
    },
    from: (table: string) => mockQuery,
    rpc: async (functionName: string, params?: any) => ({
      data: null,
      error: { message: `Mock RPC call to ${functionName} - not implemented` },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any, options?: any) => ({
          data: { path },
          error: null,
        }),
        remove: async (paths: string[]) => ({ data: null, error: null }),
        createSignedUrl: async (path: string, expiresIn: number) => ({
          data: { signedUrl: `mock-signed-url/${path}` },
          error: null,
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `mock-public-url/${path}` },
        }),
      }),
    },
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    channel: (name: string) => ({
      on: (event: string, filter: any, callback: any) => ({
        subscribe: (statusCallback?: (status: string) => void) => {
          if (statusCallback) statusCallback('SUBSCRIBED');
          return {
            unsubscribe: () => {
              logger.debug('Mock channel unsubscribed:', name);
            },
          };
        },
      }),
      subscribe: (callback?: (status: string) => void) => {
        if (callback) callback('SUBSCRIBED');
        return {
          unsubscribe: () => {},
        };
      },
    }),
    removeChannel: async (channel: any) => ({ error: null }),
  };
};

/**
 * Export the appropriate client based on credentials
 */
export const supabase = realSupabase || (createMockClient() as unknown as SupabaseClient);

/**
 * Helper to check if we're using real Supabase
 */
export const isRealSupabase = (): boolean => !!hasRealCredentials;

/**
 * Get the Supabase URL (useful for debugging)
 */
export const getSupabaseUrl = (): string | undefined => supabaseUrl;
