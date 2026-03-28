module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // React Compiler: automatically memoizes components and hooks across the
      // entire codebase. Eliminates unnecessary re-renders without manual
      // useMemo/useCallback. Requires React 17+ (we use React 19).
      "babel-plugin-react-compiler",
      "nativewind/babel",
    ],
  };
};
