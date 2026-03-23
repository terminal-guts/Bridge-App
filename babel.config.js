module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["babel-plugin-react-compiler", { compilationMode: "infer" }],
      "nativewind/babel",
    ],
  };
};
