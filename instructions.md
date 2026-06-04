# Movie & Show Recommender — Build Instructions

## Project Goal

Build a **personal content recommendation PWA** that learns your taste from movies and shows you've already rated, then surfaces titles you'll actually want to watch. Genre-first UX: open the app, pick a genre, get a short ranked list tailored to you. No backend, no accounts — ratings live on-device; content comes from TMDB.

---

## Stack & Constraints

- **Vite + React + TypeScript** — same scaffold as the personal finance app
- **Tailwind CSS** for styling
- **`vite-plugin-pwa`** — installable to home screen, works offline for browsing past ratings (content fetches need network)
- **Dexie.js** (IndexedDB) — stores all user ratings and cached taste profile on-device
- **TMDB API** — called directly from the browser (no proxy server needed); key stored in `VITE_TMDB_API_KEY` env var
- **Mobile-first layout** — optimized for iPhone; touch-friendly tap targets
- **Static site deploy** — no server; same deployment approach as finance app (Vercel or Netlify)

---

## Data Model (Dexie tables)

**`ratings`**
- `id` — TMDB content ID (string, e.g. `"movie:550"` or `"tv:1396"`)
- `tmdbId` — numeric TMDB ID
- `mediaType` — `'movie' | 'tv'`
- `title` — cached display title
- `posterPath` — cached TMDB poster path
- `genres` — `number[]` (TMDB genre IDs)
- `score` — `1 | 2 | 3 | 4 | 5` (user rating)
- `ratedAt` — ISO timestamp

**`tasteProfile`** (single row, recomputed on every new rating)
- `id` — always `1`
- `genreWeights` — `Record<number, number>` — genre ID → weighted avg score
- `updatedAt` — ISO timestamp

**`seenIds`** (fast lookup set — never recommend something already rated)
- `id` — same compound key as `ratings.id`

---

## TMDB Integration

- Base URL: `https://api.themoviedb.org/3`
- Key header: `Authorization: Bearer <VITE_TMDB_API_KEY>` (use read access token, not the v3 key)
- Endpoints used:
  - `GET /genre/movie/list` and `GET /genre/tv/list` — genre lists
  - `GET /discover/movie` and `GET /discover/tv` — candidate pool for recommendations (filter by genre, sort by vote_average)
  - `GET /search/multi` — search bar when rating watched titles
  - `GET /movie/{id}` and `GET /tv/{id}` — detail fetch for richer metadata
- Cache genre lists in memory (they rarely change); do not cache discover results

---

## Recommendation Logic (runs in browser, pure TypeScript)

**Taste profile** is a map of `genreId → weightedScore`:
- Each rated title contributes its genres at the user's score, weighted by recency (newer ratings count more)
- Recompute and persist to Dexie after every rating change

**Scoring a candidate**:
```
candidateScore = Σ (genreWeight[g] × genreOverlapFactor) for each genre g in candidate
               + 0.1 × (tmdbVoteAverage / 10)   ← small popularity nudge
```
- Filter out anything already in `seenIds`
- Sort descending by candidateScore, return top 10

**Genre filter flow**:
1. User picks a genre
2. Fetch `discover` candidates for that genre from TMDB (page 1–3, sorted by vote_average)
3. Score each candidate against taste profile
4. Display top 10, ranked

---

## App Entry Flow

```
┌─────────────────────────────────┐
│         OPEN APP                │
│                                 │
│  [🎲 Surprise Me]  ← skips all │
│                                 │
│  Pick a Genre:                  │
│  [ Action ] [ Comedy ] [ Drama ]│
│  [ Horror ] [ Sci-Fi ] [ ... ]  │
│                                 │
│  Movies ○  ●  TV Shows          │
└────────────┬────────────────────┘
             │ (genre selected)
             ▼
┌─────────────────────────────────┐
│  What are you in the mood for?  │
│                                 │
│  [ 🆕 Something New ]           │
│  [ 🔁 Rewatch ]                 │
└────────────┬────────────────────┘
             │
             ▼
     Recommendation Feed
```

- **Surprise Me** — ignores genre and mode; picks randomly from the full TMDB catalogue scored against taste profile; shows 1 bold pick with a "Not this" shuffle button
- **Something New** — candidates filtered to titles NOT in `seenIds`
- **Rewatch** — candidates filtered to titles IN `ratings` with score ≥ 4 (your favourites); sorted by score then recency

---

## Core Features

### 1. Rate Watched Titles (Onboarding + Ongoing)
- Search bar backed by TMDB `/search/multi`
- Tap a result → star rating overlay (1–5)
- Confirm saves to `ratings` table and updates `tasteProfile`
- Show count of rated titles on home screen (encourages critical mass of ~20+ ratings)

### 2. Genre Picker Home Screen
- Grid of genre chips (Movies | TV toggle)
- Tap a genre → recommendation feed

### 3. Recommendation Feed
- Ranked list of up to 10 titles
- Each card: poster, title, year, match score indicator, TMDB rating
- Tap card → detail sheet (synopsis, cast, trailer link)
- "Not interested" button → adds to `seenIds` without a score

### 4. Rated Titles Library
- Scrollable list of everything you've rated
- Edit or delete a rating
- Filter by media type and score

### 5. Taste Profile Snapshot
- Simple breakdown: your top 5 genres by weight, avg score
- Helps user understand why they're getting certain recommendations

### 6. Backup & Restore
- Export ratings to JSON (save to iCloud Drive)
- Import from JSON to restore
- Validate schema on import

---

## Quality Requirements

- **No `any`** — TypeScript types for every entity and API response
- **Dexie hooks** (`dexie-react-hooks` `useLiveQuery`) for reactive UI
- **TMDB rate limit awareness** — debounce search input (300 ms); don't hammer discover on every keystroke
- Handle empty states: zero ratings (prompt to rate), genre with no scoreable candidates (show top TMDB picks without personalisation, labelled as such)
- Clean folder structure:
  - `db/` — Dexie schema, types, queries
  - `api/` — TMDB client and typed response models
  - `engine/` — taste profile builder + candidate scorer
  - `components/`
  - `hooks/`
  - `pages/`

---

## Environment Variables

```
VITE_TMDB_API_KEY=your_tmdb_read_access_token_here
```

Add `.env` to `.gitignore`. Never commit the key.

---

## Deployment

Same approach as personal finance app — static site, no server required. Steps:
1. `npm run build` → `dist/` folder
2. Deploy `dist/` to Vercel or Netlify (drag-and-drop or CLI)
3. Set `VITE_TMDB_API_KEY` as an environment variable in the hosting dashboard
4. Done — no backend, no database to manage

---

## Deferred (Phase 2)

- **Collaborative signals** — pull in TMDB "similar titles" as an additional scoring signal
- **Director / actor affinity** — extend taste profile beyond genres to specific people
- **"Surprise me" mode** — intentionally surface outside comfort zone with high TMDB rating
- **Watch history import** — parse Letterboxd or Netflix export CSV to bulk-seed ratings
