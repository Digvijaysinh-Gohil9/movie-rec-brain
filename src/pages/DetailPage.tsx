import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMovieDetail, fetchTVDetail, POSTER_BASE, BACKDROP_BASE } from '../api/tmdb'
import type { TMDBMovieDetail, TMDBTVDetail } from '../api/types'
import { StarRating } from '../components/StarRating'
import { saveRating, addToWatchlist, removeFromWatchlist } from '../db/queries'
import { useTitleStatus } from '../hooks/useDb'
import type { StarScore } from '../db/types'

type Detail = TMDBMovieDetail | TMDBTVDetail

function isMovie(d: Detail): d is TMDBMovieDetail {
  return 'title' in d
}

export function DetailPage() {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingScore, setPendingScore] = useState<StarScore | null>(null)
  const [showRateSheet, setShowRateSheet] = useState(false)

  // Live rating + watchlist status from Supabase
  const { onWatchlist, rating: existingRating } = useTitleStatus(mediaType, id)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  async function handleWatchlistToggle() {
    if (!detail || !mediaType || watchlistLoading) return
    setWatchlistLoading(true)
    try {
      if (onWatchlist) {
        await removeFromWatchlist(mediaType as 'movie' | 'tv', detail.id)
      } else {
        const titleStr = isMovie(detail) ? detail.title : detail.name
        const releaseDate = isMovie(detail) ? detail.release_date : detail.first_air_date
        await addToWatchlist({
          tmdbId: detail.id,
          mediaType: mediaType as 'movie' | 'tv',
          title: titleStr,
          posterPath: detail.poster_path,
          overview: detail.overview,
          releaseYear: releaseDate?.slice(0, 4) ?? '',
          voteAverage: detail.vote_average,
          genreIds: detail.genres.map((g) => g.id),
        })
      }
    } finally {
      setWatchlistLoading(false)
    }
  }

  useEffect(() => {
    if (!id || !mediaType) return
    setLoading(true)
    const fetcher = mediaType === 'movie'
      ? () => fetchMovieDetail(Number(id))
      : () => fetchTVDetail(Number(id))

    fetcher()
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id, mediaType])

  // Sync pending score with existing rating when sheet opens
  useEffect(() => {
    if (showRateSheet && existingRating) {
      setPendingScore(existingRating.score)
    }
  }, [showRateSheet, existingRating])

  async function handleSaveRating() {
    if (!detail || !pendingScore || !mediaType) return
    setSaving(true)
    try {
      const title = isMovie(detail) ? detail.title : detail.name
      await saveRating({
        tmdbId: detail.id,
        mediaType: mediaType as 'movie' | 'tv',
        title,
        posterPath: detail.poster_path,
        genreIds: detail.genres.map((g) => g.id),
        score: pendingScore,
      })
      setShowRateSheet(false)
    } finally {
      setSaving(false)
    }
  }

  // Get trailer key
  const trailerKey = detail?.videos?.results.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && v.official
  )?.key ?? detail?.videos?.results.find(
    (v) => v.site === 'YouTube'
  )?.key

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
        <div className="h-52 bg-white/5 animate-pulse" />
        <div className="px-5 pt-5 flex flex-col gap-3">
          <div className="h-7 w-3/4 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-4 w-1/2 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-24 bg-white/5 rounded-xl animate-pulse mt-2" />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center px-10">
          <p className="text-red-400 text-sm">{error ?? 'Not found'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-gray-400 text-sm">← Go back</button>
        </div>
      </div>
    )
  }

  const title = isMovie(detail) ? detail.title : detail.name
  const tagline = detail.tagline
  const overview = detail.overview
  const releaseDate = isMovie(detail) ? detail.release_date : detail.first_air_date
  const year = releaseDate?.slice(0, 4) ?? ''
  const meta = isMovie(detail)
    ? `${detail.runtime ? `${detail.runtime} min` : ''}`
    : `${(detail as TMDBTVDetail).number_of_seasons} season${(detail as TMDBTVDetail).number_of_seasons !== 1 ? 's' : ''}`
  const cast = detail.credits?.cast.slice(0, 6) ?? []
  const genres = detail.genres

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col pb-32">
      {/* Back button floating */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed top-14 left-4 z-20 bg-black/60 backdrop-blur text-white text-sm px-3 py-1.5 rounded-full"
      >
        ← Back
      </button>

      {/* Backdrop */}
      {detail.backdrop_path ? (
        <div className="relative">
          <img
            src={`${BACKDROP_BASE}${detail.backdrop_path}`}
            alt={title}
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f0f]" />
        </div>
      ) : (
        <div className="h-32 bg-white/5" />
      )}

      {/* Content */}
      <div className="px-5 -mt-4 flex gap-4">
        {/* Poster */}
        {detail.poster_path && (
          <img
            src={`${POSTER_BASE}${detail.poster_path}`}
            alt={title}
            className="w-24 h-36 rounded-2xl object-cover shadow-xl flex-shrink-0 -mt-10 relative z-10"
          />
        )}
        {/* Title block */}
        <div className="flex flex-col justify-end pt-2 min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight line-clamp-2">{title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            {year}{meta ? ` · ${meta}` : ''} · ⭐ {detail.vote_average.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Tagline */}
      {tagline && (
        <p className="px-5 mt-3 text-sm text-gray-500 italic">{tagline}</p>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <div className="px-5 mt-3 flex flex-wrap gap-2">
          {genres.map((g) => (
            <span key={g.id} className="text-xs px-3 py-1 rounded-full bg-white/8 text-gray-300">
              {g.name}
            </span>
          ))}
        </div>
      )}

      {/* Overview */}
      <div className="px-5 mt-4">
        <p className="text-sm text-gray-300 leading-relaxed">{overview}</p>
      </div>

      {/* Cast */}
      {cast.length > 0 && (
        <div className="mt-5">
          <p className="px-5 text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Cast</p>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-none">
            {cast.map((member) => (
              <div key={member.id} className="flex-shrink-0 w-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/8 overflow-hidden mx-auto mb-1.5">
                  {member.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{member.name}</p>
                <p className="text-gray-500 text-[10px] leading-tight line-clamp-1 mt-0.5">{member.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trailer */}
      {trailerKey && (
        <div className="px-5 mt-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Trailer</p>
          <a
            href={`https://www.youtube.com/watch?v=${trailerKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-red-600/15 border border-red-600/20 active:opacity-70 transition-opacity"
          >
            <span className="text-2xl">▶️</span>
            <span className="text-white font-medium text-sm">Watch Trailer on YouTube</span>
          </a>
        </div>
      )}

      {/* Rate CTA — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0f0f0f] to-transparent flex flex-col gap-2">
        {/* Watchlist toggle — only show if not yet rated */}
        {!existingRating && (
          <button
            type="button"
            onClick={() => void handleWatchlistToggle()}
            disabled={watchlistLoading}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm active:opacity-70 transition-all flex items-center justify-center gap-2 ${
              onWatchlist
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/8 text-gray-300'
            }`}
          >
            {onWatchlist ? '📋 On your watchlist — tap to remove' : '+ Add to Watchlist'}
          </button>
        )}
        {existingRating ? (
          <button
            type="button"
            onClick={() => setShowRateSheet(true)}
            className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base active:opacity-70 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="text-amber-400">{'★'.repeat(existingRating.score)}</span>
            <span className="text-gray-400 text-sm">Edit rating</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setPendingScore(null); setShowRateSheet(true) }}
            className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold text-base active:opacity-80 transition-opacity"
          >
            I've watched this — Rate it
          </button>
        )}
      </div>

      {/* Rating bottom sheet */}
      {showRateSheet && (
        <div
          className="fixed inset-0 bg-black/80 flex items-end z-50"
          onClick={() => setShowRateSheet(false)}
        >
          <div
            className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-bold text-lg text-center mb-1">{title}</p>
            <p className="text-gray-400 text-sm text-center mb-5">How would you rate it?</p>
            <StarRating
              value={pendingScore ?? existingRating?.score}
              onChange={setPendingScore}
              size="lg"
            />
            <button
              type="button"
              disabled={!pendingScore || saving}
              onClick={() => void handleSaveRating()}
              className="w-full mt-6 py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity"
            >
              {saving ? 'Saving…' : existingRating ? 'Update Rating' : 'Save Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
