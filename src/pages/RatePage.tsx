import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../hooks/useSearch'
import { saveRating } from '../db/queries'
import { StarRating } from '../components/StarRating'
import { POSTER_BASE } from '../api/tmdb'
import type { TMDBSearchResult } from '../api/types'
import type { StarScore } from '../db/types'
import { useRatingCount } from '../hooks/useDb'

export function RatePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<TMDBSearchResult | null>(null)
  const [pendingScore, setPendingScore] = useState<StarScore | null>(null)
  const [saving, setSaving] = useState(false)
  const { results, loading } = useSearch(query)
  const ratingCount = useRatingCount()

  async function handleConfirmRating() {
    if (!selected || !pendingScore) return
    setSaving(true)
    try {
      const isMovie = selected.media_type === 'movie'
      await saveRating({
        tmdbId: selected.id,
        mediaType: selected.media_type as 'movie' | 'tv',
        title: isMovie ? (selected as { title: string }).title : (selected as { name: string }).name,
        posterPath: selected.poster_path,
        genreIds: selected.genre_ids,
        score: pendingScore,
      })
      setSelected(null)
      setPendingScore(null)
      setQuery('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-gray-500 text-sm mb-3 flex items-center gap-1"
        >
          ← Home
        </button>
        <h1 className="text-2xl font-bold text-white">Rate Titles</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {ratingCount === 0
            ? 'Rate 10+ titles for best personalisation'
            : `${ratingCount} title${ratingCount !== 1 ? 's' : ''} rated`}
        </p>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies or TV shows…"
          className="w-full bg-white/8 text-white placeholder-gray-500 rounded-2xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-amber-400/50"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-2.5">
        {loading && (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-10">No results found</p>
        )}

        {!loading && results.map((r) => {
          const isMovie = r.media_type === 'movie'
          const title = isMovie ? (r as { title: string }).title : (r as { name: string }).name
          const year = isMovie
            ? (r as { release_date: string }).release_date?.slice(0, 4)
            : (r as { first_air_date: string }).first_air_date?.slice(0, 4)

          return (
            <button
              key={`${r.media_type}:${r.id}`}
              type="button"
              onClick={() => { setSelected(r); setPendingScore(null) }}
              className="flex gap-3 p-3 rounded-2xl bg-white/5 active:bg-white/10 transition-colors text-left"
            >
              <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                {r.poster_path ? (
                  <img
                    src={`${POSTER_BASE}${r.poster_path}`}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">🎬</div>
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <p className="font-semibold text-white leading-snug line-clamp-2">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {year && <span>{year} · </span>}
                  <span className="capitalize">{r.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Rating overlay */}
      {selected && (() => {
        const isMovie = selected.media_type === 'movie'
        const title = isMovie ? (selected as { title: string }).title : (selected as { name: string }).name
        return (
          <div
            className="fixed inset-0 bg-black/80 flex items-end z-50"
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                {selected.poster_path && (
                  <img
                    src={`${POSTER_BASE}${selected.poster_path}`}
                    alt={title}
                    className="w-14 h-20 rounded-xl object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-bold text-lg leading-snug">{title}</p>
                  <p className="text-gray-400 text-sm capitalize">{selected.media_type === 'tv' ? 'TV Show' : 'Movie'}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm text-center mb-4">How would you rate it?</p>
              <StarRating value={pendingScore ?? undefined} onChange={setPendingScore} size="lg" />
              <button
                type="button"
                disabled={!pendingScore || saving}
                onClick={() => void handleConfirmRating()}
                className="w-full mt-6 py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity"
              >
                {saving ? 'Saving…' : 'Save Rating'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
