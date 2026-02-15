/**
 * Community Service Index - Service Switcher
 *
 * This file provides a single export point for the community service.
 * It allows easy switching between mock and real backend implementations
 * via the feature flags configuration.
 *
 * Usage in components:
 *   import communityService from '@/services/communityServiceIndex';
 */

import { communityService as mockService } from './communityService';
import { communityBackendService as realService } from './communityBackendService';
import { FEATURES } from '../config/features';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityServiceIndex');

/**
 * Determine which service to use based on feature flags
 *
 * If FEATURES.COMMUNITY_BACKEND_ENABLED is true, use real backend.
 * Otherwise, use mock service for development/testing.
 */
const useMockService = !FEATURES.COMMUNITY_BACKEND_ENABLED;

// Log which service is being used
logger.info('[CommunityService] COMMUNITY_BACKEND_ENABLED:', FEATURES.COMMUNITY_BACKEND_ENABLED);
logger.info('[CommunityService] Using:', useMockService ? 'MOCK SERVICE' : 'REAL BACKEND');

/**
 * Export the appropriate service implementation
 */
export const communityService = useMockService ? mockService : realService;

/**
 * Export both services for direct access if needed
 */
export { mockService, realService };

/**
 * Default export
 */
export default communityService;
