# Agape International Ministries: website, app and backend

One backend (Supabase) serves two front-ends:

```
agape/
├── website/            Static marketing + member site (HTML/CSS/JS, GSAP motion). Deploy to Cloudflare Pages.
│   ├── index.html      ← built page (edit src/index.src.html, then run tools/build.py)
│   ├── assets/         css, js (main.js + vendored GSAP), fonts, img
│   └── dist/agape-website-preview.html   single-file preview (everything inlined)
├── app/                Native iOS + Android app (Expo SDK 54 · React Native · expo-router · Reanimated 4)
└── backend/supabase/   migrations/ (tables + RLS + realtime), setup.sql (all-in-one), seed.sql (starter Bible games), functions/ask-agape (AI)
```

## Brand & media
* Colours: the vibrant palette of flame `#FF5A1F`, sun `#FFC23D`, rose, violet and mint. The two primaries are `--brand` and `--gold` in `website/assets/css/style.css`, and `C.flame` and `C.sun` in `app/src/theme.ts`. Change them there to recolour everything.
* The logo is cut out in four variants in `assets/img/`: `logo-mark.png` and `logo-full.png` for light backgrounds, plus `-light` versions for dark ones. The app icon and splash screen are built from it.
* The church's own photos are the `agape-*.jpg` files. The remaining stock images are only used for atmosphere (sermon series art, giving campaigns, the Bible games and AI demos).
* YouTube: channel **Agape International Media** (`UCjly5vzmBLYGHaj-H4jefng`). The website player and the app's Watch screen embed the channel's latest uploads (playlist `UU…`), and the live stream when the church is broadcasting. Individual sermons are added in the admin (paste the YouTube link).

## Admin panel (`website/admin/`)
One admin for the website **and** the app. Staff sign in with the same email and password they use in the app (their account needs the `staff` or `admin` role).

**Website** (saved together with **Save & publish**, Ctrl/⌘+S; the app picks these up live too):
* **All images, Homepage hero, Promotions, Photo gallery, Events, Ministries, Giving campaigns, Testimonies, Watch & YouTube.**
* **Church info:** contact details, service times (drive the countdowns), the **online giving link** used by the app's Give button, and the **church location** for the ride map.
* **Live preview** of the real site in phone or desktop size.

**App** (each item saves on its own, straight to the app):
* **Sermons:** series and messages (paste a YouTube link; mark a message *Live* while streaming).
* **Courses:** courses with their lessons (video / PDF / reading links and notes). Only published courses show.
* **Study guides:** PDF links shown under Grow.
* **Bible games:** Trivia and Verse Match packs and their questions.
* **Groups & chats:** groups in the app's Family tab; each gets a group chat automatically.
* **RSVPs & check-in:** who's coming to each event, with a tick-box check-in.
* **Pastoral care:** the private requests members send from the app.

**Community:** moderate the prayer wall, assign drivers to rides, change member roles (only an admin can make admins), and post announcements to the app's News tab.

Staff also have **Staff tools** inside the app (Me → Staff tools) for moderating on the go: prayer wall, rides, care requests, news and live numbers.

How it works: the website renders from `assets/js/content.js` (defaults) merged with the edits saved in the `site_content` table. The admin requires Supabase (`website/assets/js/config.js`); there is no demo mode. Photos upload to the public `media` Storage bucket. Row-level security decides who can change what.

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
cp .env.example .env         # required: your Supabase URL + anon key (see 3. Backend)
npx expo start               # scan the QR with Expo Go, or press i / a for a simulator
```
Screens: Welcome · Sign in / create account (or browse as a guest) · Home (hero, next-service countdown, promotions, verse of the day, course progress, events with RSVP, prayer) · Watch (live service, series, search) · Sermon (YouTube player, save, synced notes, live chat) · Grow (learning streak, courses, study guides) · Course (lessons unlock in order, progress saved) · Family (chats, groups with group chats, church news) · Chat + new message · Prayer wall (post anonymously, pray, mark answered) · Events (RSVP, QR ticket) · Give (opens the church's giving page) · Bible games (Verse Match + Trivia, weekly leaderboard) · Ask Agape (AI) · Rides (request → volunteer accepts → live driver location; volunteer mode) · Me (member card with QR, profile, Face ID lock, pastoral care, delete account) · Staff tools (staff only).

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
1. Create a project on [supabase.com](https://supabase.com) (region close to Kuwait, e.g. Frankfurt or Mumbai). Leave the Data API on; "automatic RLS" can be on.
2. **SQL Editor → New query →** paste all of `backend/supabase/setup.sql` → **Run**. It creates every table, security rule and function, plus the starter Bible games. (It's generated from `migrations/` + `seed.sql` by `make-setup.sh`; with the Supabase CLI you can run `supabase db push` from `backend/` instead.)
3. **Already done for this project:** the Project URL and publishable key are in `website/assets/js/config.js` and `app/.env` (both public by design, so they're committed and the APK builds connected). Optional GitHub secrets: `EXPO_PUBLIC_SITE_URL` (your website address) and `GOOGLE_MAPS_ANDROID_KEY` (ride map on Android).

   Never put the `service_role` key in the app or website.
4. **Authentication → URL Configuration:** set the Site URL to your website (used by the email confirmation and password-reset links). Email sign-in is on by default.
5. Sign up once (in the app, or create the user under Authentication → Users), then in the SQL Editor run
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
   From then on, change roles in the admin → Members & roles.
6. Ask Agape (AI): `supabase functions deploy ask-agape` and `supabase secrets set ANTHROPIC_API_KEY=…` (the key stays server-side; there's a per-user daily limit).

The migrations and their security rules were tested on a local Supabase stack: 57 end-to-end checks of the app's own data layer as a guest, members, a volunteer driver and staff, plus the admin in a browser.

## Before launch
* **Content:** the website's default content (`website/assets/js/content.js`) still has sample numbers, testimonies, campaign amounts and event dates. Edit them in the admin and press **Save & publish** once; the app shows exactly the same content.
* **Giving:** add the church's online giving page in admin → Church info. The App Store and Google Play require donations to happen on the church's own page (Give opens it with the chosen amount and fund). Until then the app says giving is "coming soon".
* **Ride map:** set the church location in admin → Church info, and add a Google Maps Android key (`GOOGLE_MAPS_ANDROID_KEY` secret). Drivers keep the app open while driving; background tracking needs a dev build with expo-task-manager.
* **Still to add later:** push notifications (expo-notifications + the `push_tokens` table), a payment gateway inside the giving page, and a camera scanner for check-in QR codes (the admin's RSVP page has tick-box check-in meanwhile).
* **Store listing:** a privacy policy URL (members can delete their account in Me → Settings, which Apple requires).
