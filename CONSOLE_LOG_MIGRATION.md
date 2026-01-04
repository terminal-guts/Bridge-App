# Console.log Migration to secureLogger

## Overview

Replace all `console.log`, `console.warn`, `console.error` calls with the secure logger utility to prevent accidental logging of sensitive data in production.

## Current State

**Total console.* calls**: 284 occurrences across the codebase

**secureLogger Features**:
- ✅ Automatic PII redaction (emails, phones, UUIDs, tokens)
- ✅ Environment-aware (dev-only by default)
- ✅ Multiple log levels (debug, info, warn, error)
- ✅ Structured logging support
- ✅ Namespaced loggers for modules
- ✅ Stack trace support for errors

## Migration Patterns

### Pattern 1: Simple console.log → debug

**Before:**
```typescript
console.log('User profile loaded:', profile);
```

**After:**
```typescript
import { debug } from '@/utils/secureLogger';

debug('User profile loaded:', profile);
```

### Pattern 2: console.warn → warn

**Before:**
```typescript
console.warn('Failed to load profile photo:', error);
```

**After:**
```typescript
import { warn } from '@/utils/secureLogger';

warn('Failed to load profile photo:', error);
```

### Pattern 3: console.error → error

**Before:**
```typescript
console.error('API request failed:', error);
```

**After:**
```typescript
import { error } from '@/utils/secureLogger';

error('API request failed:', error);
```

### Pattern 4: Error with stack trace → logError

**Before:**
```typescript
console.error('Error in authentication:', err);
console.error(err.stack);
```

**After:**
```typescript
import { logError } from '@/utils/secureLogger';

logError(err, 'Error in authentication');
```

### Pattern 5: Module-specific logger (RECOMMENDED)

**Before:**
```typescript
console.log('[ProfileService] Fetching profile...');
console.error('[ProfileService] Failed to fetch:', error);
```

**After:**
```typescript
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProfileService');

logger.debug('Fetching profile...');
logger.error('Failed to fetch:', error);
```

## Priority Files for Migration

### Critical (Security-Sensitive) - HIGH PRIORITY
These files may log sensitive user data:

1. **Services** (10 files)
   - `src/services/authService.ts` - Auth tokens, passwords
   - `src/services/profileService.ts` - User PII
   - `src/services/matchService.ts` - Match data
   - `src/services/friendService.ts` - Friend data
   - `src/services/photoService.ts` - Photo URLs
   - `src/services/accountService.ts` - Account info
   - `src/services/dashboardService.ts` - Dashboard data
   - `src/services/blockService.ts` - Block data
   - `src/services/pricingService.ts` - Payment info
   - `src/services/developmentDataService.ts` - Dev data

### Important (User-Facing) - MEDIUM PRIORITY
These screens handle user interactions:

2. **Main Screens** (5 files)
   - `src/screens/main/ProfileScreen.tsx`
   - `src/screens/main/CommunityScreen.tsx`
   - `src/screens/main/LoveScreen.tsx`
   - `src/screens/main/DeepQuestionsScreen.tsx`
   - `src/screens/ChatScreen.tsx`

3. **Match & Proposal Screens** (3 files)
   - `src/screens/match/MatchProposalScreen.tsx`
   - `src/screens/match/MatchRevealScreen.tsx`
   - `src/screens/match/MatchDetailScreen.tsx`

### Standard (General Code) - LOW PRIORITY
4. **Components** (50+ files)
   - UI components
   - Community components
   - Profile components

5. **Utilities & Hooks** (20+ files)
   - Custom hooks
   - Utility functions
   - Context providers

## Example Migrations

### Example 1: ProfileScreen.tsx

**Before:**
```typescript
console.error('Failed to load profile data:', error);
console.warn('Failed to load profile photo:', e.nativeEvent.error);
```

**After:**
```typescript
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProfileScreen');

logger.error('Failed to load profile data:', error);
logger.warn('Failed to load profile photo:', e.nativeEvent.error);
```

### Example 2: authService.ts

**Before:**
```typescript
console.log('Phone verification successful:', result);
console.error('Authentication failed:', error);
```

**After:**
```typescript
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('AuthService');

logger.info('Phone verification successful'); // Don't log result - may contain token
logger.error('Authentication failed:', error); // Automatically redacts sensitive data
```

### Example 3: matchService.ts

**Before:**
```typescript
console.log('Match created:', match);
console.error('Failed to create match:', error.message);
```

**After:**
```typescript
import { createLogger, logError } from '@/utils/secureLogger';

const logger = createLogger('MatchService');

logger.debug('Match created:', match); // Automatically redacts UUIDs
logError(error, 'Failed to create match'); // Includes stack trace in dev
```

## Automated Migration Script

You can use this regex find/replace pattern in your editor:

### Find (Regex):
```regex
console\.(log|warn|error|info)\(
```

### Replace With:
```
logger.$1(
```

**Then add import:**
```typescript
import { createLogger } from '@/utils/secureLogger';
const logger = createLogger('ModuleName');
```

## Security Benefits

### Before (console.log):
```typescript
console.log('User logged in:', {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  phone: '+1-555-123-4567',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});
```

**Logs in production**: All sensitive data exposed!

### After (secureLogger):
```typescript
logger.debug('User logged in:', {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  phone: '+1-555-123-4567',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});
```

**Production**: No logs (dev-only by default)
**Development logs**:
```
2025-01-03T10:30:00.000Z [DEBUG] [ModuleName] User logged in: {
  userId: '[UUID_REDACTED]',
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  token: '[TOKEN_REDACTED]'
}
```

## Configuration

secureLogger can be configured:

```typescript
import { configureLogger, LogLevel } from '@/utils/secureLogger';

// Enable logging in production for errors only
configureLogger({
  minLevel: LogLevel.ERROR,
  enableInProduction: true,
  enableSanitization: true,
});

// Disable sanitization for debugging (dev only)
configureLogger({
  enableSanitization: false, // Use with caution!
});
```

## Migration Status

### ✅ Already Using secureLogger (6 files):
- src/services/photoService.ts
- src/services/dashboardService.ts
- src/services/accountService.ts
- src/services/blockService.ts
- src/services/pricingService.ts
- src/utils/index.ts

### 🔄 Examples Migrated (Demonstration):
- src/screens/main/ProfileScreen.tsx (partial)
- [Add more as migrated]

### ⏳ Remaining (278 files/instances):
See "Priority Files for Migration" section above

## Best Practices

### DO:
✅ Use module-specific loggers: `createLogger('ModuleName')`
✅ Use appropriate log levels:
  - `debug()` - Detailed debugging info
  - `info()` - General informational messages
  - `warn()` - Warnings that aren't errors
  - `error()` - Error messages
✅ Use `logError(err, context)` for exceptions with stack traces
✅ Assume all data might be sensitive - let sanitizer handle it

### DON'T:
❌ Use console.log directly
❌ Manually redact data (logger does it automatically)
❌ Log in production unless necessary
❌ Disable sanitization in production
❌ Log full request/response bodies without review

## Testing

After migration, verify:

1. **Development**: Logs appear with timestamps and redactions
```bash
2025-01-03T10:30:00.000Z [DEBUG] [ProfileService] User profile loaded
```

2. **Production**: No logs unless error level
```bash
# Should be silent or errors only
```

3. **Sensitive Data Redacted**:
```typescript
logger.debug('Test:', {
  email: 'test@example.com',  // Should show [EMAIL_REDACTED]
  token: 'eyJhbG...',          // Should show [TOKEN_REDACTED]
});
```

## Rollout Plan

### Phase 1: Critical Services (Week 1)
- Migrate all service files (10 files)
- Priority: Auth, Profile, Match, Payment services

### Phase 2: Main Screens (Week 2)
- Migrate primary user-facing screens (10 files)
- Priority: Profile, Community, Match screens

### Phase 3: Components (Week 3-4)
- Migrate components incrementally
- Can be done file-by-file as touched

### Phase 4: Utilities & Misc (Ongoing)
- Migrate remaining files as encountered
- Low priority, handle opportunistically

## Monitoring

After full migration, you can:

1. **Add Analytics Integration**:
```typescript
import { logStructured, LogLevel } from '@/utils/secureLogger';

logStructured(LogLevel.INFO, 'user_action', {
  action: 'profile_viewed',
  userId: userId, // Will be redacted
});
```

2. **Add Error Reporting**:
```typescript
import { logError } from '@/utils/secureLogger';

try {
  // risky operation
} catch (error) {
  logError(error as Error, 'Context');
  // Also send to Sentry/Crashlytics if desired
}
```

## Summary

**Goal**: Replace all 284 console.* calls with secureLogger
**Benefit**: Prevent accidental PII leaks in production
**Approach**: Prioritize sensitive files, then incremental migration
**Status**: 6/284 files already use secureLogger (2%)
**Next Steps**: Migrate service files and main screens first

For questions or issues with migration, refer to `src/utils/secureLogger.ts` implementation.
