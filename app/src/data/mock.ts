// Demo content. Every list here mirrors a Supabase table (see /backend/supabase/schema.sql).
// When EXPO_PUBLIC_SUPABASE_URL is set, src/lib/api.ts reads live data instead.
import { C, IMG } from "@/theme";

export type Series = { id: string; title: string; accent: string; book: string; count: number; speaker: string; image: any; tint: string };
export type Sermon = { id: string; title: string; accent: string; seriesId: string; speaker: string; date: string; duration: string; image: any; youtubeId?: string; live?: boolean; views: number; likes: number; about: string };
export type Lesson = { id: string; title: string; kind: "video" | "pdf" | "quiz"; minutes: number };
export type Course = { id: string; title: string; accent: string; category: string; lessons: Lesson[]; image: any; color: string; completed: number; description: string };
export type Event = { id: string; title: string; day: string; month: string; weekday: string; time: string; place: string; tags: string[]; image: any; color: string };
export type Promo = { id: string; kicker: string; title: string; accent: string; body: string; cta: string; route: string; image: any; accentColor: string; sticker?: [string, string]; progress?: number };
export type Chat = { id: string; name: string; last: string; time: string; unread: number; color: string; group?: boolean; members?: number };
export type Prayer = { id: string; who: string; text: string; count: number; color: string; anonymous?: boolean; answered?: boolean };
export type Campaign = { id: string; title: string; accent: string; body: string; raised: number; goal: number; image: any; color: string };

export const CHURCH = {
  name: "Agape International Ministries",
  short: "Agape",
  youtubeChannelId: "UCjly5vzmBLYGHaj-H4jefng", // Agape International Media
  youtubeUrl: "https://www.youtube.com/@agapeinternationalmedia",
  webOrigin: process.env.EXPO_PUBLIC_SITE_URL || "https://www.agapeintlmin.org",
  pastor: "Ps. John Mathew",
  address: "Agape International Ministries",
  mapsUrl: "https://maps.google.com/?q=Agape+International+Church",
  coords: { latitude: 29.3375, longitude: 48.0747 }, // Salmiya, Kuwait — replace with the real campus
  currency: "KWD",
  services: [
    { day: 0, h: 10, m: 0, label: "Sunday Celebration", time: "10:00 AM" },
    { day: 0, h: 18, m: 0, label: "Sunday Evening", time: "6:00 PM" },
    { day: 3, h: 19, m: 30, label: "Wednesday Prayer", time: "7:30 PM" },
  ],
  tzOffsetHours: 3,
};

export const USER = { name: "Sarah Mathews", first: "Sarah", role: "Member", group: "Youth Group", memberId: "AGP-24-0187", since: "2024" };

export const VERSES = [
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { text: "Love is patient, love is kind.", ref: "1 Corinthians 13:4" },
];

export const PROMOS: Promo[] = [
  { id: "worship", kicker: "Intercessory prayer · In homes & online", title: "Prayer &", accent: "Worship", body: "Worship, pray for each other and pray for the nations. There's always a seat for you.", cta: "Find a gathering", route: "/events", image: IMG.homeWorship, accentColor: C.sun, sticker: ["Every", "week"] },
  { id: "institute", kicker: "Agape Institute of Ministry", title: "Foundations", accent: "of Christian Living", body: "Teaching, study guides and a certificate of completion.", cta: "Enroll now", route: "/course/foundations", image: IMG.institute, accentColor: C.violet, sticker: ["New", "batch"] },
  { id: "squad", kicker: "Kids & teens", title: "Agape", accent: "Squad", body: "Worship, drama, music and memory verses, in English and Hindi.", cta: "Join the Squad", route: "/community", image: IMG.squadBand, accentColor: C.rose, sticker: ["Kids", "& teens"] },
  { id: "familyday", kicker: "Church family day", title: "Family", accent: "Day Out", body: "Food, games and the whole Agape family. We'll arrange the ride.", cta: "I'm coming", route: "/events", image: IMG.familyDay, accentColor: C.mint, sticker: ["Save", "the date"] },
];
export const SERIES: Series[] = [
  { id: "romans", title: "Unshake", accent: "able", book: "Romans", count: 8, speaker: "Ps. John Mathew", image: IMG.crossMountain, tint: C.flame },
  { id: "psalms", title: "Psalms", accent: "after dark", book: "Psalms", count: 6, speaker: "Night worship", image: IMG.womanForest, tint: C.violet },
  { id: "acts", title: "A church", accent: "on the move", book: "Acts", count: 12, speaker: "Ps. John Mathew", image: IMG.cityNight, tint: C.mint },
  { id: "faith", title: "Faith", accent: "over fear", book: "Faith", count: 5, speaker: "Ps. Sarah Thomas", image: IMG.handSunset, tint: C.sun },
  { id: "mount", title: "Upside-down", accent: "kingdom", book: "Matthew", count: 9, speaker: "Sermon on the Mount", image: IMG.dove, tint: C.rose },
  { id: "genesis", title: "In the", accent: "beginning", book: "Genesis", count: 10, speaker: "Foundations", image: IMG.mountainPeaks, tint: C.sky },
];

export const SERMONS: Sermon[] = [
  { id: "power-of-grace", title: "Prayer", accent: "& Worship", seriesId: "romans", speaker: "Agape International Media", date: "Live & on demand", duration: "Session 1", image: IMG.homeWorship, live: true, views: 12400, likes: 1200, about: "Intercessory prayer and worship with the Agape family. Watch live when we're streaming, or catch up on the latest sessions from Agape International Media on YouTube.", youtubeId: process.env.EXPO_PUBLIC_YOUTUBE_VIDEO_ID },
  { id: "faith-over-fear", title: "Faith", accent: "over Fear", seriesId: "faith", speaker: "Ps. Sarah Thomas", date: "Sep 27, 2026", duration: "58m", image: IMG.handSunset, views: 8120, likes: 940, about: "Fear shouts, but faith doesn't have to. This message looks at Joshua 1 and the courage that comes from God's presence." },
  { id: "unshakeable-3", title: "Nothing", accent: "is wasted", seriesId: "romans", speaker: "Ps. John Mathew", date: "Sep 20, 2026", duration: "1h 04m", image: IMG.crossMountain, views: 9840, likes: 1103, about: "Romans 8:28 — God works in all things for the good of those who love Him. Not everything is good, but nothing is wasted." },
  { id: "psalm-23", title: "The shepherd", accent: "who stays", seriesId: "psalms", speaker: "Night worship", date: "Sep 13, 2026", duration: "46m", image: IMG.womanForest, views: 6010, likes: 713, about: "A slow walk through Psalm 23 for anyone in a valley right now." },
  { id: "acts-2", title: "Fire", accent: "& wind", seriesId: "acts", speaker: "Ps. John Mathew", date: "Sep 6, 2026", duration: "1h 08m", image: IMG.cityNight, views: 7300, likes: 820, about: "Pentecost, and the church that was born to move." },
];

export const COURSES: Course[] = [
  {
    id: "foundations", title: "Foundations", accent: "of Christian Living", category: "Bible", image: IMG.institute, color: C.violet, completed: 2,
    description: "The Agape Institute of Ministry course: six lessons on what we believe and how to live it, with video, a study guide and a quiz in each. Finish it to earn your certificate.",
    lessons: [
      { id: "l1", title: "Why we need faith", kind: "video", minutes: 18 },
      { id: "l2", title: "The life of Abraham", kind: "video", minutes: 24 },
      { id: "l3", title: "Faith in the New Testament", kind: "video", minutes: 21 },
      { id: "l4", title: "Study guide: Hebrews 11", kind: "pdf", minutes: 15 },
      { id: "l5", title: "Living by faith", kind: "video", minutes: 26 },
      { id: "l6", title: "Final reflection", kind: "quiz", minutes: 10 },
    ],
  },
  {
    id: "alpha", title: "Life's big", accent: "questions", category: "Explore", image: IMG.mugBible, color: C.mint, completed: 0,
    description: "An eight-week conversation about life, faith and meaning. Great for first-timers.",
    lessons: [
      { id: "a1", title: "Is there more to life?", kind: "video", minutes: 30 },
      { id: "a2", title: "Who is Jesus?", kind: "video", minutes: 32 },
      { id: "a3", title: "Why did Jesus die?", kind: "video", minutes: 28 },
      { id: "a4", title: "How can I have faith?", kind: "video", minutes: 27 },
      { id: "a5", title: "Why and how do I pray?", kind: "video", minutes: 29 },
      { id: "a6", title: "Reflection", kind: "quiz", minutes: 10 },
    ],
  },
  {
    id: "romans-study", title: "Book of", accent: "Romans", category: "Bible", image: IMG.bibleDark, color: C.flame, completed: 2,
    description: "A verse-by-verse journey through Paul's letter to the Romans.",
    lessons: [
      { id: "r1", title: "The gospel of power", kind: "video", minutes: 22 },
      { id: "r2", title: "All have fallen short", kind: "video", minutes: 25 },
      { id: "r3", title: "Justified by faith", kind: "pdf", minutes: 14 },
      { id: "r4", title: "Life in the Spirit", kind: "video", minutes: 27 },
      { id: "r5", title: "Chapter check-in", kind: "quiz", minutes: 8 },
    ],
  },
  {
    id: "lead", title: "Lead", accent: "like Jesus", category: "Leadership", image: IMG.teamMeeting, color: C.sun, completed: 0,
    description: "Servant leadership for small group hosts and ministry leads.",
    lessons: [
      { id: "s1", title: "The towel and the basin", kind: "video", minutes: 20 },
      { id: "s2", title: "Leading a small group", kind: "video", minutes: 23 },
      { id: "s3", title: "Hosting guide", kind: "pdf", minutes: 12 },
      { id: "s4", title: "Quiz", kind: "quiz", minutes: 6 },
    ],
  },
];

export const STUDY_PDFS = [
  { id: "p1", title: "Romans study guide", pages: 24, color: C.flame },
  { id: "p2", title: "Prayer journal", pages: 40, color: C.rose },
  { id: "p3", title: "New member handbook", pages: 16, color: C.mint },
  { id: "p4", title: "Small group host guide", pages: 12, color: C.violet },
];

export const EVENTS: Event[] = [
  { id: "revival", title: "Prayer & Worship Night", day: "16", month: "OCT", weekday: "Fri", time: "8:00 PM · Home gathering", place: "Home gathering", tags: ["Worship", "Intercession"], image: IMG.homeWorship, color: C.flame },
  { id: "alpha", title: "Foundations of Christian Living", day: "21", month: "OCT", weekday: "Wed", time: "7:30 PM · Agape Institute", place: "Agape Institute of Ministry", tags: ["Course", "Certificate"], image: IMG.institute, color: C.violet },
  { id: "brunch", title: "Agape Squad Practice", day: "24", month: "OCT", weekday: "Sat", time: "4:00 PM · Main hall", place: "Main hall", tags: ["Kids", "Teens"], image: IMG.squadHealer, color: C.rose },
  { id: "homeprayer", title: "Kids Church", day: "30", month: "OCT", weekday: "Fri", time: "10:00 AM · Psalm 51:10", place: "Kids room", tags: ["Ages 3–12"], image: IMG.kidsHearts, color: C.sun },
  { id: "camp", title: "Church Family Day", day: "06", month: "NOV", weekday: "Fri", time: "All day · Rides available", place: "Farm", tags: ["Everyone"], image: IMG.familyDay, color: C.mint },
];

export const CHATS: Chat[] = [
  { id: "youth", name: "Agape Squad", last: "Daniel: Practice at 4, bring your violin! 🎻", time: "7:43 PM", unread: 3, color: C.flame, group: true, members: 48 },
  { id: "college", name: "College Ministry", last: "Grace: Anyone up for the retreat?", time: "6:18 PM", unread: 2, color: C.violet, group: true, members: 32 },
  { id: "prayer", name: "Prayer Warriors", last: "Sarah: Let's keep praying 🙏", time: "5:02 PM", unread: 0, color: C.rose, group: true, members: 67 },
  { id: "family", name: "Agape Family", last: "New on YouTube: Prayer & Worship · Session 1", time: "3:21 PM", unread: 0, color: C.ink, group: true, members: 2400 },
  { id: "mens", name: "Men's Fellowship", last: "Joseph: Coffee at 7 on Saturday", time: "12:14 PM", unread: 1, color: C.sky, group: true, members: 86 },
  { id: "david", name: "David Kumar", last: "I'll pick you up at 9:15 😊", time: "Yesterday", unread: 0, color: C.mint },
];

export const GROUPS = [
  { id: "youth", name: "Agape Squad", meets: "Kids & teens", members: 48, color: C.rose, image: IMG.squadBand },
  { id: "women", name: "Families", meets: "Monthly", members: 120, color: C.mint, image: IMG.families },
  { id: "men", name: "Prayer & Worship", meets: "Weekly · homes", members: 86, color: C.flame, image: IMG.homeWorship },
  { id: "kids", name: "Kids Church", meets: "Ages 3–12", members: 94, color: C.sun, image: IMG.kidsChurch },
  { id: "worship", name: "Agape Institute", meets: "Certificate courses", members: 26, color: C.violet, image: IMG.institute },
  { id: "serve", name: "Fellowship", meets: "Family days", members: 140, color: C.sky, image: IMG.familyDay },
];

export const ANNOUNCEMENTS = [
  { id: "a1", title: "Revival Nights starts Oct 16", body: "Doors open at 6:30 PM. Kids' program runs all three nights. Invite a friend!", time: "Today", color: C.rose },
  { id: "a2", title: "Building Fund reaches 68%", body: "Thank you, church! We're KWD 79,600 away from breaking ground.", time: "Yesterday", color: C.sun },
  { id: "a3", title: "New: Ride Ministry in the app", body: "Request a ride to any service and track your driver live.", time: "Mon", color: C.mint },
];

export const PRAYERS: Prayer[] = [
  { id: "p1", who: "Anonymous", text: "Please pray for my mom's surgery on Thursday. For steady hands and a quick recovery.", count: 42, color: C.rose, anonymous: true },
  { id: "p2", who: "Priya R.", text: "Thank you church! My dad is home from the ICU. Keep praying for full healing 🙏", count: 214, color: C.sun, answered: true },
  { id: "p3", who: "Joseph A.", text: "New job starts Monday. I'm praying for favor and for the courage to be a light there.", count: 28, color: C.violet },
  { id: "p4", who: "Anonymous", text: "Struggling with anxiety at night. Pray for rest.", count: 88, color: C.sky, anonymous: true },
  { id: "p5", who: "Ruth & Ben", text: "We're expecting our first baby in December! Pray for a healthy pregnancy.", count: 96, color: C.mint },
  { id: "p6", who: "Mariam K.", text: "My visa renewal is pending. Trusting God with the timing.", count: 37, color: C.flame },
  { id: "p7", who: "Anonymous", text: "For my brother, who has walked away from faith. Bring him home, Lord.", count: 73, color: C.violet, anonymous: true },
];

export const CAMPAIGNS: Campaign[] = [
  { id: "build", title: "Building", accent: "Fund", body: "A new sanctuary for 1,200 seats and a kids' wing.", raised: 170400, goal: 250000, image: IMG.bricks, color: C.flame },
  { id: "nepal", title: "Mission", accent: "Nepal", body: "Sending 14 people to serve in rural schools next spring.", raised: 8400, goal: 20000, image: IMG.alps, color: C.violet },
  { id: "families", title: "Families", accent: "in Need", body: "Groceries, rent support and school fees for families in our city.", raised: 12750, goal: 15000, image: IMG.handsTogether, color: C.mint },
];

export const LEADERBOARD = [
  { name: "Daniel J.", points: 1240, color: C.violet },
  { name: "Sarah M.", points: 1180, color: C.rose },
  { name: "Michael T.", points: 1120, color: C.mint },
  { name: "Grace A.", points: 960, color: C.flame },
  { name: "Joel P.", points: 880, color: C.sky },
];

export const VERSE_MATCH = [
  { t: "For God so loved the ___ that he gave his one and only ___.", a: ["world", "Son"], x: ["law", "heart", "nations"], r: "John 3:16" },
  { t: "The Lord is my ___; I shall not ___.", a: ["shepherd", "want"], x: ["king", "fear", "rock"], r: "Psalm 23:1" },
  { t: "Your word is a ___ to my feet and a ___ to my path.", a: ["lamp", "light"], x: ["song", "sword", "shield"], r: "Psalm 119:105" },
  { t: "Be still, and ___ that I am ___.", a: ["know", "God"], x: ["pray", "King", "wait"], r: "Psalm 46:10" },
  { t: "I can do all things through ___ who ___ me.", a: ["Christ", "strengthens"], x: ["faith", "loves", "angels"], r: "Philippians 4:13" },
];

export const TRIVIA = [
  { q: "Who built the ark?", o: ["Moses", "Noah", "Abraham", "David"], a: 1 },
  { q: "How many books are in the Bible?", o: ["39", "27", "66", "73"], a: 2 },
  { q: "Which disciple walked on water with Jesus?", o: ["John", "Peter", "Thomas", "Andrew"], a: 1 },
  { q: "What was Paul's name before his conversion?", o: ["Silas", "Saul", "Stephen", "Simon"], a: 1 },
  { q: "Where was Jesus born?", o: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], a: 2 },
  { q: "Who was swallowed by a great fish?", o: ["Jonah", "Elijah", "Daniel", "Job"], a: 0 },
];

export const RIDE = {
  driver: { name: "David Kumar", car: "Toyota Innova · White", plate: "KW 38 7456", rating: 4.9, rides: 212, phone: "+96500000000" },
  pickup: { latitude: 29.3232, longitude: 48.0612, label: "Salmiya Block 10" },
  // simple road-ish path from pickup to church
  route: [
    { latitude: 29.3232, longitude: 48.0612 },
    { latitude: 29.3261, longitude: 48.0618 },
    { latitude: 29.3268, longitude: 48.0662 },
    { latitude: 29.3302, longitude: 48.0671 },
    { latitude: 29.3318, longitude: 48.0712 },
    { latitude: 29.3352, longitude: 48.0721 },
    { latitude: 29.3375, longitude: 48.0747 },
  ],
  requests: [
    { id: "rq1", name: "Mariam K.", pickup: "Salmiya Block 4", time: "Sun 9:15 AM", seats: 2, color: C.rose, lat: 29.3301, lng: 48.0655 },
    { id: "rq2", name: "Thomas J.", pickup: "Hawally, Tunis St", time: "Sun 9:30 AM", seats: 1, color: C.violet, lat: 29.3417, lng: 48.0284 },
    { id: "rq3", name: "Esther & kids", pickup: "Jabriya Block 1", time: "Sun 5:15 PM", seats: 3, color: C.sun, lat: 29.3217, lng: 48.0293 },
  ],
};

export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#17131d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8196" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17131d" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2432" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#322b3c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3448" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e2233" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1b1622" }] },
];
