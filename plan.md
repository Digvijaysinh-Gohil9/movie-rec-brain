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

## Phase 12 — Recommendation Algorithm (next up)

The current engine scores candidates purely on genre overlap + a small popularity nudge. It works but doesn't use everything we know about the user. Planned improvements:

### 12a — Director & cast affinity
- When a title is rated, store its top-billed director and cast (from TMDB credits) alongside the rating
- Extend `taste_profile` with `directorWeights` and `castWeights` (person ID → weighted avg score)
- Add a cast/director score component to `scorer.ts`
- Titles starring or directed by people you've liked before get boosted

### 12b — TMDB "similar titles" signal
- For each rated title with score ≥ 4, fetch `/movie/{id}/similar` or `/tv/{id}/similar`
- Build a set of "affinity titles" — things TMDB considers similar to your favourites
- Boost candidates that appear in this set
- Cache affinity titles in Supabase to avoid re-fetching on every session

### 12c — Anti-recommendations
- Titles you've rated 1–2 stars reveal what you dislike
- Use low-rated titles to subtract from genre/director/cast weights rather than just ignoring them
- This penalises candidates that match your disliked patterns

### 12d — Recency decay tuning
- Current recency window is binary: < 30 days = 1.5×, older = 1.0×
- Replace with a smooth exponential decay so very recent ratings count more gradually
- Expose a "reset taste profile" option in Settings for when preferences have shifted

### 12e — Surprise Me improvement
- Currently pulls from popularity-sorted discover with no genre filter
- Add a "Surprise Me within a genre" option
- Optionally surface titles outside your usual comfort zone (high TMDB rating but low genre overlap)

### Implementation order
1. 12a (director/cast) — biggest quality improvement, moderate effort
2. 12c (anti-recommendations) — small change to scorer, high impact
3. 12b (similar titles) — requires new Supabase table for caching
4. 12d (recency decay) — pure engine change, no schema changes
5. 12e (Surprise Me) — UI + engine change

---

## Deferred / Maybe

- Watch history import from Letterboxd or Netflix CSV export
- Supabase real-time sync (requires enabling table replication in dashboard)
