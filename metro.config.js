const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// lucide-react-native v0.575 sets its `react-native` entry to the ESM build,
// which Metro cannot process (ESM re-exports of individual icon files fail).
// Force Metro to use the CJS build instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "lucide-react-native") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/lucide-react-native/dist/cjs/lucide-react-native.js"
      ),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
