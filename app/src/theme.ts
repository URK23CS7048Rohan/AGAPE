// Agape design tokens — shared with the website.
// Agape design tokens. Flat colour blocks, bold type and playful stickers.
// The brand flame matches the website; the rest is a bright, friendly palette.
export const C = {
  // neutrals
  ink: "#141414",
  ink2: "#1E1E20",
  ink3: "#2B2B2E",
  bg: "#F6F4EF",
  card: "#FFFFFF",
  line: "#E6E2DA",
  white: "#FFFFFF",
  muted: "rgba(20,20,20,0.55)",
  faint: "rgba(20,20,20,0.08)",
  // legacy aliases (kept so older data keeps working)
  cream: "#F6F4EF",
  paper: "#FFFFFF",
  creamMuted: "rgba(255,255,255,0.7)",
  // brights
  flame: "#FF5A1F",
  brand: "#FF5A1F",
  brandDeep: "#D9430F",
  sun: "#FFD23F",
  gold: "#FFD23F",
  rose: "#FF7AB6",
  violet: "#9B7BFF",
  mint: "#3C8D5E",
  sky: "#8FA4FF",
  orange: "#FFB547",
  red: "#F2493A",
  // soft tints
  lilac: "#ECE5FF",
  peach: "#FFE4D8",
  mintSoft: "#DCEFE2",
  sunSoft: "#FFF2C2",
  skySoft: "#E3E8FF",
  roseSoft: "#FFE3F0",
  orangeSoft: "#FFEBCB",
  deepViolet: "#2A1E55",
};

/** Picks ink or white text for a solid background, by contrast. */
export function onColor(hex: string) {
  const h = (hex || "#000").replace("#", "");
  if (h.length !== 6 && h.length !== 3) return C.ink;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(full, 16);
  const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
  return (L + 0.05) / 0.056 >= 1.05 / (L + 0.05) ? C.ink : "#FFFFFF";
}

export const F = {
  display: "Bricolage-Bold",
  poster: "Bricolage-ExtraBoldCondensed",
  displayBold: "Bricolage-Bold",
  displaySemi: "Bricolage-SemiBold",
  serif: "InstrumentSerif-Regular",
  serifItalic: "InstrumentSerif-Italic",
  sans: "Geist-Regular",
  sansMedium: "Geist-Medium",
  sansSemi: "Geist-SemiBold",
  sansBold: "Geist-Bold",
  mono: "GeistMono-Medium",
};

export const R = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 };

export const fontMap = {
  [F.poster]: require("../assets/fonts/Bricolage-ExtraBoldCondensed.ttf"),
  [F.displayBold]: require("../assets/fonts/Bricolage-Bold.ttf"),
  [F.displaySemi]: require("../assets/fonts/Bricolage-SemiBold.ttf"),
  [F.serif]: require("../assets/fonts/InstrumentSerif-Regular.ttf"),
  [F.serifItalic]: require("../assets/fonts/InstrumentSerif-Italic.ttf"),
  [F.sans]: require("../assets/fonts/Geist-Regular.ttf"),
  [F.sansMedium]: require("../assets/fonts/Geist-Medium.ttf"),
  [F.sansSemi]: require("../assets/fonts/Geist-SemiBold.ttf"),
  [F.sansBold]: require("../assets/fonts/Geist-Bold.ttf"),
  [F.mono]: require("../assets/fonts/GeistMono-Medium.ttf"),
};

export const IMG = {
  worshipPink: require("../assets/images/worship-pink.jpg"),
  worshipTeal: require("../assets/images/worship-teal.jpg"),
  worshipOrange: require("../assets/images/worship-orange.jpg"),
  threeFriends: require("../assets/images/three-friends.jpg"),
  bibleCoffee: require("../assets/images/bible-coffee.jpg"),
  bricks: require("../assets/images/bricks.jpg"),
  campfire: require("../assets/images/campfire.jpg"),
  phoneHand: require("../assets/images/phone-hand.jpg"),
  mugBible: require("../assets/images/mug-bible.jpg"),
  crossMountain: require("../assets/images/cross-mountain.jpg"),
  womanForest: require("../assets/images/woman-forest.jpg"),
  cityNight: require("../assets/images/city-night.jpg"),
  handSunset: require("../assets/images/hand-sunset.jpg"),
  dove: require("../assets/images/dove.jpg"),
  mountainPeaks: require("../assets/images/mountain-peaks.jpg"),
  openArms: require("../assets/images/mountain-open-arms.jpg"),
  alps: require("../assets/images/alps.jpg"),
  handsTogether: require("../assets/images/hands-together.jpg"),
  womenLaughing: require("../assets/images/women-laughing.jpg"),
  manReading: require("../assets/images/man-reading.jpg"),
  kidsPlay: require("../assets/images/kids-play.jpg"),
  microphone: require("../assets/images/microphone.jpg"),
  teamMeeting: require("../assets/images/team-meeting.jpg"),
  friendsTeal: require("../assets/images/friends-teal.jpg"),
  candleHands: require("../assets/images/candle-hands.jpg"),
  crossDusk: require("../assets/images/cross-dusk.jpg"),
  womanPraying: require("../assets/images/woman-praying.jpg"),
  concertLights: require("../assets/images/concert-lights.jpg"),
  neonCross: require("../assets/images/neon-cross.jpg"),
  bibleDark: require("../assets/images/bible-dark.jpg"),
  sunrise: require("../assets/images/sunrise-silhouettes.jpg"),
  girlPraying: require("../assets/images/girl-praying-light.jpg"),
  handsStack: require("../assets/images/hands-stack.jpg"),
  chapel: require("../assets/images/white-chapel.jpg"),
  // Agape International Ministries — real photos
  homeWorship: require("../assets/images/agape-home-worship.jpg"),
  familyDay: require("../assets/images/agape-family-day.jpg"),
  squadBand: require("../assets/images/agape-squad-band.jpg"),
  squadHealer: require("../assets/images/agape-squad-healer.jpg"),
  families: require("../assets/images/agape-families.jpg"),
  institute: require("../assets/images/agape-institute.jpg"),
  kidsHearts: require("../assets/images/agape-kids-hearts.jpg"),
  kidsChurch: require("../assets/images/agape-kids-church.jpg"),
  prayerWorship: require("../assets/images/agape-prayer-worship.jpg"),
  logoMark: require("../assets/images/logo-mark.png"),
  logoMarkLight: require("../assets/images/logo-mark-light.png"),
  logoFull: require("../assets/images/logo-full.png"),
};

export const shadow = (y = 18, blur = 30, opacity = 0.18, color = "#1a0a14") => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation: Math.round(y / 2),
});
