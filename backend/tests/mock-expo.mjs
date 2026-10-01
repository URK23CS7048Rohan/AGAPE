// Stands in for Expo's push service during CI: records every push it receives.
import http from "node:http";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/pushes.jsonl";
http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    fs.appendFileSync(out, b.replace(/\n/g, " ") + "\n");
    let n = 1; try { n = JSON.parse(b).length || 1; } catch {}
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: Array.from({ length: n }, () => ({ status: "ok", id: "x" })) }));
  });
}).listen(9999, "0.0.0.0", () => console.log("mock expo push on :9999"));
