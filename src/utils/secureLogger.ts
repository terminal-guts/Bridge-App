/**
 * Secure Logger Utility
 *
 * Provides safe logging with automatic sanitization of sensitive data.
 * Prevents accidental logging of PII, tokens, and other sensitive information.
 *
 * Features:
 * - Automatic redaction of sensitive patterns (emails, phones, tokens, IDs)
 * - Environment-aware (only logs in development)
 * - Multiple log levels (debug, info, warn, error)
 * - Structured logging support
 * - Drop-in replacement for console.log/warn/error
 */

declare const __DEV__: boolean;

/**
 * Log levels for filtering
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Sensitive data patterns to redact
 */
const SENSITIVE_PATTERNS = {
  // Phone numbers (various formats)
  phone: /(\+?1?[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // UUIDs (user IDs, session IDs, etc.)
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,

  // JWT tokens and API keys
  token: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  apiKey: /(?:api[_-]?key|token|secret|password)[\s:="']+([a-zA-Z0-9_-]{20,})/gi,

  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

/**
 * Fields that should always be redacted in objects
 */
const SENSITIVE_FIELD_NAMES = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'authToken',
  'auth_token',
  'jwt',
  'privateKey',
  'private_key',
  'ssn',
  'social_security',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
];

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableInProduction: boolean;
  enableSanitization: boolean;
  enableStackTrace: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR,
  enableInProduction: false,
  enableSanitization: true,
  enableStackTrace: __DEV__,
};

let currentConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
const configureLogger = (config: Partial<LoggerConfig>): void => {
  currentConfig = { ...currentConfig, ...config };
};

/**
 * Sanitize a string by redacting sensitive patterns
 */
const sanitizeString = (value: string): string => {
  let sanitized = value;

  // Apply all sensitive patterns
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.phone, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.uuid, '[UUID_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.token, '[TOKEN_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.apiKey, '$1[KEY_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.creditCard, '[CARD_REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.ssn, '[SSN_REDACTED]');

  return sanitized;
};

/**
 * Sanitize an object by redacting sensitive fields and patterns
 */
const sanitizeObject = (obj: unknown, depth = 0): unknown => {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Handle Error instances — their properties are non-enumerable so Object.entries returns []
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message || ''),
      ...(typeof (obj as Error & { code?: string }).code === 'string' ? { code: (obj as Error & { code?: string }).code } : {}),
    };
  }

  // Handle objects
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Check if field name is sensitive
    const lowerKey = key.toLowerCase();
    const isSensitiveField = SENSITIVE_FIELD_NAMES.some(
      sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitiveField) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize log arguments
 */
const sanitizeArgs = (args: unknown[]): unknown[] => {
  if (!currentConfig.enableSanitization) {
    return args;
  }

  return args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }
    return arg;
  });
};

/**
 * Check if logging is enabled for a given level
 */
const shouldLog = (level: LogLevel): boolean => {
  // Don't log in production unless explicitly enabled
  if (!__DEV__ && !currentConfig.enableInProduction) {
    return false;
  }

  // Check minimum log level
  return level >= currentConfig.minLevel;
};

/**
 * Format timestamp
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Get log level prefix
 */
const getLevelPrefix = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.DEBUG:
      return '[DEBUG]';
    case LogLevel.INFO:
      return '[INFO]';
    case LogLevel.WARN:
      return '[WARN]';
    case LogLevel.ERROR:
      return '[ERROR]';
    default:
      return '[LOG]';
  }
};

/**
 * Core logging function
 */
const log = (level: LogLevel, ...args: unknown[]): void => {
  if (!shouldLog(level)) {
    return;
  }

  const sanitizedArgs = sanitizeArgs(args);
  const prefix = `${getTimestamp()} ${getLevelPrefix(level)}`;

  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, ...sanitizedArgs);
      break;
    case LogLevel.WARN:
      console.warn(prefix, ...sanitizedArgs);
      break;
    case LogLevel.INFO:
      console.info(prefix, ...sanitizedArgs);
      break;
    case LogLevel.DEBUG:
    default:
      console.log(prefix, ...sanitizedArgs);
      break;
  }
};

/**
 * Debug level logging (lowest priority)
 * Use for detailed debugging information
 */
export const debug = (...args: unknown[]): void => {
  log(LogLevel.DEBUG, ...args);
};

/**
 * Info level logging
 * Use for general informational messages
 */
export const info = (...args: unknown[]): void => {
  log(LogLevel.INFO, ...args);
};

/**
 * Warning level logging
 * Use for warning messages that aren't errors
 */
export const warn = (...args: unknown[]): void => {
  log(LogLevel.WARN, ...args);
};

/**
 * Error level logging (highest priority)
 * Use for error messages
 */
export const error = (...args: unknown[]): void => {
  log(LogLevel.ERROR, ...args);
};

/**
 * Log an error with stack trace
 */
export const logError = (error: Error, context?: string): void => {
  const message = context ? `${context}: ${error.message}` : error.message;

  if (currentConfig.enableStackTrace && error.stack) {
    log(LogLevel.ERROR, message, '\n', sanitizeString(error.stack));
  } else {
    log(LogLevel.ERROR, message);
  }
};

/**
 * Log structured data (useful for analytics/monitoring)
 */
const logStructured = (
  level: LogLevel,
  event: string,
  data?: Record<string, unknown>
): void => {
  const structuredLog = {
    timestamp: getTimestamp(),
    event,
    ...(data && { data }),
  };

  log(level, JSON.stringify(structuredLog, null, 2));
};

/**
 * Create a namespaced logger for a specific module
 */
export const createLogger = (namespace: string) => {
  return {
    debug: (...args: unknown[]) => debug(`[${namespace}]`, ...args),
    info: (...args: unknown[]) => info(`[${namespace}]`, ...args),
    warn: (...args: unknown[]) => warn(`[${namespace}]`, ...args),
    error: (...args: unknown[]) => error(`[${namespace}]`, ...args),
    logError: (err: Error, context?: string) => logError(err, `[${namespace}]${context ? ' ' + context : ''}`),
  };
};

