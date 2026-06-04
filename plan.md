# Movie Recommender — Build Plan

## Guiding Principles

- Work one phase at a time; each phase produces something runnable
- Never move to the next phase until the current one looks and works correctly
- Paste `instructions.md` as context at the start of each session

---

## Phase 0 — Project Scaffold

**Goal:** A running Vite + React + TS app with Tailwind, Dexie, and TMDB wired up.

- [ ] `npm create vite@latest` with React + TypeScript template
- [ ] Install dependencies:
  - `tailwindcss`, `@tailwindcss/vite`
  - `dexie`, `dexie-react-hooks`
  - `vite-plugin-pwa`
- [ ] Configure Tailwind (`tailwind.config.ts`, import in `index.css`)
- [ ] Create `.env` with `VITE_TMDB_API_KEY` placeholder; add to `.gitignore`
- [ ] Write `api/tmdb.ts` — typed TMDB client (fetch wrapper, base URL, auth header)
- [ ] Smoke test: call `GET /genre/movie/list` and log result in `App.tsx`
- [ ] Set up `vite-plugin-pwa` with manifest (name, icons, `display: standalone`)

**Done when:** `npm run dev` shows a blank page with no console errors and genre list logs in the console.

---

## Phase 1 — Dexie Schema + Types

**Goal:** Database layer in place; all TypeScript types defined.

- [ ] Define types in `db/types.ts`:
  - `Rating`, `TasteProfile`, `SeenId`
- [ ] Write `db/db.ts` — Dexie class with all three tables, version 1 schema
- [ ] Write `db/queries.ts` — helper functions:
  - `saveRating(rating)` — upsert + trigger profile recompute
  - `deleteRating(id)`
  - `getAllRatings()`
  - `isAlreadySeen(id) → boolean`
  - `getTasteProfile()`
  - `saveTasteProfile(profile)`
- [ ] Write typed TMDB response models in `api/types.ts` (Movie, TVShow, SearchResult, Genre)

**Done when:** Dexie opens without errors; can write and read a dummy rating from the browser console.

---

## Phase 2 — Rating Flow (Onboarding Core)

**Goal:** User can search for a title and rate it 1–5 stars.

- [ ] `pages/RatePage.tsx` — search input + results list
- [ ] `hooks/useSearch.ts` — debounced TMDB `/search/multi` with typed results
- [ ] `components/SearchResultCard.tsx` — poster thumbnail, title, year, media type badge
- [ ] `components/StarRating.tsx` — 1–5 star tap input
- [ ] On rating confirm: write to `ratings` + `seenIds` tables
- [ ] Show rated count on the page ("You've rated X titles")

**Done when:** Can search "Inception", tap it, give it 4 stars, and see the count increment. Rating persists on page refresh.

---

## Phase 3 — Taste Profile Engine

**Goal:** Every rating (add/edit/delete) recomputes and persists the taste profile.

- [ ] Write `engine/profileBuilder.ts`:
  - `buildProfile(ratings: Rating[]) → TasteProfile`
  - Genre weights = recency-weighted average score per genre
  - Recency weight: ratings in last 30 days get 1.5×, older get 1.0×
- [ ] Hook `saveRating` / `deleteRating` to call `buildProfile` and persist result
- [ ] Write `engine/scorer.ts`:
  - `scoreCandidate(candidate, profile) → number`
  - Formula: genre overlap weighted sum + 0.1 × (tmdbVoteAverage / 10)
- [ ] Unit-test scorer logic with a few hardcoded cases (plain TS, no test framework needed — just a `testScorer.ts` you can run with `npx tsx`)

**Done when:** After rating 5+ titles, `getTasteProfile()` from the console shows non-zero genre weights that reflect what you rated highly.

---

## Phase 4 — Home Screen + Genre Picker

**Goal:** App entry point — genre grid that triggers recommendation fetch.

- [ ] `pages/HomePage.tsx` — Movies / TV toggle + genre chip grid
- [ ] `hooks/useGenres.ts` — fetches and caches genre lists from TMDB (in-memory, one fetch per session)
- [ ] Tap a genre → navigate to recommendation feed with genre ID in route params
- [ ] Show rated-title count on home screen as a subtle badge

**Done when:** Can tap "Action" and navigate (feed can be a placeholder for now).

---

## Phase 5 — Recommendation Feed

**Goal:** Genre tap produces a ranked, personalised list of 10 titles.

- [ ] `hooks/useRecommendations.ts`:
  - Fetch 3 pages of `/discover/movie` or `/discover/tv` for the selected genre
  - Filter out `seenIds`
  - Score each with `scorer.ts`
  - Return top 10 sorted descending
- [ ] `pages/FeedPage.tsx` — scrollable list of recommendation cards
- [ ] `components/RecommendationCard.tsx` — poster, title, year, TMDB rating, match indicator
- [ ] "Not interested" button → add to `seenIds`, remove from list without refetch
- [ ] Empty state: if < 5 ratings, show unscored TMDB top picks with a "Rate more titles for personalised picks" banner

**Done when:** With 10+ ratings, the feed shows titles that feel relevant to the selected genre and your taste.

---

## Phase 6 — Detail Sheet + Library

**Goal:** Tap a card for details; view and manage everything you've rated.

- [ ] `components/DetailSheet.tsx` — bottom sheet overlay:
  - Full poster, synopsis, cast (top 5), TMDB score, runtime/seasons
  - Trailer deep-link (YouTube via TMDB videos endpoint)
  - "I've watched this" → opens star rating
- [ ] `pages/LibraryPage.tsx` — list of all rated titles
  - Filter: Movies / TV / All, score filter (≥ 3 stars etc.)
  - Tap to edit or delete rating

**Done when:** Can tap any recommendation card, read the synopsis, and update a rating from the library.

---

## Phase 7 — Taste Profile Snapshot

**Goal:** Show the user why they're getting certain recommendations.

- [ ] `pages/ProfilePage.tsx`:
  - Top 5 genres by weight with a simple bar visualisation (plain CSS, no chart lib needed)
  - Average score across all ratings
  - Total rated count (movies vs TV breakdown)

**Done when:** Profile page reflects what you'd expect given your ratings.

---

## Phase 8 — Backup & Restore

**Goal:** Ratings are durable across browser data clears.

- [ ] Export: serialize all `ratings` rows to JSON → trigger browser download
- [ ] Import: file picker → parse JSON → validate schema → upsert into Dexie → recompute profile
- [ ] Surface in a Settings sheet accessible from the home screen

**Done when:** Export a JSON, clear IndexedDB in DevTools, import the JSON, ratings are fully restored.

---

## Phase 9 — Polish + PWA Install

**Goal:** App is installable and feels native.

- [ ] Review all empty states, loading skeletons, error boundaries
- [ ] Confirm PWA manifest: name, short_name, icons (192 + 512), theme_color, `display: standalone`
- [ ] Test "Add to Home Screen" on iPhone
- [ ] Verify offline mode: rated library and profile page work without network; feed shows graceful error
- [ ] Audit Tailwind for consistent spacing, font sizes, touch targets (min 44px)

---

## Phase 10 — Deploy

**Goal:** Live on the internet, accessible from iPhone.

- [ ] `npm run build` — confirm no TS errors, no console warnings
- [ ] Deploy `dist/` to Vercel or Netlify
- [ ] Set `VITE_TMDB_API_KEY` in hosting dashboard environment variables
- [ ] Open on iPhone, install to home screen, run through full flow

---

## Prompt Strategy (same as finance app)

- Paste `instructions.md` once at the start of each session
- Work one phase at a time — "now implement Phase 2: Rating Flow"
- Don't ask for multiple phases at once
- After each phase, test in browser before moving on
