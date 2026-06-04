# Movie Recommender — Build Plan

## Status

All phases complete and deployed at `movie-rec-brain.vercel.app`.

---

## What was built

### Phase 0 — Scaffold
Vite + React + TypeScript + Tailwind CSS. PWA manifest configured. TMDB API client wired up.

### Phase 1 — Database layer
Supabase tables: `ratings`, `watchlist`, `seen`, `taste_profile`.
Row-level security policies so each user only sees their own data.
TypeScript types for all entities.

### Phase 2 — Rating flow
Search any movie or TV show (TMDB `/search/multi`), tap it, give it 1–5 stars.
Saves to Supabase and recomputes the taste profile.

### Phase 3 — Taste profile engine
`engine/profileBuilder.ts` — recency-weighted genre scoring from all ratings.
`engine/scorer.ts` — scores TMDB candidates against your profile.
Both are pure TypeScript functions, run in the browser.

### Phase 4–5 — Home screen + recommendation feed
- Genre picker (Movies / TV toggle)
- Mode selector: Something New → unseen titles, Rewatch → your 4+ star titles in that genre
- 🎲 Surprise Me → random pick from full catalogue, scored against your taste
- Feed shows top 10 ranked results with dismiss button

### Phase 6 — Detail page
Backdrop, poster, tagline, genres, synopsis, cast row, trailer link (YouTube).
"I've watched this — Rate it" CTA pinned at the bottom.
Add to Watchlist button if not yet rated.

### Phase 7 — Library
All rated titles with filter by media type and minimum score.
Tap to edit rating or delete.

### Phase 8 — Watchlist
Save titles someone recommended before you've watched them.
Tap ✓ → rate it → moves to library automatically.
Search-to-add sheet with TMDB lookup.

### Phase 9 — Auth + cloud sync
Supabase Auth (email/password, email confirmation disabled).
All data scoped to the logged-in user via RLS.
Works across devices — sign in anywhere and your ratings are there.
Sign out in Settings.

### Phase 10 — Settings + backup
Export ratings + watchlist as JSON (iCloud/Files backup).
Import from JSON — bulk upsert, single profile recompute.
Rated count and watchlist count shown on the page.

### Phase 11 — Deploy
`vercel.json` with SPA rewrites.
Three env vars in Vercel dashboard: `VITE_TMDB_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
GitHub → Vercel auto-deploy on every push to main.

---

## Architecture

```
Browser
├── React UI (Vite + Tailwind)
├── Recommendation engine (pure TS, runs client-side)
└── Supabase JS client
      ├── Auth (session management)
      ├── ratings / watchlist / seen / taste_profile tables
      └── RLS: each user sees only their own rows

External APIs
└── TMDB — genre lists, discover, search, detail, trailers
```

---

## Deferred (possible Phase 2)

- Director / actor affinity in taste profile
- "Surprise me" within a specific genre
- Watch history import from Letterboxd or Netflix CSV
- Supabase real-time sync (requires enabling table replication in dashboard)
