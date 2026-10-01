// Metro config: identical to Expo's default, except that on WEB the two
// native-only modules (Google Maps and WebView) are swapped for small stand-ins,
// so the app can also run in a browser (used for the screenshot workflow).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const WEB_STUBS = {
  "react-native-maps": path.resolve(__dirname, "web-stubs/maps.js"),
  "react-native-webview": path.resolve(__dirname, "web-stubs/webview.js"),
};
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_STUBS[moduleName]) return { type: "sourceFile", filePath: WEB_STUBS[moduleName] };
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
