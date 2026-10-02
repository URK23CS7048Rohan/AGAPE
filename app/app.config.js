// Fills secrets into app.json at build time, so keys never live in the repo.
//   GOOGLE_MAPS_ANDROID_KEY  → the ride map on Android (Google Cloud → Maps SDK for Android)
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (key && config.android?.config?.googleMaps) config.android.config.googleMaps.apiKey = key;
  return config;
};
