/**
 * Tests for secureLogger utility
 *
 * sanitizeString and sanitizeObject are not exported, so they are tested
 * indirectly through the exported logger functions by inspecting console output.
 */

// __DEV__ must be declared before the module is imported
declare const __DEV__: boolean;
(globalThis as any).__DEV__ = true;

import {
  debug,
  info,
  warn,
  error,
  logError,
  createLogger,
  configureLogger,
  LogLevel,
} from '../../src/utils/secureLogger';

// ---- helpers ----

let logSpy: jest.SpyInstance;
let infoSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  // Reset to permissive config so every level is logged
  configureLogger({
    minLevel: LogLevel.DEBUG,
    enableInProduction: false,
    enableSanitization: true,
    enableStackTrace: false,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Return all non-prefix args passed to the given spy, flattened into a string. */
function spyPayload(spy: jest.SpyInstance): string {
  // Each call: [prefix, ...sanitizedArgs]
  return spy.mock.calls
    .map((args: any[]) =>
      args
        .slice(1)
        .map((a: any) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
        .join(' ')
    )
    .join(' ');
}

// ====================================================================
// 1. String sanitization (tested via info() output)
// ====================================================================

describe('sanitizeString (via logger output)', () => {
  it('redacts email addresses', () => {
    info('Contact user@example.com for details');
    const output = spyPayload(infoSpy);
    expect(output).toContain('[EMAIL_REDACTED]');
    expect(output).not.toContain('user@example.com');
  });

  it('redacts phone numbers — international format +1-555-123-4567', () => {
    info('Call me at +1-555-123-4567');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('555-123-4567');
    expect(output).toContain('[PHONE_REDACTED]');
  });

  it('redacts phone numbers — parenthesised area code (555) 123-4567', () => {
    info('Phone: (555) 123-4567');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('123-4567');
  });

  it('redacts UUIDs', () => {
    info('User b853df7d-19db-4212-8fdf-8696bc72a167 logged in');
    const output = spyPayload(infoSpy);
    expect(output).toContain('[UUID_REDACTED]');
    expect(output).not.toContain('b853df7d-19db-4212-8fdf-8696bc72a167');
  });

  it('redacts JWT tokens', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    info(`Token: ${jwt}`);
    const output = spyPayload(infoSpy);
    expect(output).toContain('[TOKEN_REDACTED]');
    expect(output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('redacts credit card numbers (digits do not survive)', () => {
    // The phone regex fires before the credit card regex and consumes digit
    // groups, so the card number is still fully redacted — just by the phone
    // pattern rather than the card pattern.
    info('Card: 4111 1111 1111 1111');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('4111 1111 1111 1111');
    expect(output).not.toContain('1111 1111');
  });

  it('redacts credit card numbers with dashes (digits do not survive)', () => {
    info('Card: 4111-1111-1111-1111');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('4111-1111-1111-1111');
  });

  it('redacts SSN-formatted strings', () => {
    // Note: the phone regex may also match digits, but the SSN digits must not survive.
    info('SSN: 123-45-6789');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('123-45-6789');
  });

  it('passes through strings with no sensitive data', () => {
    info('Hello world — nothing secret here');
    const output = spyPayload(infoSpy);
    expect(output).toContain('Hello world');
    expect(output).not.toContain('REDACTED');
  });
});

// ====================================================================
// 2. Object / recursive sanitization (tested via info() output)
// ====================================================================

describe('sanitizeObject (via logger output)', () => {
  it('redacts sensitive field names (password, token, secret)', () => {
    info({ password: 'hunter2', token: 'abc123', secret: 'shh' });
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('abc123');
    expect(output).not.toContain('shh');
  });

  it('redacts authorization / accessToken / refreshToken fields', () => {
    info({ accessToken: 'tok_live_xxx', refreshToken: 'tok_refresh_xxx' });
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('tok_live_xxx');
    expect(output).not.toContain('tok_refresh_xxx');
  });

  it('recursively sanitizes nested objects', () => {
    info({ user: { email: 'a@b.com', profile: { ssn: '111-22-3333' } } });
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('a@b.com');
    expect(output).not.toContain('111-22-3333');
  });

  it('sanitizes strings inside arrays', () => {
    info({ emails: ['foo@bar.com', 'baz@qux.com'] });
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('foo@bar.com');
    expect(output).not.toContain('baz@qux.com');
  });

  it('handles depth limit gracefully', () => {
    // Build an object nested 12 levels deep (limit is 10)
    let obj: any = { value: 'secret@email.com' };
    for (let i = 0; i < 12; i++) {
      obj = { nested: obj };
    }
    info(obj);
    const output = spyPayload(infoSpy);
    expect(output).toContain('[MAX_DEPTH_REACHED]');
  });

  it('handles null and undefined values', () => {
    info({ a: null, b: undefined });
    // Should not throw
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves non-sensitive primitive values', () => {
    info({ count: 42, active: true, name: 'Bridge' });
    const output = spyPayload(infoSpy);
    expect(output).toContain('42');
    expect(output).toContain('true');
    expect(output).toContain('Bridge');
  });
});

// ====================================================================
// 3. Error instance handling
// ====================================================================

describe('Error instance handling', () => {
  it('sanitizes error messages containing sensitive data', () => {
    const err = new Error('Failed for user@example.com');
    info(err);
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('user@example.com');
    expect(output).toContain('[EMAIL_REDACTED]');
  });

  it('logError logs error message at ERROR level', () => {
    const err = new Error('something broke');
    logError(err, 'TestContext');
    expect(errorSpy).toHaveBeenCalled();
    const output = spyPayload(errorSpy);
    expect(output).toContain('TestContext');
    expect(output).toContain('something broke');
  });

  it('logError sanitizes error message', () => {
    const err = new Error('Bad token eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoxfQ.sig123');
    logError(err);
    const output = spyPayload(errorSpy);
    expect(output).toContain('[TOKEN_REDACTED]');
  });
});

// ====================================================================
// 4. createLogger — namespaced logger
// ====================================================================

describe('createLogger', () => {
  it('returns an object with debug, info, warn, error methods', () => {
    const logger = createLogger('MyModule');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.logError).toBe('function');
  });

  it('includes the namespace in debug output', () => {
    const logger = createLogger('AuthService');
    logger.debug('init complete');
    const output = spyPayload(logSpy);
    expect(output).toContain('[AuthService]');
    expect(output).toContain('init complete');
  });

  it('includes the namespace in info output', () => {
    const logger = createLogger('Matching');
    logger.info('proposal created');
    const output = spyPayload(infoSpy);
    expect(output).toContain('[Matching]');
  });

  it('includes the namespace in warn output', () => {
    const logger = createLogger('Matching');
    logger.warn('slow query');
    const output = spyPayload(warnSpy);
    expect(output).toContain('[Matching]');
  });

  it('includes the namespace in error output', () => {
    const logger = createLogger('Matching');
    logger.error('failure');
    const output = spyPayload(errorSpy);
    expect(output).toContain('[Matching]');
  });

  it('sanitizes data passed through namespaced logger', () => {
    const logger = createLogger('Test');
    logger.info('email is user@secret.org');
    const output = spyPayload(infoSpy);
    expect(output).not.toContain('user@secret.org');
    expect(output).toContain('[EMAIL_REDACTED]');
  });
});

// ====================================================================
// 5. Log level filtering
// ====================================================================

describe('Log level filtering', () => {
  it('suppresses debug and info when level is WARN', () => {
    configureLogger({ minLevel: LogLevel.WARN });

    debug('should not appear');
    info('should not appear either');
    warn('this should appear');
    error('this too');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('suppresses everything below ERROR when level is ERROR', () => {
    configureLogger({ minLevel: LogLevel.ERROR });

    debug('nope');
    info('nope');
    warn('nope');
    error('yes');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('suppresses all output when level is NONE', () => {
    configureLogger({ minLevel: LogLevel.NONE });

    debug('nope');
    info('nope');
    warn('nope');
    error('nope');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('allows all levels when set to DEBUG', () => {
    configureLogger({ minLevel: LogLevel.DEBUG });

    debug('d');
    info('i');
    warn('w');
    error('e');

    expect(logSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ====================================================================
// 6. Sanitization toggle
// ====================================================================

describe('Sanitization toggle', () => {
  it('does not redact when sanitization is disabled', () => {
    configureLogger({ enableSanitization: false });
    info('Contact user@example.com');
    const output = spyPayload(infoSpy);
    expect(output).toContain('user@example.com');
    expect(output).not.toContain('[EMAIL_REDACTED]');
  });
});

// ====================================================================
// 7. Log output format
// ====================================================================

describe('Log output format', () => {
  it('prefixes output with ISO timestamp and level tag', () => {
    info('hello');
    const prefix = infoSpy.mock.calls[0][0] as string;
    // Prefix pattern: "2024-01-01T00:00:00.000Z [INFO]"
    expect(prefix).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z \[INFO\]$/);
  });

  it('debug uses console.log with [DEBUG] prefix', () => {
    debug('test');
    const prefix = logSpy.mock.calls[0][0] as string;
    expect(prefix).toContain('[DEBUG]');
  });

  it('warn uses console.warn with [WARN] prefix', () => {
    warn('test');
    const prefix = warnSpy.mock.calls[0][0] as string;
    expect(prefix).toContain('[WARN]');
  });

  it('error uses console.error with [ERROR] prefix', () => {
    error('test');
    const prefix = errorSpy.mock.calls[0][0] as string;
    expect(prefix).toContain('[ERROR]');
  });
});
