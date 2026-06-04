import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { removeFromWatchlist, rateFromWatchlist } from '../db/queries'
import { POSTER_BASE } from '../api/tmdb'
import { StarRating } from '../components/StarRating'
import type { WatchlistEntry, StarScore } from '../db/types'
import { useSearch } from '../hooks/useSearch'
import { addToWatchlist } from '../db/queries'
import type { TMDBSearchResult } from '../api/types'

// ─── Search-to-add sub-component ─────────────────────────────────────────────

function AddToWatchlist({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { results, loading } = useSearch(query)
  const [adding, setAdding] = useState<number | null>(null)

  async function handleAdd(r: TMDBSearchResult) {
    if (r.media_type !== 'movie' && r.media_type !== 'tv') return
    setAdding(r.id)
    const isMovie = r.media_type === 'movie'
    const title = isMovie ? (r as { title: string }).title : (r as { name: string }).name
    const releaseDate = isMovie
      ? (r as { release_date: string }).release_date
      : (r as { first_air_date: string }).first_air_date
    await addToWatchlist({
      tmdbId: r.id,
      mediaType: r.media_type,
      title,
      posterPath: r.poster_path,
      overview: r.overview ?? '',
      releaseYear: releaseDate?.slice(0, 4) ?? '',
      voteAverage: r.vote_average,
      genreIds: r.genre_ids,
    })
    setAdding(null)
    setQuery('')
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search to add…"
          className="flex-1 bg-white/8 text-white placeholder-gray-500 rounded-2xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-amber-400/50"
          autoFocus
        />
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 text-sm px-3 py-2 shrink-0"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2.5 pb-10">
        {loading && (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-10">No results found</p>
        )}
        {!loading && results.map((r) => {
          if (r.media_type !== 'movie' && r.media_type !== 'tv') return null
          const isMovie = r.media_type === 'movie'
          const title = isMovie ? (r as { title: string }).title : (r as { name: string }).name
          const year = isMovie
            ? (r as { release_date: string }).release_date?.slice(0, 4)
            : (r as { first_air_date: string }).first_air_date?.slice(0, 4)

          return (
            <button
              key={`${r.media_type}:${r.id}`}
              type="button"
              onClick={() => void handleAdd(r)}
              disabled={adding === r.id}
              className="flex gap-3 p-3 rounded-2xl bg-white/5 active:bg-white/10 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                {r.poster_path ? (
                  <img src={`${POSTER_BASE}${r.poster_path}`} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">🎬</div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="font-semibold text-white leading-snug line-clamp-2">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {year && <span>{year} · </span>}
                  <span>{r.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                </p>
              </div>
              <div className="flex items-center shrink-0">
                <span className="text-2xl">{adding === r.id ? '…' : '＋'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Watchlist page ──────────────────────────────────────────────────────

export function WatchlistPage() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [rating, setRating] = useState<WatchlistEntry | null>(null)
  const [pendingScore, setPendingScore] = useState<StarScore | null>(null)
  const [saving, setSaving] = useState(false)

  const watchlist = useLiveQuery(
    () => db.watchlist.orderBy('addedAt').reverse().toArray(),
    []
  ) ?? []

  async function handleRemove(entry: WatchlistEntry) {
    await removeFromWatchlist(entry.mediaType, entry.tmdbId)
  }

  async function handleRate() {
    if (!rating || !pendingScore) return
    setSaving(true)
    try {
      await rateFromWatchlist(rating, pendingScore)
      setRating(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {watchlist.length === 0 ? 'Nothing saved yet' : `${watchlist.length} title${watchlist.length !== 1 ? 's' : ''} to watch`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-sm text-amber-400 font-semibold px-4 py-2 rounded-xl bg-amber-400/10 active:bg-amber-400/20 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Empty state */}
      {watchlist.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center pb-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-white font-semibold text-lg">Your watchlist is empty</p>
          <p className="text-gray-500 text-sm mt-2">
            Tap <strong className="text-gray-400">+ Add</strong> to save movies or shows someone recommended to you
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-6 px-6 py-3 rounded-2xl bg-amber-400 text-black font-bold text-sm active:opacity-80"
          >
            + Add Your First Title
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-3">
        {watchlist.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-3 p-3 rounded-2xl bg-white/5"
          >
            {/* Poster — tap to open detail */}
            <button
              type="button"
              onClick={() => navigate(`/detail/${entry.mediaType}/${entry.tmdbId}`)}
              className="flex-shrink-0 w-14 h-20 rounded-xl overflow-hidden bg-gray-800"
            >
              {entry.posterPath ? (
                <img src={`${POSTER_BASE}${entry.posterPath}`} alt={entry.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">🎬</div>
              )}
            </button>

            {/* Info */}
            <button
              type="button"
              onClick={() => navigate(`/detail/${entry.mediaType}/${entry.tmdbId}`)}
              className="flex-1 text-left flex flex-col justify-center min-w-0"
            >
              <p className="font-semibold text-white leading-snug line-clamp-2">{entry.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {entry.releaseYear && <span>{entry.releaseYear} · </span>}
                <span>{entry.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                {entry.voteAverage > 0 && <span className="ml-1.5">⭐ {entry.voteAverage.toFixed(1)}</span>}
              </p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.overview}</p>
            </button>

            {/* Actions */}
            <div className="flex flex-col items-center justify-center gap-2 shrink-0">
              {/* Mark as watched → rate */}
              <button
                type="button"
                onClick={() => { setRating(entry); setPendingScore(null) }}
                className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-400 text-lg active:bg-amber-400/30 transition-colors"
                title="Mark as watched"
              >
                ✓
              </button>
              {/* Remove */}
              <button
                type="button"
                onClick={() => void handleRemove(entry)}
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 text-base active:bg-white/10 transition-colors"
                title="Remove from watchlist"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Search sheet */}
      {showAdd && <AddToWatchlist onClose={() => setShowAdd(false)} />}

      {/* Rate sheet — shown after tapping ✓ */}
      {rating && (
        <div
          className="fixed inset-0 bg-black/80 flex items-end z-50"
          onClick={() => setRating(null)}
        >
          <div
            className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              {rating.posterPath && (
                <img
                  src={`${POSTER_BASE}${rating.posterPath}`}
                  alt={rating.title}
                  className="w-12 h-16 rounded-xl object-cover"
                />
              )}
              <div>
                <p className="text-white font-bold leading-snug">{rating.title}</p>
                <p className="text-gray-400 text-sm">How was it?</p>
              </div>
            </div>

            <StarRating value={pendingScore ?? undefined} onChange={setPendingScore} size="lg" />

            <button
              type="button"
              disabled={!pendingScore || saving}
              onClick={() => void handleRate()}
              className="w-full mt-6 py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save Rating & Remove from Watchlist'}
            </button>

            <button
              type="button"
              onClick={() => setRating(null)}
              className="w-full mt-2 py-3 rounded-2xl bg-white/5 text-gray-400 text-sm font-medium active:opacity-70"
            >
              Not yet — keep in watchlist
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
