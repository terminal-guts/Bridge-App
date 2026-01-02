/**
 * Pricing Service
 *
 * Handles fetching current pricing data for match payments.
 * Includes real-time price updates and market open/close status.
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, PricingData } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createLogger } from '../utils/secureLogger';

// Create namespaced logger for this service
const logger = createLogger('PricingService');

/**
 * Calculate if market is currently open (8 PM - 8 PM next day)
 */
const isMarketOpen = (): boolean => {
  const now = new Date();
  const currentHour = now.getHours();

  // Market is open from 8 PM (20:00) onwards
  // Note: To implement a true 24-hour window from 8PM-8PM,
  // you would need to track when the market opened in the database
  return currentHour >= 20;
};

/**
 * Calculate time until next price update
 * Prices update daily at a specific time (e.g., 6 PM)
 */
const calculateNextUpdateTime = (): string => {
  const now = new Date();
  const updateHour = 18; // 6 PM price updates

  const nextUpdate = new Date(now);
  nextUpdate.setHours(updateHour, 0, 0, 0);

  // If we're past today's update time, set to tomorrow
  if (now.getHours() >= updateHour) {
    nextUpdate.setDate(nextUpdate.getDate() + 1);
  }

  const diff = nextUpdate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

/**
 * Get current pricing for both genders
 */
export const getCurrentPricing = async (): Promise<ApiResponse<PricingData>> => {
  try {
    const { data: pricing, error } = await supabase
      .from('pricing')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'PRICING_FETCH_FAILED',
          message: error.message,
        },
      };
    }

    if (!pricing || pricing.length === 0) {
      // Return default pricing if none exists
      return {
        ok: true,
        data: {
          malePrice: 12.50,
          femalePrice: 10.00,
          lastUpdated: new Date().toISOString(),
          marketOpen: isMarketOpen(),
          nextUpdateIn: calculateNextUpdateTime(),
        },
      };
    }

    const malePricing = pricing.find(p => p.gender === 'male');
    const femalePricing = pricing.find(p => p.gender === 'female');

    return {
      ok: true,
      data: {
        malePrice: malePricing?.price_usd || 12.50,
        femalePrice: femalePricing?.price_usd || 10.00,
        lastUpdated: malePricing?.updated_at || new Date().toISOString(),
        marketOpen: isMarketOpen(),
        nextUpdateIn: calculateNextUpdateTime(),
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'PRICING_FETCH_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

/**
 * Subscribe to real-time pricing updates
 * Returns a cleanup function to unsubscribe
 */
export const subscribeToPricingUpdates = (
  onPriceUpdate: (pricing: PricingData) => void
): (() => void) => {
  const channel: RealtimeChannel = supabase
    .channel('pricing_updates')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'pricing',
      },
      async (payload) => {
        logger.debug('Pricing update received:', payload);

        // Fetch fresh pricing data
        const result = await getCurrentPricing();
        if (result.ok && result.data) {
          onPriceUpdate(result.data);
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    channel.unsubscribe();
  };
};

/**
 * Get pricing history for charts/analytics (optional enhancement)
 */
export const getPricingHistory = async (
  gender: 'male' | 'female',
  days: number = 7
): Promise<ApiResponse<Array<{ date: string; price: number }>>> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('pricing')
      .select('price_usd, updated_at')
      .eq('gender', gender)
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      return {
        ok: false,
        error: {
          code: 'HISTORY_FETCH_FAILED',
          message: error.message,
        },
      };
    }

    const history = (data || []).map(item => ({
      date: item.updated_at,
      price: item.price_usd,
    }));

    return {
      ok: true,
      data: history,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'HISTORY_FETCH_ERROR',
        message: error.message || 'Failed to fetch pricing history',
      },
    };
  }
};
