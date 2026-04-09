/**
 * Lazy Sentry wrapper — defers loading @sentry/react-native (~610KB) until
 * after the first frame renders, so it doesn't block startup.
 *
 * Exports:
 *   - initSentry()  — call once after first frame to load + initialize the SDK
 *   - Sentry        — proxy object; captureException() queues until SDK is ready
 */

type SentryLike = {
  init: (options: any) => void;
  captureException: (error: any, context?: any) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
};

let realSentry: SentryLike | null = null;
const pendingExceptions: Array<[any, any?]> = [];

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export async function initSentry() {
  if (!SENTRY_DSN) return;

  const mod = await import('@sentry/react-native');
  realSentry = mod;

  mod.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    enabled: !__DEV__,
  });

  // Flush any exceptions captured before SDK was ready
  for (const [error, context] of pendingExceptions) {
    mod.captureException(error, context);
  }
  pendingExceptions.length = 0;
}

/**
 * Proxy that works before and after the SDK loads.
 * Before: queues captureException calls.
 * After: forwards directly to the real SDK.
 */
export const Sentry: SentryLike = {
  init: () => {}, // no-op — use initSentry() instead
  captureException: (error: any, context?: any) => {
    if (realSentry) {
      realSentry.captureException(error, context);
    } else {
      pendingExceptions.push([error, context]);
    }
  },
  setUser: (user: { id: string; email?: string } | null) => {
    if (realSentry && 'setUser' in realSentry) {
      (realSentry as any).setUser(user);
    }
  },
};
