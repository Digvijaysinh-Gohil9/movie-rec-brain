# movie-rec-brain

A personal movie and TV show recommendation app. You rate what you've watched, pick a genre, and it tells you what to watch next.

## How it works

- Rate titles you've seen (1–5 stars)
- Pick a genre → get a ranked list tailored to your taste
- Hit "Surprise Me" for a random pick
- Save titles to a watchlist, mark them watched, rate them
- Your data syncs across devices via Supabase

## Stack

- Vite + React + TypeScript + Tailwind CSS
- Supabase (auth + database)
- TMDB API (movie/show data)
- Deployed on Vercel

## Setup

```bash
npm install
```

Create a `.env` file:
```
VITE_TMDB_API_KEY=your_tmdb_read_access_token
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the SQL in `supabase/migration.sql` in your Supabase SQL editor, then:

```bash
npm run dev
```
