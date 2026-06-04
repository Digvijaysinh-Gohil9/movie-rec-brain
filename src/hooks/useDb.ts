import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAllRatings, getAllWatchlist } from '../db/queries'
import type { Rating, WatchlistEntry } from '../db/types'

// ─── Helper: fetch count from a table ────────────────────────────────────────
async function fetchCount(table: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
  return count ?? 0
}

// ─── Rating count ─────────────────────────────────────────────────────────────
export function useRatingCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    void fetchCount('ratings').then(setCount)

    const channel = supabase
      .channel('ratings-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' },
        () => void fetchCount('ratings').then(setCount)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return count
}

// ─── Watchlist count ──────────────────────────────────────────────────────────
export function useWatchlistCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    void fetchCount('watchlist').then(setCount)

    const channel = supabase
      .channel('watchlist-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' },
        () => void fetchCount('watchlist').then(setCount)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return count
}

// ─── All ratings ──────────────────────────────────────────────────────────────
export function useRatings(): Rating[] {
  const [ratings, setRatings] = useState<Rating[]>([])

  useEffect(() => {
    void getAllRatings().then(setRatings)

    const channel = supabase
      .channel('ratings-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' },
        () => void getAllRatings().then(setRatings)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return ratings
}

// ─── All watchlist ────────────────────────────────────────────────────────────
export function useWatchlist(): WatchlistEntry[] {
  const [list, setList] = useState<WatchlistEntry[]>([])

  useEffect(() => {
    void getAllWatchlist().then(setList)

    const channel = supabase
      .channel('watchlist-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' },
        () => void getAllWatchlist().then(setList)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return list
}

// ─── Single title status (watchlist + rating) ─────────────────────────────────
export function useTitleStatus(mediaType: string | undefined, tmdbId: string | undefined) {
  const [onWatchlist, setOnWatchlist] = useState(false)
  const [rating, setRating] = useState<Rating | null>(null)

  useEffect(() => {
    if (!mediaType || !tmdbId) return
    const id = `${mediaType}:${tmdbId}`

    const fetchStatus = async () => {
      const [wRow, rRow] = await Promise.all([
        supabase.from('watchlist').select('id').eq('id', id).maybeSingle(),
        supabase.from('ratings').select('*').eq('id', id).maybeSingle(),
      ])
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
    }

    void fetchStatus()

    const channel = supabase
      .channel(`title-status-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, () => void fetchStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => void fetchStatus())
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [mediaType, tmdbId])

  return { onWatchlist, rating }
}
