/**
 * Supabase Client - MOCK VERSION
 *
 * Provides a stub Supabase client to prevent import errors
 * All functionality is mocked - use dedicated service mocks instead
 */

console.log('[MOCK SUPABASE] Using mock Supabase client - no backend connectivity');

// Mock Supabase client for services that still import it
export const supabase = {
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
      console.log('[MOCK SUPABASE] onAuthStateChange called - returning mock subscription');
      // Immediately trigger callback with signed-in state
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
              console.log('[MOCK SUPABASE] Auth subscription unsubscribed');
            },
          },
        },
      };
    },
  },
  from: (table: string) => {
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
      or: (filters: string) => mockQuery, // Add or method for complex filters
      order: (column: string, options?: any) => mockQuery,
      limit: (count: number) => mockQuery,
      range: (from: number, to: number) => mockQuery,
      single: async () => ({ data: null, error: { code: 'PGRST116', message: 'No data' } }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: async (resolve: any) => resolve({ data: [], error: null }),
      insert: (data: any) => mockQuery, // Return mockQuery for chaining
      update: (data: any) => mockQuery, // Return mockQuery for chaining
      upsert: (data: any, options?: any) => mockQuery, // Return mockQuery for chaining
      delete: () => mockQuery, // Return mockQuery for chaining
    };
    return mockQuery;
  },
  rpc: async (functionName: string, params?: any) => ({
    data: null,
    error: { message: `Mock RPC call to ${functionName} - not implemented` },
  }),
  storage: {
    from: (bucket: string) => ({
      upload: async () => ({ data: null, error: null }),
      remove: async () => ({ data: null, error: null }),
      createSignedUrl: async () => ({
        data: { signedUrl: 'mock-signed-url' },
        error: null,
      }),
    }),
  },
  functions: {
    invoke: async () => ({ data: null, error: null }),
  },
  channel: (name: string) => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
  }),
};
