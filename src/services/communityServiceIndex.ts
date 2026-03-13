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

const useMockService = !FEATURES.COMMUNITY_BACKEND_ENABLED;

logger.info('[CommunityService] COMMUNITY_BACKEND_ENABLED:', FEATURES.COMMUNITY_BACKEND_ENABLED);
logger.info('[CommunityService] Using:', useMockService ? 'MOCK SERVICE' : 'REAL BACKEND');

/**
 * In production builds (__DEV__ === false), only the real service is bundled.
 * The mock service (1866 lines) is excluded from the JS bundle entirely.
 * In dev builds, the feature flag controls which service is used.
 */
let communityServiceInstance: typeof realService;

if (__DEV__ && useMockService) {
  const { communityService: mockService } = require('./communityService');
  communityServiceInstance = mockService;
} else {
  communityServiceInstance = realService;
}

export const communityService = communityServiceInstance;
export default communityService;
