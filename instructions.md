# Movie Recommender — Build Instructions

## Project Goal

A personal content recommendation app. You rate movies and shows you've watched, pick a genre, and get a ranked list of what to watch next. Genre-first UX: open the app, pick a genre (or hit Surprise Me), get recommendations based on your own taste.

---

## App Entry Flow

```
Open app → Sign In / Sign Up
             ↓
     Home screen
     ┌─────────────────────────────────┐
     │  [🎲 Surprise Me]               │
     │                                 │
     │  Movies ○  ●  TV Shows          │
     │                                 │
     │  [ Action ] [ Comedy ] [ Drama ]│
     │  [ Horror ] [ Sci-Fi ] [ ... ]  │
     └────────────┬────────────────────┘
                  │ (genre selected)
                  ▓
     ┌─────────────────────────────────┐
     │  What are you in the mood for?  │
     │  [ 🆕 Something New ]           │
     │  [ 🔁 Rewatch ]                 │
     └─────────────────────────────────┘
                  ↓
         Recommendation Feed
```

- **Surprise Me** — ignores genre, picks randomly from full TMDB catalogue scored against taste profile. Shows one bold pick with a shuffle button.
- **Something New** — candidates filtered to titles not in `seen`
- **Rewatch** — titles in `ratings` with score ≥ 4, sorted by score

---

## Stack

- **Vite + React + TypeScript** — build tooling and UI
- **Tailwind CSS v4** — styling (`@import "tailwindcss"` syntax, `@tailwindcss/vite` plugin)
- **`vite-plugin-pwa`** — installable to home screen, offline shell
- **Supabase** — auth (email/password) + Postgres database (ratings, watchlist, seen, taste_profile)
- **TMDB API** — all movie and TV data, called directly from the browser
- **Vercel** — static site deploy with `vercel.json` SPA rewrites

---

## Environment Variables

```
VITE_TMDB_API_KEY=your_tmdb_read_access_token
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit `.env`. Set the same three vars in Vercel → Settings → Environment Variables.

---

## Supabase Setup

Run `supabase/migration.sql` in the Supabase SQL editor once to create all tables with RLS policies.

In Supabase → Authentication → Providers → Email: **disable "Confirm email"** so sign-up works without email verification.

---

## Data Model

**`ratings`** — `id` (compound: "movie:550"), `user_id`, `tmdb_id`, `media_type`, `title`, `poster_path`, `genre_ids[]`, `score` (1–5), `rated_at`

**`watchlist`** — `id`, `user_id`, `tmdb_id`, `media_type`, `title`, `poster_path`, `overview`, `release_year`, `vote_average`, `genre_ids[]`, `added_at`

**`seen`** — `id`, `user_id` — fast lookup set; includes rated titles and dismissed recommendations

**`taste_profile`** — `user_id` (PK), `genre_weights` (JSONB: genre_id → weighted avg score), `updated_at`

All tables use `default auth.uid()` for `user_id` and RLS policies that enforce `auth.uid() = user_id`.

---

## TMDB Integration

- Base URL: `https://api.themoviedb.org/3`
- Auth: `Authorization: Bearer <VITE_TMDB_API_KEY>` (read access token, not v3 key)
- Endpoints used:
  - `/genre/movie/list`, `/genre/tv/list` — cached in memory per session
  - `/discover/movie`, `/discover/tv` — candidate pool (3 pages per request)
  - `/search/multi` — search bar, debounced 300ms
  - `/movie/{id}`, `/tv/{id}` — detail page with `append_to_response=credits,videos`

---

## Recommendation Engine

**Taste profile** (`engine/profileBuilder.ts`):
- Recency weight: ratings < 30 days old count 1.5×
- `genreWeights[genreId] = weightedScoreSum / weightSum` across all rated titles

**Scoring** (`engine/scorer.ts`):
```
score = Σ genreWeight[g] for each shared genre
      + 0.1 × (voteAverage / 10)
```
Filter `seen` ids, sort descending, return top 10. Both functions are pure TypeScript — no network calls.

---

## Features

1. **Sign in / Sign up** — email + password via Supabase Auth
2. **Rate Titles** — search TMDB, tap, star rating (1–5), saves to Supabase + recomputes profile
3. **Home screen** — genre grid, Movies/TV toggle, Surprise Me
4. **Mode selector** — Something New or Rewatch after picking a genre
5. **Recommendation Feed** — ranked cards, dismiss button, empty states
6. **Detail Page** — backdrop, poster, genres, synopsis, cast, trailer link, rate/watchlist CTA
7. **Library** — all rated titles, filter by type and score, edit or delete ratings
8. **Watchlist** — save titles to watch later, mark watched → rate → moves to library
9. **Settings** — export/import JSON backup, sign out, rated/watchlist counts

---

## Folder Structure

```
src/
├── api/          TMDB client + response types
├── contexts/     AuthContext (Supabase session)
├── db/           Supabase queries + TypeScript types
├── engine/       profileBuilder + scorer (pure functions)
├── hooks/        useGenres, useSearch, useRecommendations, useDb
├── lib/          supabase.ts (client init)
├── pages/        HomePage, FeedPage, RatePage, DetailPage,
│                 LibraryPage, WatchlistPage, SettingsPage, AuthPage
└── components/   StarRating, RecommendationCard
supabase/
└── migration.sql
vercel.json       SPA rewrites (all routes → index.html)
```

---

## Deploy Checklist

- [ ] Run `supabase/migration.sql` in Supabase SQL editor
- [ ] Disable email confirmation in Supabase Auth settings
- [ ] Push to GitHub
- [ ] Import repo in Vercel, set all 3 env vars before first deploy
- [ ] Verify at production URL — sign up, import backup JSON, check recommendations

---

## Prompt Strategy

- Paste this file as context once at the start of each session
- Work one feature at a time, test before moving on
- Check `plan.md` for what's done and what's deferred
