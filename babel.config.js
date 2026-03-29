module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // React Compiler disabled — it breaks Reanimated worklets by auto-memoizing
      // useAnimatedStyle callbacks, causing "Cannot read property 'props' of undefined"
      // crashes when animated views unmount. Can revisit after Reanimated v4 adds
      // official React Compiler support.
      "nativewind/babel",
    ],
  };
};
