// Reads app.json and lets CI build the web app for a sub-folder (e.g. EXPO_BASE_URL=/app for agape.church/app).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
