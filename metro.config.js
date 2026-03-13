const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Inline requires: delays module evaluation until first use.
// Instead of evaluating all require()'d modules at bundle load time,
// each require() is deferred until the returned value is first accessed.
// This significantly reduces startup time by spreading module evaluation
// across the app lifecycle instead of paying it all upfront.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Stub out web-only Sentry modules that ship in @sentry/react-native but are
// never used on iOS. Saves ~475KB from the JS bundle.
const SENTRY_WEB_STUBS = [
  "@sentry-internal/replay",
  "@sentry-internal/feedback",
  "@sentry-internal/browser-utils",
  "@sentry/browser",
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && SENTRY_WEB_STUBS.some(stub => moduleName === stub || moduleName.startsWith(stub + "/"))) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
