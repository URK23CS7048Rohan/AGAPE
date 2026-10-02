// Copies the website's default content (website/assets/js/content.js) into the app,
// so the app shows exactly what the website shows until staff publish edits in /admin.
// Run after changing content.js:  node scripts/sync-site-defaults.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = path.resolve(__dirname, "../../website/assets/js/content.js");
const out = path.resolve(__dirname, "../src/data/site-defaults.json");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(src, "utf8"), sandbox);
const d = sandbox.window.AGAPE_DEFAULT;
if (!d) throw new Error("AGAPE_DEFAULT not found in content.js");
// The app doesn't use the website-only sections.
const { testimonies, gallery, ...app } = d;
fs.writeFileSync(out, JSON.stringify(app, null, 2) + "\n");
console.log("Wrote", path.relative(process.cwd(), out));
