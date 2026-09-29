-- Minimal demo content so the app has something to show once connected.
insert into public.series (title, book) values ('Unshakeable', 'Romans'), ('Psalms after dark', 'Psalms'), ('A church on the move', 'Acts');
insert into public.videos (title, speaker, description, is_live, youtube_id)
values ('The Power of Grace', 'Ps. John Mathew', 'Grace isn''t just a gift. It''s a way of life.', true, null),
       ('Faith over Fear', 'Ps. Sarah Thomas', 'Joshua 1 and the courage that comes from God''s presence.', false, null);
insert into public.campaigns (title, description, goal, raised) values
 ('Building Fund', 'A new sanctuary for 1,200 seats and a kids'' wing.', 250000, 170400),
 ('Mission Nepal', 'Sending 14 people to serve in rural schools.', 20000, 8400),
 ('Families in Need', 'Groceries, rent support and school fees.', 15000, 12750);
insert into public.events (title, starts_at, location) values
 ('Revival Nights', '2026-10-16 19:00+03', 'Main Hall'),
 ('Life''s Big Questions', '2026-10-21 19:30+03', 'Café Room'),
 ('Ignite Youth Camp', '2026-11-06 16:00+03', 'Camp site');
with p as (insert into public.question_packs (title, game, published) values ('Starter pack', 'trivia', true) returning id)
insert into public.questions (pack_id, prompt, options, answer) select p.id, q.prompt, q.options::jsonb, q.answer::jsonb from p, (values
 ('Who built the ark?', '["Moses","Noah","Abraham","David"]', '1'),
 ('How many books are in the Bible?', '["39","27","66","73"]', '2'),
 ('Where was Jesus born?', '["Nazareth","Jerusalem","Bethlehem","Capernaum"]', '2')) as q(prompt, options, answer);
