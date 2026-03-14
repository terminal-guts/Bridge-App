/**
 * Community Service Index
 *
 * Single export point for the community service.
 * Uses the real Supabase backend directly.
 *
 * Usage in components:
 *   import communityService from '@/services/communityServiceIndex';
 */

import { communityBackendService } from './communityBackendService';

export const communityService = communityBackendService;
export default communityService;
