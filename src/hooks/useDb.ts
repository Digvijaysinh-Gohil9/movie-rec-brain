import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAllRatings, getAllWatchlist } from '../db/queries'
import type { Rating, WatchlistEntry } from '../db/types'

/** Live count of rated titles — re-runs when ratings table changes */
export function useRatingCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Initial fetch
    supabase.from('ratings').select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))

    // Real-time subscription
    const channel = supabase
      .channel('ratings-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' },
        () => supabase.from('ratings').select('id', { count: 'exact', head: true })
          .then(({ count: c }) => setCount(c ?? 0))
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return count
}

/** Live count of watchlist entries */
export function useWatchlistCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    supabase.from('watchlist').select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))

    const channel = supabase
      .channel('watchlist-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' },
        () => supabase.from('watchlist').select('id', { count: 'exact', head: true })
          .then(({ count: c }) => setCount(c ?? 0))
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return count
}

/** Live list of all ratings, newest first */
export function useRatings(): Rating[] {
  const [ratings, setRatings] = useState<Rating[]>([])

  useEffect(() => {
    getAllRatings().then(setRatings)

    const channel = supabase
      .channel('ratings-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' },
        () => getAllRatings().then(setRatings)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return ratings
}

/** Live list of watchlist, newest first */
export function useWatchlist(): WatchlistEntry[] {
  const [list, setList] = useState<WatchlistEntry[]>([])

  useEffect(() => {
    getAllWatchlist().then(setList)

    const channel = supabase
      .channel('watchlist-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' },
        () => getAllWatchlist().then(setList)
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return list
}

/** Live watchlist/rating status for a specific title */
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
