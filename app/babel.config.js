module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo (SDK 54) automatically adds the Reanimated/Worklets plugin.
  return { presets: ["babel-preset-expo"] };
};
