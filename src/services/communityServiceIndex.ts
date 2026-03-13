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

import { communityBackendService as realService } from './communityBackendService';
import { FEATURES } from '../config/features';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityServiceIndex');

/**
 * Determine which service to use based on feature flags.
 */
const useMockService = !FEATURES.COMMUNITY_BACKEND_ENABLED;

// Log which service is being used
logger.info('[CommunityService] COMMUNITY_BACKEND_ENABLED:', FEATURES.COMMUNITY_BACKEND_ENABLED);
logger.info('[CommunityService] Using:', useMockService ? 'MOCK SERVICE' : 'REAL BACKEND');

/**
 * Export the appropriate service implementation.
 * Mock service is dynamically imported only when needed to keep it out of the prod bundle.
 */
let communityServiceInstance: typeof realService;

if (useMockService) {
  // Dynamic import — mock service (1866 lines) only loads when flag is off
  const { communityService: mockService } = require('./communityService');
  communityServiceInstance = mockService;
} else {
  communityServiceInstance = realService;
}

export const communityService = communityServiceInstance;

/**
 * Default export
 */
export default communityService;
