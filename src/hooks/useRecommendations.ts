import { useEffect, useState } from 'react'
import { discoverMovies, discoverTV, discoverRandom, normaliseMovie, normaliseTV } from '../api/tmdb'
import { getTasteProfile, getAllSeenIds, getAllRatings } from '../db/queries'
import { rankCandidates } from '../engine/scorer'
import type { ScoredItem } from '../engine/scorer'
import type { ContentItem } from '../api/types'
import type { Rating } from '../db/types'

export type RecommendMode = 'new' | 'rewatch' | 'surprise'

interface UseRecommendationsArgs {
  genreId: number | null
  mediaType: 'movie' | 'tv'
  mode: RecommendMode
}

export function useRecommendations({ genreId, mediaType, mode }: UseRecommendationsArgs) {
  const [results, setResults] = useState<ScoredItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (mode === 'rewatch') {
          // Return the user's own highly-rated titles (score >= 4), sorted by score desc
          const allRatings = await getAllRatings()
          const favs: Rating[] = allRatings
            .filter((r) => r.score >= 4 && (genreId === null || r.genreIds.includes(genreId)))
            .sort((a, b) => b.score - a.score || b.ratedAt.localeCompare(a.ratedAt))
          const items: ScoredItem[] = favs.map((r) => ({
            item: {
              tmdbId: r.tmdbId,
              mediaType: r.mediaType,
              title: r.title,
              overview: '',
              posterPath: r.posterPath,
              backdropPath: null,
              releaseYear: '',
              voteAverage: r.score * 2, // approx display
              genreIds: r.genreIds,
            } satisfies ContentItem,
            score: r.score,
          }))
          if (!cancelled) setResults(items)
          return
        }

        // Fetch 3 pages of candidates
        const pages = [1, 2, 3]
        const raw: ContentItem[] = []

        for (const page of pages) {
          let pageItems: ContentItem[]
          if (mode === 'surprise') {
            const data = await discoverRandom(mediaType, page)
            pageItems = data.results.map((r) =>
              mediaType === 'movie' ? normaliseMovie(r as Parameters<typeof normaliseMovie>[0]) : normaliseTV(r as Parameters<typeof normaliseTV>[0])
            )
          } else {
            if (genreId === null) break
            if (mediaType === 'movie') {
              const data = await discoverMovies(genreId, page)
              pageItems = data.results.map(normaliseMovie)
            } else {
              const data = await discoverTV(genreId, page)
              pageItems = data.results.map(normaliseTV)
            }
          }
          raw.push(...pageItems)
        }

        const profile = await getTasteProfile()
        const seenIds = await getAllSeenIds()
        const ranked = rankCandidates(raw, profile, seenIds, mode === 'surprise' ? 1 : 10)

        if (!cancelled) setResults(ranked)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load recommendations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [genreId, mediaType, mode])

  return { results, loading, error }
}
