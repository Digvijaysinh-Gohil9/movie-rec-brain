import { useSearchParams, useNavigate } from 'react-router-dom'
import { useRecommendations } from '../hooks/useRecommendations'
import type { RecommendMode } from '../hooks/useRecommendations'
import { RecommendationCard } from '../components/RecommendationCard'
import { markNotInterested } from '../db/queries'
import { useState } from 'react'
import type { ScoredItem } from '../engine/scorer'

export function FeedPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const genreId = params.get('genreId') ? Number(params.get('genreId')) : null
  const mediaType = (params.get('mediaType') ?? 'movie') as 'movie' | 'tv'
  const mode = (params.get('mode') ?? 'new') as RecommendMode
  const genreName = params.get('genre') ?? ''

  const { results: initial, loading, error } = useRecommendations({ genreId, mediaType, mode })
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const results = initial.filter((r) => !dismissed.has(`${r.item.mediaType}:${r.item.tmdbId}`))

  async function handleNotInterested(item: ScoredItem['item']) {
    await markNotInterested(item.mediaType, item.tmdbId)
    setDismissed((prev) => new Set(prev).add(`${item.mediaType}:${item.tmdbId}`))
  }

  const modeLabel =
    mode === 'surprise' ? '🎲 Surprise Me' :
    mode === 'rewatch' ? '🔁 Rewatch' :
    '🆕 Something New'

  const title = mode === 'surprise' ? 'Surprise Me' : genreName

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
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{modeLabel} · {mediaType === 'tv' ? 'TV Shows' : 'Movies'}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-10">
        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: mode === 'surprise' ? 1 : 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes('VITE_TMDB_API_KEY') && (
              <p className="text-gray-500 text-xs mt-2 max-w-xs mx-auto">
                Add your TMDB read access token to the <code className="bg-white/10 px-1 rounded">.env</code> file and restart the dev server.
              </p>
            )}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-white font-semibold">Nothing left to show</p>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'rewatch'
                ? 'Rate some titles 4+ stars to see them here'
                : 'You\'ve seen everything in this genre!'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium"
            >
              Back to genres
            </button>
          </div>
        )}

        {/* Surprise Me — single bold pick */}
        {mode === 'surprise' && results.length > 0 && !loading && (
          <div className="flex flex-col gap-4">
            <SurprisePick
              scored={results[0]!}
              onNotInterested={() => void handleNotInterested(results[0]!.item)}
            />
          </div>
        )}

        {/* Normal feed */}
        {mode !== 'surprise' && results.length > 0 && !loading && (
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <RecommendationCard
                key={`${r.item.mediaType}:${r.item.tmdbId}`}
                item={r.item}
                score={r.score}
                rank={i + 1}
                onNotInterested={() => void handleNotInterested(r.item)}
                onClick={() => navigate(`/detail/${r.item.mediaType}/${r.item.tmdbId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SurprisePick({ scored, onNotInterested }: { scored: ScoredItem; onNotInterested: () => void }) {
  const navigate = useNavigate()
  const { item } = scored
  const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780'

  return (
    <div
      className="rounded-3xl overflow-hidden bg-white/5 active:opacity-90 cursor-pointer"
      onClick={() => navigate(`/detail/${item.mediaType}/${item.tmdbId}`)}
    >
      {item.backdropPath && (
        <img
          src={`${BACKDROP_BASE}${item.backdropPath}`}
          alt={item.title}
          className="w-full h-52 object-cover"
        />
      )}
      <div className="p-5">
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1">Your pick</p>
        <p className="text-xl font-bold text-white">{item.title}</p>
        <p className="text-sm text-gray-400 mt-0.5">
          {item.releaseYear} · {item.mediaType === 'tv' ? 'TV Show' : 'Movie'} · ⭐ {item.voteAverage.toFixed(1)}
        </p>
        <p className="text-sm text-gray-400 mt-2 line-clamp-3">{item.overview}</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNotInterested() }}
          className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-gray-400 text-sm font-medium active:bg-white/20 transition-colors"
        >
          Not this → shuffle
        </button>
      </div>
    </div>
  )
}
