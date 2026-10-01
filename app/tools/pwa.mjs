// Turns the exported web build into an installable app ("Add to Home Screen" on iPhone, "Install app" on Android).
// Usage: node tools/pwa.mjs dist-web /app      (second argument = the folder the app is served from, "" for the root)
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
const dir = process.argv[2] || "dist-web";
const base = (process.argv[3] || "").replace(/\/$/, "");
const head = `
<link rel="manifest" href="${base}/manifest.webmanifest">
<link rel="apple-touch-icon" href="${base}/icon-180.png">
<meta name="theme-color" content="#0F0B12">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Agape">
<script>if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("${base}/sw.js",{scope:"${base}/"}).catch(function(){})});</script>
`;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : f.endsWith(".html") ? [p] : []; });
let n = 0;
for (const f of walk(dir)) {
  let h = readFileSync(f, "utf8");
  if (h.includes('rel="manifest"')) continue;
  h = h.replace("</head>", head + "</head>");
  h = h.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,shrink-to-fit=no">');
  writeFileSync(f, h); n++;
}
console.log(`PWA tags added to ${n} page(s) in ${dir} (base "${base || "/"}")`);
