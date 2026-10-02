#!/bin/bash
# Copies the church's starter content (reading plans, songs, game packs, Kids/Teens/Squad posts, serve board,
# sample testimonies) from a database into the app, so the app has real content even with no backend (demo build).
# usage: PSQL="psql postgresql://…" backend/tools/export-seed.sh
set -e
PSQL=${PSQL:-psql}
OUT=$(dirname "$0")/../../app/src/data/seed.json
$PSQL -Atq -c "select json_build_object(
  'reading_plans', (select json_agg(json_build_object('id', id, 'slug', slug, 'title', title, 'subtitle', subtitle, 'description', description, 'audience', audience, 'image', image, 'color', color, 'days', days) order by position) from public.reading_plans where published),
  'songs', (select json_agg(json_build_object('slug', slug, 'title', title, 'author', author, 'original_key', original_key, 'tempo', tempo, 'time_sig', time_sig, 'tags', tags, 'body', body, 'language', language, 'copyright', copyright) order by position) from public.songs where published),
  'question_packs', (select json_agg(json_build_object('game', p.game, 'audience', p.audience, 'title', p.title, 'questions', (select json_agg(json_build_object('prompt', q.prompt, 'options', q.options, 'answer', q.answer, 'reference', q.reference)) from public.questions q where q.pack_id = p.id))) from public.question_packs p where p.published),
  'ministry_posts', (select json_agg(json_build_object('id', id, 'ministry', ministry, 'kind', kind, 'title', title, 'body', body, 'ref', ref, 'youtube_id', youtube_id, 'image', image, 'color', color, 'starts_at', starts_at, 'link', link, 'pinned', pinned) order by ministry, pinned desc, position) from public.ministry_posts where published),
  'serve_opportunities', (select json_agg(json_build_object('id', id, 'team', team, 'title', title, 'description', description, 'starts_at', starts_at, 'ends_at', ends_at, 'location', location, 'slots', slots) order by starts_at) from public.serve_opportunities where published),
  'testimonies', (select json_agg(json_build_object('id', id, 'title', title, 'body', body, 'category', category, 'author_name', author_name, 'featured', featured) order by featured desc, created_at desc) from public.testimonies where approved)
)" > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
