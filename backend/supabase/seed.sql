-- =====================================================================
-- AGAPE — starter content (optional, safe to run once after the migrations)
-- Only real Bible content: a trivia pack and a Verse Match pack so the
-- games work on day one. Everything else (sermons, courses, groups,
-- events…) is added by staff in /admin.
-- =====================================================================

with p as (insert into public.question_packs (title, game, published) values ('Bible basics', 'trivia', true) returning id)
insert into public.questions (pack_id, prompt, options, answer, reference)
select p.id, q.prompt, q.options::jsonb, q.answer::jsonb, q.ref from p, (values
  ('Who built the ark?', '["Moses","Noah","Abraham","David"]', '1', 'Genesis 6'),
  ('How many books are in the Bible?', '["39","27","66","73"]', '2', null),
  ('Which disciple walked on water with Jesus?', '["John","Peter","Thomas","Andrew"]', '1', 'Matthew 14:29'),
  ('What was Paul''s name before his conversion?', '["Silas","Saul","Stephen","Simon"]', '1', 'Acts 13:9'),
  ('Where was Jesus born?', '["Nazareth","Jerusalem","Bethlehem","Capernaum"]', '2', 'Luke 2:4–7'),
  ('Who was swallowed by a great fish?', '["Jonah","Elijah","Daniel","Job"]', '0', 'Jonah 1:17'),
  ('Who led the Israelites out of Egypt?', '["Joshua","Moses","Aaron","Samuel"]', '1', 'Exodus 12'),
  ('What is the first book of the New Testament?', '["Mark","Acts","Matthew","John"]', '2', null)
) as q(prompt, options, answer, ref);

-- Verse Match: "___" marks each blank; answer = the missing words in order; options = extra wrong words.
with p as (insert into public.question_packs (title, game, published) values ('Memory verses', 'verse_match', true) returning id)
insert into public.questions (pack_id, prompt, options, answer, reference)
select p.id, q.prompt, q.options::jsonb, q.answer::jsonb, q.ref from p, (values
  ('For God so loved the ___ that he gave his one and only ___.', '["law","heart","nations"]', '["world","Son"]', 'John 3:16'),
  ('The Lord is my ___; I shall not ___.', '["king","fear","rock"]', '["shepherd","want"]', 'Psalm 23:1'),
  ('Your word is a ___ to my feet and a ___ to my path.', '["song","sword","shield"]', '["lamp","light"]', 'Psalm 119:105'),
  ('Be still, and ___ that I am ___.', '["pray","King","wait"]', '["know","God"]', 'Psalm 46:10'),
  ('I can do all things through ___ who ___ me.', '["faith","loves","angels"]', '["Christ","strengthens"]', 'Philippians 4:13')
) as q(prompt, options, answer, ref);

-- ---------------------------------------------------------------------
-- Make yourself the first admin (after signing up in the app or /admin):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- From then on, change roles in /admin → Members & roles.
-- ---------------------------------------------------------------------
