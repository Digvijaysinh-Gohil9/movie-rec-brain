import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAllRatings, getAllWatchlist } from '../db/queries'
import type { Rating, WatchlistEntry } from '../db/types'

// ─── Rating count ─────────────────────────────────────────────────────────────
export function useRatingCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    supabase.from('ratings')
      .select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))
  }, [])
  return count
}

// ─── Watchlist count ──────────────────────────────────────────────────────────
export function useWatchlistCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    supabase.from('watchlist')
      .select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))
  }, [])
  return count
}

// ─── All ratings ──────────────────────────────────────────────────────────────
export function useRatings(): Rating[] {
  const [ratings, setRatings] = useState<Rating[]>([])
  useEffect(() => {
    void getAllRatings().then(setRatings)
  }, [])
  return ratings
}

// ─── All watchlist ────────────────────────────────────────────────────────────
export function useWatchlist(): WatchlistEntry[] {
  const [list, setList] = useState<WatchlistEntry[]>([])
  useEffect(() => {
    void getAllWatchlist().then(setList)
  }, [])
  return list
}

// ─── Single title status ──────────────────────────────────────────────────────
export function useTitleStatus(mediaType: string | undefined, tmdbId: string | undefined) {
  const [onWatchlist, setOnWatchlist] = useState(false)
  const [rating, setRating] = useState<Rating | null>(null)

  useEffect(() => {
    if (!mediaType || !tmdbId) return
    const id = `${mediaType}:${tmdbId}`

    void Promise.all([
      supabase.from('watchlist').select('id').eq('id', id).maybeSingle(),
      supabase.from('ratings').select('*').eq('id', id).maybeSingle(),
    ]).then(([wRow, rRow]) => {
      setOnWatchlist(wRow.data !== null)
      if (rRow.data) {
        setRating({
          id:         rRow.data['id'] as string,
          tmdbId:     rRow.data['tmdb_id'] as number,
          mediaType:  rRow.data['media_type'] as 'movie' | 'tv',
          title:      rRow.data['title'] as string,
          posterPath: rRow.data['poster_path'] as string | null,
          genreIds:   rRow.data['genre_ids'] as number[],
          score:      rRow.data['score'] as Rating['score'],
          ratedAt:    rRow.data['rated_at'] as string,
        })
      } else {
        setRating(null)
      }
    })
  }, [mediaType, tmdbId])

  return { onWatchlist, rating }
}
