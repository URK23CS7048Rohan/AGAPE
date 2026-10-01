import React from "react";
import { WebView } from "react-native-webview";
import { CHURCH } from "@/data/mock";

/** YouTube's embedded player needs a web origin/referrer; loading it inside a small HTML page with a baseUrl provides one. */
export function YouTube({ embed }: { embed: string }) {
  const origin = CHURCH.webOrigin;
  const src = `${embed}${embed.includes("?") ? "&" : "?"}enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  return (
    <WebView
      source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`, baseUrl: origin }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      style={{ flex: 1, backgroundColor: "#000" }}
    />
  );
}
