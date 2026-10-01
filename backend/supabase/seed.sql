-- =====================================================================
-- Starter content so the app is full on day one. Every row here can be
-- edited or deleted in /admin (Sermons, Courses, Games, Announcements).
-- Image paths point at images bundled with the website and app.
-- =====================================================================

-- ---------- Sermon series + sermons -----------------------------------
insert into public.series (slug, title, accent, book, speaker, cover_url, color, position) values
 ('romans',  'Unshake',     'able',        'Romans',  'Ps. John Mathew',     'assets/img/cross-mountain.jpg', '#FF5A1F', 1),
 ('psalms',  'Psalms',      'after dark',  'Psalms',  'Night worship',       'assets/img/woman-forest.jpg',   '#6E4BFF', 2),
 ('acts',    'A church',    'on the move', 'Acts',    'Ps. John Mathew',     'assets/img/city-night.jpg',     '#2ED3A0', 3),
 ('faith',   'Faith',       'over fear',   'Faith',   'Ps. Sarah Thomas',    'assets/img/hand-sunset.jpg',    '#FFC23D', 4),
 ('mount',   'Upside-down', 'kingdom',     'Matthew', 'Sermon on the Mount', 'assets/img/dove.jpg',           '#FF3D7F', 5),
 ('genesis', 'In the',      'beginning',   'Genesis', 'Foundations',         'assets/img/mountain-peaks.jpg', '#4CC3FF', 6)
on conflict (slug) do nothing;

insert into public.videos (slug, series_id, title, accent, speaker, description, cover_url, is_live, youtube_id, duration_sec, views, likes, published_at)
select v.slug, s.id, v.title, v.accent, v.speaker, v.about, v.cover, v.live, v.yt, v.dur, v.views, v.likes, v.at::timestamptz
from (values
 ('power-of-grace', 'romans', 'Prayer', '& Worship', 'Agape International Media',
  'Intercessory prayer and worship with the Agape family. Watch live when we''re streaming, or catch up on the latest sessions.',
  'assets/img/agape-home-worship.jpg', true, null, null, 12400, 1200, '2026-09-28 10:00+03'),
 ('faith-over-fear', 'faith', 'Faith', 'over Fear', 'Ps. Sarah Thomas',
  'Fear shouts, but faith doesn''t have to. This message looks at Joshua 1 and the courage that comes from God''s presence.',
  'assets/img/hand-sunset.jpg', false, null, 3480, 8120, 940, '2026-09-27 10:00+03'),
 ('unshakeable-3', 'romans', 'Nothing', 'is wasted', 'Ps. John Mathew',
  'Romans 8:28: God works in all things for the good of those who love Him. Not everything is good, but nothing is wasted.',
  'assets/img/cross-mountain.jpg', false, null, 3840, 9840, 1103, '2026-09-20 10:00+03'),
 ('psalm-23', 'psalms', 'The shepherd', 'who stays', 'Night worship',
  'A slow walk through Psalm 23 for anyone in a valley right now.',
  'assets/img/woman-forest.jpg', false, null, 2760, 6010, 713, '2026-09-13 10:00+03'),
 ('acts-2', 'acts', 'Fire', '& wind', 'Ps. John Mathew',
  'Pentecost, and the church that was born to move.',
  'assets/img/city-night.jpg', false, null, 4080, 7300, 820, '2026-09-06 10:00+03')
) as v(slug, series, title, accent, speaker, about, cover, live, yt, dur, views, likes, at)
join public.series s on s.slug = v.series
on conflict (slug) do nothing;

-- ---------- Study PDFs ------------------------------------------------
insert into public.documents (title, url, pages, color) values
 ('Romans study guide', null, 24, '#FF5A1F'),
 ('Prayer journal', null, 40, '#FF3D7F'),
 ('New member handbook', null, 16, '#2ED3A0'),
 ('Small group host guide', null, 12, '#6E4BFF');

-- ---------- Courses → modules → lessons -------------------------------
insert into public.courses (slug, title, accent, category, description, cover_url, color, published, position) values
 ('foundations', 'Foundations', 'of Christian Living', 'Bible',
  'The Agape Institute of Ministry course: six lessons on what we believe and how to live it, with video, a study guide and a quiz in each. Finish it to earn your certificate.',
  'assets/img/agape-institute.jpg', '#6E4BFF', true, 1),
 ('alpha', 'Life''s big', 'questions', 'Explore',
  'An eight-week conversation about life, faith and meaning. Great for first-timers.',
  'assets/img/mug-bible.jpg', '#2ED3A0', true, 2),
 ('romans-study', 'Book of', 'Romans', 'Bible',
  'A verse-by-verse journey through Paul''s letter to the Romans.',
  'assets/img/bible-dark.jpg', '#FF5A1F', true, 3),
 ('lead', 'Lead', 'like Jesus', 'Leadership',
  'Servant leadership for small group hosts and ministry leads.',
  'assets/img/team-meeting.jpg', '#FFC23D', true, 4)
on conflict (slug) do nothing;

insert into public.modules (course_id, title, position)
select id, 'Lessons', 0 from public.courses where slug in ('foundations', 'alpha', 'romans-study', 'lead');

insert into public.lessons (module_id, title, kind, minutes, position, body, quiz)
select m.id, l.title, l.kind::public.lesson_kind, l.minutes, l.pos, l.body, l.quiz::jsonb
from (values
 ('foundations', 1, 'Why we need faith', 'video', 18, 'Hebrews 11:6. Without faith it is impossible to please God. What is faith, and why does God ask for it?', null),
 ('foundations', 2, 'The life of Abraham', 'video', 24, 'Genesis 12 and 22. Faith that leaves home, and faith that trusts God with the promise itself.', null),
 ('foundations', 3, 'Faith in the New Testament', 'video', 21, 'Romans 4 and James 2. Faith that saves, and faith that works.', null),
 ('foundations', 4, 'Study guide: Hebrews 11', 'pdf', 15, 'Read Hebrews 11 and answer the questions in the guide.', null),
 ('foundations', 5, 'Living by faith', 'video', 26, 'Faith on Monday morning: work, family, money and fear.', null),
 ('foundations', 6, 'Final reflection', 'quiz', 10, 'Five questions to wrap up the course.',
  '[{"prompt":"Which chapter is called the \"hall of faith\"?","options":["Romans 8","Hebrews 11","John 3","Psalm 23"],"answer":1},
    {"prompt":"Who left Ur not knowing where he was going?","options":["Moses","David","Abraham","Noah"],"answer":2},
    {"prompt":"\"Faith without works is…\"","options":["dead","weak","hidden","enough"],"answer":0}]'),
 ('alpha', 1, 'Is there more to life?', 'video', 30, null, null),
 ('alpha', 2, 'Who is Jesus?', 'video', 32, null, null),
 ('alpha', 3, 'Why did Jesus die?', 'video', 28, null, null),
 ('alpha', 4, 'How can I have faith?', 'video', 27, null, null),
 ('alpha', 5, 'Why and how do I pray?', 'video', 29, null, null),
 ('alpha', 6, 'Reflection', 'quiz', 10, null,
  '[{"prompt":"Where can you read about the life of Jesus?","options":["The Gospels","Leviticus","Proverbs","Revelation"],"answer":0},
    {"prompt":"Prayer is best described as…","options":["A ritual","Talking with God","A performance","Only for pastors"],"answer":1}]'),
 ('romans-study', 1, 'The gospel of power', 'video', 22, 'Romans 1:16-17.', null),
 ('romans-study', 2, 'All have fallen short', 'video', 25, 'Romans 3:23.', null),
 ('romans-study', 3, 'Justified by faith', 'pdf', 14, 'Romans 5:1-11.', null),
 ('romans-study', 4, 'Life in the Spirit', 'video', 27, 'Romans 8.', null),
 ('romans-study', 5, 'Chapter check-in', 'quiz', 8, null,
  '[{"prompt":"Romans 8:28 says God works in all things for…","options":["our comfort","the good of those who love him","the strong","no one"],"answer":1},
    {"prompt":"\"For all have sinned and…\"","options":["fall short of the glory of God","are lost forever","must try harder","are forgiven by works"],"answer":0}]'),
 ('lead', 1, 'The towel and the basin', 'video', 20, 'John 13.', null),
 ('lead', 2, 'Leading a small group', 'video', 23, null, null),
 ('lead', 3, 'Hosting guide', 'pdf', 12, null, null),
 ('lead', 4, 'Quiz', 'quiz', 6, null,
  '[{"prompt":"In John 13, Jesus washed the disciples''…","options":["hands","feet","faces","clothes"],"answer":1}]')
) as l(course, pos, title, kind, minutes, body, quiz)
join public.courses c on c.slug = l.course
join public.modules m on m.course_id = c.id;

-- ---------- Bible games -----------------------------------------------
with p as (insert into public.question_packs (title, game, published) values ('Bible trivia · starter', 'trivia', true) returning id)
insert into public.questions (pack_id, prompt, options, answer)
select p.id, q.prompt, q.options::jsonb, q.answer::jsonb from p, (values
 ('Who built the ark?', '["Moses","Noah","Abraham","David"]', '1'),
 ('How many books are in the Bible?', '["39","27","66","73"]', '2'),
 ('Which disciple walked on water with Jesus?', '["John","Peter","Thomas","Andrew"]', '1'),
 ('What was Paul''s name before his conversion?', '["Silas","Saul","Stephen","Simon"]', '1'),
 ('Where was Jesus born?', '["Nazareth","Jerusalem","Bethlehem","Capernaum"]', '2'),
 ('Who was swallowed by a great fish?', '["Jonah","Elijah","Daniel","Job"]', '0'),
 ('Who killed Goliath?', '["Saul","Samson","David","Jonathan"]', '2'),
 ('What is the first book of the Bible?', '["Exodus","Genesis","Matthew","Psalms"]', '1')
) as q(prompt, options, answer);

with p as (insert into public.question_packs (title, game, published) values ('Verse Match · starter', 'verse_match', true) returning id)
insert into public.questions (pack_id, prompt, options, answer, reference)
select p.id, q.prompt, q.options::jsonb, q.answer::jsonb, q.ref from p, (values
 ('For God so loved the ___ that he gave his one and only ___.', '["law","heart","nations"]', '["world","Son"]', 'John 3:16'),
 ('The Lord is my ___; I shall not ___.', '["king","fear","rock"]', '["shepherd","want"]', 'Psalm 23:1'),
 ('Your word is a ___ to my feet and a ___ to my path.', '["song","sword","shield"]', '["lamp","light"]', 'Psalm 119:105'),
 ('Be still, and ___ that I am ___.', '["pray","King","wait"]', '["know","God"]', 'Psalm 46:10'),
 ('I can do all things through ___ who ___ me.', '["faith","loves","angels"]', '["Christ","strengthens"]', 'Philippians 4:13')
) as q(prompt, options, answer, ref);

-- ---------- Announcements ---------------------------------------------
insert into public.announcements (title, body, created_at) values
 ('New: Ride Ministry in the app', 'Request a ride to any service and track your driver live.', now() - interval '3 days'),
 ('Prayer & Worship on YouTube', 'Intercessory prayer sessions are now on our YouTube channel.', now() - interval '1 day'),
 ('Church Family Day · Nov 6', 'Food, games and the whole Agape family. Rides available. Tap Events to RSVP.', now());
