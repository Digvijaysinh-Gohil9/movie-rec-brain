import { useEffect, useState } from 'react'
import { fetchMovieGenres, fetchTVGenres } from '../api/tmdb'
import type { TMDBGenre } from '../api/types'

// In-memory cache — one fetch per session per type
const cache: { movie?: TMDBGenre[]; tv?: TMDBGenre[] } = {}

export function useGenres(mediaType: 'movie' | 'tv') {
  const [genres, setGenres] = useState<TMDBGenre[]>(cache[mediaType] ?? [])
  const [loading, setLoading] = useState(!cache[mediaType])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cache[mediaType]) {
      setGenres(cache[mediaType]!)
      setLoading(false)
      return
    }
    setLoading(true)
    const fetcher = mediaType === 'movie' ? fetchMovieGenres : fetchTVGenres
    fetcher()
      .then((g) => {
        cache[mediaType] = g
        setGenres(g)
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load genres')
      )
      .finally(() => setLoading(false))
  }, [mediaType])

  return { genres, loading, error }
}
