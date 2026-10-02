# Agape International Ministries: website, app and backend

One backend (Supabase) serves two front-ends:

```
agape/
├── website/            Static marketing + member site (HTML/CSS/JS, GSAP motion). Deploy to Cloudflare Pages.
│   ├── index.html      ← built page (edit src/index.src.html, then run tools/build.py)
│   ├── assets/         css, js (main.js + vendored GSAP), fonts, img
│   └── dist/agape-website-preview.html   single-file preview (everything inlined)
├── app/                Native iOS + Android app (Expo SDK 54 · React Native · expo-router · Reanimated 4)
└── backend/
    ├── supabase/migrations/   the database: tables, row-level security, realtime, RPCs, triggers
    ├── supabase/seed.sql      starter sermons, courses, quizzes, games, announcements
    ├── supabase/functions/    ask-agape (AI) · push (Expo notifications) · create-checkout + payment-webhook (Tap / KNET)
    ├── supabase/templates/    sign-in e-mail with the 6-digit code
    └── tests/                 end-to-end tests run on GitHub against a real Supabase stack
```

## Brand & media
* Colours: the vibrant palette of flame `#FF5A1F`, sun `#FFC23D`, rose, violet and mint. The two primaries are `--brand` and `--gold` in `website/assets/css/style.css`, and `C.flame` and `C.sun` in `app/src/theme.ts`. Change them there to recolour everything.
* The logo is cut out in four variants in `assets/img/`: `logo-mark.png` and `logo-full.png` for light backgrounds, plus `-light` versions for dark ones. The app icon and splash screen are built from it.
* The church's own photos are the `agape-*.jpg` files. The remaining stock images are only used for atmosphere (sermon series art, giving campaigns, the Bible games and AI demos).
* YouTube: channel **Agape International Media** (`UCjly5vzmBLYGHaj-H4jefng`). The website player and the app's Watch screen embed the channel's latest uploads (playlist `UU…`), and the live stream when the church is broadcasting. To pin one video in the app, set `EXPO_PUBLIC_YOUTUBE_VIDEO_ID`.

## Design system (v4: motion & poster)
The site is a sequence of full-screen, colour-blocked scenes. The page colour changes as you scroll, and almost every section reacts to your cursor, your finger or the scroll wheel. It's all plain CSS and JS with GSAP (no framework):
* **Hero:** a WebGL photo stage. Each photo bends like liquid under the cursor with an RGB split, and slides change through a noise-displacement wipe. The giant headline uses variable-font proximity: letters stretch as the cursor gets near. It also has a spinning seal badge, thumbnail progress, and a zoom-in reveal that shrinks into a card as you scroll away.
* **Promotions:** poster cards stack on top of each other as you scroll, pinned, with a 3D tilt and glare. Each card has an arch photo, a spinning sticker seal and a giant outlined number. The content comes from the admin's Promotions list.
* **A week at Agape:** a pinned horizontal scroll through seven colour panels (Sun to Sat). Photos sit in arch, circle, leaf and morphing-blob shapes with parallax, alongside live widgets (viewers, prayer count, course ring, AI typing, ride ETA).
* **Watch:** the player grows from a small card to full-bleed cinema as you scroll, with live chat bubbles and hearts floating over the video. A flip-digit countdown to the next service sits beneath it.
* **Sermon library:** a draggable 3D cylinder with inertia. The filter chips spin to the chosen book.
* **Rides:** a full-bleed real street map (OpenStreetMap in Google-Maps night style) with a car driving a real road route, floating ETA and driver cards.
* **Bible games:** a gold page where you drag word tiles into the blanks (tapping still works). The stickers can be thrown around.
* **Prayer wall:** paper notes that drop onto the board. You can pick them up and throw them, with inertia and tilt. New requests fall in from the top.
* **Giving:** campaign "jars" fill with liquid to their percentage and slosh when you move the cursor over them.
* **Gallery:** a cursor image trail of your photos. On touch screens it auto-plays and answers taps.
* **Also:** letter-roll hover on buttons, a light nav on light pages, scroll-velocity skew, the Scripture carousel, the dotted globe and the 3D testimonies wall.
* Files: `assets/css/style.css` (base), `v3.css`, `v4.css` (this layer); `assets/js/main.js` (hero, sections), `v3.js` (globe, spotlight), `v4.js` (colour flow and the section engines).

**App:** it uses the same visual language. The Home hero has a poster headline and a spinning seal. Promotions are a Tinder-style swipe deck of posters, and "Every day of the week" is a set of snap-scrolling colour panels. The Prayer wall lets you swipe paper notes right to pray. On the Give screen, campaign jars fill with animated liquid and slosh when tapped. The shared pieces live in `app/src/components/Motion.tsx` (Seal, SwipeDeck, Jar), `PromoDeck.tsx` and `WeekStrip.tsx`.

## Admin panel (`website/admin/`)
Staff manage everything from one place, without touching code:
* **All images:** every photo on the site, grouped by section. Click, drag or paste to replace a photo. Uploads are resized automatically.
* **Homepage hero:** headline, cycling words, intro text and the slideshow photos (drag to reorder).
* **Promotions, Events, Ministries, Giving campaigns, Testimonies, Bible verses:** add, edit, duplicate, reorder and delete, with photo and colour pickers.
* **Photo gallery:** drop in many photos at once, write captions on the cards, drag to reorder.
* **Watch & YouTube, Church info:** channel, player artwork, announcement bar, contact details, service times (these drive the live countdowns) and the counter numbers.
* **App content:** sermons (paste a YouTube link, mark one as live) and series, courses with lessons (video, PDF study guide or quiz), study guides (PDF upload), and Bible-game question packs.
* **Community:** approve prayer requests sent from the website, moderate the wall, follow up visitor cards, read confidential pastoral-care requests, approve volunteer applications, see gifts, manage rides, change member roles and post announcements (which also go out as push notifications).
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
Tabs: **Home · Bible · Watch · Community · Me** (calm, native-style design: standard tab bar, grouped lists, solid buttons).

Screens:
* **Bible:** reader in 9 free public-domain translations (WEB, KJV, BSB, ASV, YLT, Hindi O.V., Malayalam O.V., Tamil O.V., Arabic Van Dyke) with offline cache, highlights in 5 colours, bookmarks, verse notes, copy/share, shareable verse images, and an **Audio Bible** (the phone's voice reads verse by verse, highlights and follows the verse, speeds 0.75–1.5×, carries on to the next chapter).
* **Reading plans:** for adults, teens and kids. Day-by-day readings with devotions, daily reminders, streaks and a private journal.
* **Song book:** lyrics with chords, change key, capo, chords on/off, text size, auto-scroll, keep-awake, and set lists with a key per song. Ships with 28 public-domain hymns; the worship team adds songs in /admin.
* **Games:** Daily Challenge, Bible Trivia, Verse Match, Who Said It?, True or False speed round, Emoji Bible, Books in Order and Memory Match, with personal bests and per-game weekly leaderboards. Kids get easier packs.
* **Agape Kids:** kid-safe section with memory verse, stories read aloud, videos, kids' games and kids' plans. **Kids mode** locks the phone to it with a parent PIN.
* **Agape Teens / Agape Squad:** events, challenges, devotions and their group chat. Squad also links to the song book.
* **Community:** Testimonies (members share, pastors approve, everyone says Amen); **Home prayer meetings** (host or join; the address is shown only after you RSVP, then a map and directions); prayer wall, groups, chat and announcements.
* **Church life:** Serve board (shift sign-ups with reminders), QR check-in (member card plus scanning the church's code; the welcome team scans cards), new-member "Getting started" checklist, events, giving, rides, pastoral care, Ask Agape (AI), sermons with notes and live chat, and the Agape Institute courses.
* **Languages:** English, हिन्दी, മലയാളം, தமிழ், العربية. Choose on the welcome screen or in Me → Language (Arabic switches the layout to right-to-left after a restart). The Bible follows the language.
* **Me:** member card, Face ID lock, larger text, language, Bible translation, Kids mode, delete account. Staff can send targeted push notifications from the app.

### Why Expo?
Expo is the toolkit around React Native. It produces a normal native Android app (APK/AAB) and iPhone app from one codebase, plus a web version. It isn't "Expo Go": the APK on the website is a standalone app.

### Get an installable APK (Android)
**Option A: GitHub, no account setup** (about 10 minutes, all in the browser)
1. Create a GitHub repo and upload this whole `agape/` folder, including the hidden `.github` folder.
2. The **Publish app** workflow runs automatically (or open **Actions → Publish app → Run workflow**).
3. When it finishes, the APK is at `https://github.com/<owner>/<repo>/releases/download/app-latest/agape.apk`. Open that link on an Android phone and install it (allow "install unknown apps" the first time).
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

## 3. Backend (Supabase) — what's real
Everything is wired end to end. There is no demo logic left when the keys are set:

| Feature | How it works |
|---|---|
| Sign-in | E-mail 6-digit code (no passwords), Google, Sign in with Apple (native on iPhone). Guests can browse; anything personal asks them to sign in. New members choose their name once. |
| Member card | Real member number (AGP-YY-####), role, join date. Members can edit their profile and delete their account (App Store rule). |
| Prayer wall | App posts go live instantly; website posts wait for a pastor's approval in /admin. "Pray" counts once per person; the requester gets a notification at 1, 10, 25, 50… prayers. Public wall shows "Priya R." style names, never who posted anonymously. |
| Sermons & courses | From the database (admin → Sermons / Courses). Notes, saved sermons, lesson progress and quizzes sync to the member's account. Live-stream chat uses Realtime with a "here now" count. |
| Community | Joining a group (from the admin's Ministries list) opens its group chat; direct messages; unread counts; announcements. Everyone is in the "Agape Family" chat. |
| Rides | Member drops a pin and requests a ride → every volunteer driver is notified → one accepts → the driver's phone streams GPS every few seconds → the member sees the car, ETA, call/message buttons → arrived/complete. Drivers can hand a ride back. Members apply to volunteer; staff approve in /admin. |
| Events | RSVPs keyed to the admin's events, with a live "going" count and a ticket with the member's name and number. |
| Games | Questions from the admin; scores feed a real weekly leaderboard. |
| Giving | Tap Payments hosted checkout (KNET, Visa/Mastercard, Apple Pay). A gift only counts after the webhook re-checks the charge with Tap; then campaign jars rise and the donor is thanked. Works for website visitors without an account. |
| Push | Every notification row (ride updates, messages, announcements, prayers, gifts) triggers the `push` function → Expo → phones. Members can switch it off. |
| Website | Prayer form, welcome card, giving and the prayer wall talk to the database; admin edits publish instantly. |
| Bible & plans | Text from bolls.life (free, public-domain translations), cached on the phone. Highlights, bookmarks, notes, plan progress and the journal are private to each member (RLS). |
| Song book | `songs` + `set_lists` tables; shared set lists from the worship team. Chords are transposed on the phone. |
| Testimonies | Members submit; nothing shows until staff approve (members can't approve or feature themselves); the author is notified when it's live and when people say Amen. |
| Home meetings | Anyone signed in sees the area and time; the exact address is only readable by the host, staff and people who RSVP'd. Capacity is enforced; the host hears about each RSVP; cancelling notifies guests. |
| Serve & check-in | Shift sign-ups with slot limits. Check-in codes are made per day in /admin (with a full-screen QR to project); volunteers/staff can scan member cards. Attendance shows in /admin. |
| Push campaigns | Staff send to everyone, volunteers, a group, Teens/Squad/Kids, a language or a plan's readers. Send now or schedule (sent by pg_cron every minute). |
| Security | Row-level security on every table; members can't promote themselves, forge prayer counts, read others' chats, care requests or rides. |

**Tested:** `.github/workflows/backend-e2e.yml` starts the whole stack on GitHub and runs 23 end-to-end tests (sign-in by e-mail code, RLS, realtime ride tracking, chat, push delivery, checkout + webhook, account deletion…). `.github/workflows/app-live-e2e.yml` builds the app and website against that stack and walks a new member and a staff member through every feature in a real browser, with screenshots.

## 4. Going live — the church's checklist
Accounts to create (all under the church's name and billing):

1. **Supabase** (database, sign-in, storage, functions). Create a project in the region nearest Kuwait (Frankfurt / Mumbai).
   ```bash
   npm i -g supabase
   cd backend
   supabase login && supabase link --project-ref YOUR-REF
   supabase db push --include-seed       # runs the migrations + starter content (sermons, courses, games)
   supabase functions deploy ask-agape push create-checkout payment-webhook
   ```
   * Auth → URL configuration: Site URL = your website; add redirect URLs `agape://auth-callback` and `agape://**`.
   * Auth → Email templates: paste `supabase/templates/magic_link.html` into "Magic link" and `confirmation.html` into "Confirm signup" (they show the 6-digit code). Set up custom SMTP (e.g. Resend) so codes don't land in spam.
   * Make the first staff account: sign up in the app, then in the SQL editor `update profiles set role = 'admin' where email = 'pastor@…';`
2. **Push notifications.** `npx eas-cli init` in `app/` (adds the project id), upload Firebase credentials for Android (`eas credentials`), then let the database call the push function:
   ```sql
   select vault.create_secret('https://YOUR-REF.supabase.co', 'project_url');
   select vault.create_secret('YOUR-SERVICE-ROLE-KEY', 'service_role_key');
   ```
3. **Giving — Tap Payments** (tap.company, supports KNET). `supabase secrets set TAP_SECRET_KEY=sk_live_…` (test with `sk_test_…` first). Optional: `TAP_SOURCE=src_kw.knet` to open KNET directly. Never set `PAYMENTS_TEST_MODE` in production.
4. **AI assistant:** `supabase secrets set ANTHROPIC_API_KEY=…` (daily limit per member: `DAILY_LIMIT=50`).
5. **Sign in with Google / Apple:** Supabase → Auth → Providers. Google: OAuth client from Google Cloud. Apple: Services ID + key from the Apple Developer account (also enables native sign-in on iPhone).
6. **Maps need no key.** The ride map (app and website) uses free OpenStreetMap vector tiles from OpenFreeMap, styled like Google Maps, and free road routing from the public OSRM server. Phones that can't draw vector maps automatically get a "lite" map (Leaflet + standard OpenStreetMap tiles). If the church ever outgrows the free router, set `EXPO_PUBLIC_ROUTER_URL` to its own OSRM/Valhalla server.
7. **Connect the front-ends:**
   * Website: `website/assets/js/config.js` → Supabase URL + anon key. Deploy the `website/` folder to Cloudflare Pages / Netlify.
   * App: `app/.env` (or GitHub secrets for the APK workflow) → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SITE_URL`.
8. **Let people download the app from the website** (no store needed):
   * Every push runs `.github/workflows/publish-app.yml`. It builds the Android APK and publishes it at a permanent link: `https://github.com/<owner>/<repo>/releases/download/app-latest/agape.apk`. The website's **Download for Android** button points there; change it in /admin → Church info → App downloads.
   * The same workflow builds the **installable web app** and puts the website + `/app` together in the `site-deploy` branch. Connect that branch to Cloudflare Pages or Netlify (no build command). iPhone users tap **Install on iPhone** → open `/app` in Safari → Share → *Add to Home Screen*. Android users can also use the web app.
   * Add the repository secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` so both builds use live data.
   * The APK is signed with a fixed key, so new versions install over old ones. For Google Play, use an EAS production build with the church's own upload key.
9. **Store builds (optional, later):** Apple Developer ($99/yr) and Google Play ($25 once) accounts → `npx eas-cli build -p ios` / `-p android --profile production` → submit.
10. **In /admin before launch:** church address, phone and map coordinates (Church info), real service times, events, campaigns and their starting totals, sermons with YouTube links, courses, and the counters shown on the website.

## Known limits (honest list)
* Drivers share their location while the app is open. Screen-locked tracking needs `expo-task-manager` background updates in a custom build.
* Giving is one-time gifts. Automatic monthly giving needs Tap's subscription/saved-card feature (phase 2).
* The Audio Bible uses the phone's own text-to-speech voices. Malayalam and Tamil voices may need installing in Android's text-to-speech settings. Recorded human narration would need a licensed audio provider.
* A home-screen widget (verse of the day) needs native widget code, which is not included yet.
* Only public-domain hymns are bundled. Add modern worship songs only under the church's CCLI licence.
* Wallet passes and offline sermon downloads are not included.
