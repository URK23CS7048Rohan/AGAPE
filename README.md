# Agape International Ministries: website, app and backend

One backend (Supabase) serves two front-ends:

```
agape/
├── website/            Static marketing + member site (HTML/CSS/JS, GSAP motion). Deploy to Cloudflare Pages.
│   ├── index.html      ← built page (edit src/index.src.html, then run tools/build.py)
│   ├── assets/         css, js (main.js + vendored GSAP), fonts, img
│   └── dist/agape-website-preview.html   single-file preview (everything inlined)
├── app/                Native iOS + Android app (Expo SDK 54 · React Native · expo-router · Reanimated 4)
└── backend/supabase/   schema.sql (tables + RLS + realtime), seed.sql, functions/ask-agape (AI)
```

## Brand & media
* Colours: the vibrant palette of flame `#FF5A1F`, sun `#FFC23D`, rose, violet and mint. The two primaries are `--brand` and `--gold` in `website/assets/css/style.css`, and `C.flame` and `C.sun` in `app/src/theme.ts`. Change them there to recolour everything.
* The logo is cut out in four variants in `assets/img/`: `logo-mark.png` and `logo-full.png` for light backgrounds, plus `-light` versions for dark ones. The app icon and splash screen are built from it.
* The church's own photos are the `agape-*.jpg` files. The remaining stock images are only used for atmosphere (sermon series art, giving campaigns, the Bible games and AI demos).
* YouTube: channel **Agape International Media** (`UCjly5vzmBLYGHaj-H4jefng`). The website player and the app's Watch screen embed the channel's latest uploads (playlist `UU…`), and the live stream when the church is broadcasting. To pin one video in the app, set `EXPO_PUBLIC_YOUTUBE_VIDEO_ID`.

## Admin panel (`website/admin/`)
Staff manage everything from one place, without touching code:
* **All images:** every photo on the site, grouped by section. Click, drag or paste to replace a photo. Uploads are resized automatically.
* **Homepage hero:** headline, cycling words, intro text and the slideshow photos (drag to reorder).
* **Promotions, Events, Ministries, Giving campaigns, Testimonies:** add, edit, duplicate, reorder and delete, with photo and colour pickers.
* **Photo gallery:** drop in many photos at once, write captions on the cards, drag to reorder.
* **Watch & YouTube, Church info:** channel, player artwork, announcement bar, contact details, service times (these drive the live countdowns) and the counter numbers.
* **Community:** moderate the prayer wall (answered, hide, delete), manage ride requests and drivers, change member roles (member, volunteer, staff), and post announcements to the app.
* **Live preview:** see the real site update as you edit, in phone or desktop size. **Save & publish** (Ctrl/⌘+S) pushes the changes to the website, and the app picks them up live.

How it works: the site renders its sections from `assets/js/content.js` (the defaults) merged with the saved edits.
* **Demo mode** (no Supabase configured): edits are stored in the browser, which is handy for trying things out. Serve the folder (`npx serve website`), open `/admin`, and sign in with any email and password.
* **Live mode:** fill in `website/assets/js/config.js` with the Supabase URL and anon key. Edits save to the `site_content` table, photos upload to the public `media` Storage bucket, and only accounts with the staff role can sign in or publish (enforced by row-level security, tested).
* The app reads the same `site_content` row (`app/src/lib/content.ts`) for hero photos, promotions, events and ministries, and updates in real time when staff publish.
* `dist/agape-admin-demo.html` is a single-file demo of the admin with live preview. It opens straight from disk, and its edits stay in that browser.

## 1. Website
* Open `website/index.html` in a browser, or serve it: `npx serve website`.
* Deploy: Cloudflare Pages → "Upload assets" → the `website/` folder (no build step needed).
* Edit copy in `website/src/index.src.html`, then run `python3 website/tools/build.py` (injects the icon sprite and rebuilds the preview).
* Service times, time zone, currency and all content are edited in the admin (defaults are in `website/assets/js/content.js`).
* Everything moves: preloader, smooth scroll (ScrollSmoother), split-text reveals, a velocity-reactive marquee, an auto-playing promo carousel, a live chat and countdown, a pinned horizontal sermon library, a pinned app showcase with 6 live phone screens, a procedural live ride map, a playable Verse Match game with confetti, an AI chat with streamed answers, an animated prayer wall, giving dials, an image-follow events list, a shareable verse card generator, an accordion of ministries and a filled footer wordmark.

## 2. Native app
```bash
cd app
npm install
npx expo install --fix      # aligns every native package to the installed Expo SDK
cp .env.example .env         # optional: connect Supabase (without it the app runs on demo data)
npx expo start               # scan the QR with Expo Go, or press i / a for a simulator
```
Screens: Welcome/sign-in · Home (live card + countdown, promo carousel, quick actions, verse of the day, course progress, events, prayer) · Watch (live, search, series by book, latest) · Sermon (collapsing hero, YouTube Live player, save/download/share, synced notes, live chat) · Grow (reading-plan streak, courses, PDF study guides) · Course (lessons with progress ring, complete → confetti) · Community (chats, groups, announcements) · Chat · Me (tilting membership card, Wallet/check-in, settings: Face ID, notifications, larger text, kids mode, language, pastoral care) · Bible Games (Verse Match + Trivia, haptics, live leaderboard) · Ask Agape (AI with streamed replies) · Rides (live map, request → searching → driver en route with ETA → arrived; volunteer mode with accept + Google Maps/Waze hand-off + location sharing) · Prayer wall · Give (one-time/monthly, funds, campaign progress) · Events (RSVP, ticket).

### Get an installable APK (Android)
**Option A: GitHub, no account setup** (about 10 minutes, all in the browser)
1. Create a GitHub repo and upload this whole `agape/` folder, including the hidden `.github` folder.
2. The **Android APK** workflow runs automatically (or open **Actions → Android APK → Run workflow**).
3. When it finishes, open the run and download **agape-apk** from Artifacts. Unzip it, send `app-release.apk` to your phone, and install it (allow "install unknown apps").
4. Optional: add the repository secrets `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_SITE_URL` to build it against live data.

**Option B: Expo's cloud build** (free Expo account)
```bash
cd app && npm install && npx expo install --fix
npx eas-cli login
npx eas-cli build -p android --profile apk
```
Expo emails you a link and QR code to download the APK.

The test APK is signed with a debug key, which is fine for installing and sharing. For the Play Store, use `--profile production` (it builds an .aab) with the church's own Google Play account.

Store builds: `npx eas-cli build -p ios` / `-p android --profile production` (create the church's own Apple/Google developer accounts first).

## 3. Backend (Supabase)
1. Create a project under the church's billing. SQL editor → run `backend/supabase/schema.sql`, then `seed.sql`.
2. Auth → enable Email, Apple and Google providers.
3. AI assistant: `supabase functions deploy ask-agape` and `supabase secrets set ANTHROPIC_API_KEY=… ANTHROPIC_MODEL=…` (the key stays server-side; there's a per-user daily limit).
4. Put the project URL and anon key in `app/.env`.
5. Staff get `role = 'staff'` in `profiles`. Until a custom admin panel is built they can manage videos, courses, trivia packs, events and announcements from Supabase Studio. The `staff_stats` view feeds an analytics dashboard.

The schema has been run on PostgreSQL 16 and its RLS was tested with member and volunteer accounts.

## Replace before launch
* **Placeholders:** church address and coordinates (`app/src/data/mock.ts → CHURCH`), service times (both CONFIG blocks), event dates, giving campaigns and amounts, testimonies, member counts, the pastor name on the demo sermons, the Instagram/Facebook/WhatsApp links, and the Google Maps Android key (`app.json`).
* **Live chat preview:** the chat beside the website player is a labelled preview of the in-app feature, not a live feed.
* **Wiring still to do:** a payment gateway for Give (Tap / MyFatoorah for KNET, or Stripe) with a webhook that marks donations `succeeded`; push notifications (expo-notifications + `push_tokens`); background location for drivers (dev build + expo-task-manager); real QR codes (react-native-qrcode-svg) and Wallet passes; replacing the demo data in screens with the `src/lib/api.ts` calls (already written for prayers, notes, lesson progress, scores, rides, live location and RSVPs).
