import { useEffect, useState, useRef } from 'react'
import { searchMulti } from '../api/tmdb'
import type { TMDBSearchResult } from '../api/types'

const DEBOUNCE_MS = 300

export function useSearch(query: string) {
  const [results, setResults] = useState<TMDBSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timer.current = setTimeout(() => {
      searchMulti(query)
        .then((r) => {
          setResults(r)
          setError(null)
        })
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : 'Search failed')
        )
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  return { results, loading, error }
}
