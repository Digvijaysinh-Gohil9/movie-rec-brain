import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteRating, saveRating } from '../db/queries'
import { useRatings } from '../hooks/useDb'
import { POSTER_BASE } from '../api/tmdb'
import { StarRating } from '../components/StarRating'
import type { Rating, StarScore } from '../db/types'

type MediaFilter = 'all' | 'movie' | 'tv'
type ScoreFilter = 0 | 1 | 2 | 3 | 4 | 5

export function LibraryPage() {
  const navigate = useNavigate()
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [minScore, setMinScore] = useState<ScoreFilter>(0)
  const [editing, setEditing] = useState<Rating | null>(null)
  const [pendingScore, setPendingScore] = useState<StarScore | null>(null)
  const [saving, setSaving] = useState(false)

  const ratings = useRatings()

  const filtered = ratings.filter((r) => {
    if (mediaFilter !== 'all' && r.mediaType !== mediaFilter) return false
    if (minScore > 0 && r.score < minScore) return false
    return true
  })

  async function handleDelete(id: string) {
    await deleteRating(id)
    setEditing(null)
  }

  async function handleUpdateRating() {
    if (!editing || !pendingScore) return
    setSaving(true)
    try {
      await saveRating({
        tmdbId:    editing.tmdbId,
        mediaType: editing.mediaType,
        title:     editing.title,
        posterPath: editing.posterPath,
        genreIds:  editing.genreIds,
        score:     pendingScore,
      })
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white">My Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">{ratings.length} title{ratings.length !== 1 ? 's' : ''} rated</p>
      </div>

      <div className="px-5 flex flex-col gap-2.5 mb-4">
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          {(['all', 'movie', 'tv'] as MediaFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setMediaFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${mediaFilter === f ? 'bg-white text-black shadow' : 'text-gray-400'}`}>
              {f === 'all' ? 'All' : f === 'movie' ? '🎬 Movies' : '📺 TV'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Min rating:</span>
          <div className="flex gap-1">
            {([0, 1, 2, 3, 4, 5] as ScoreFilter[]).map((s) => (
              <button key={s} type="button" onClick={() => setMinScore(s)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${minScore === s ? 'bg-amber-400 text-black' : 'bg-white/8 text-gray-400'}`}>
                {s === 0 ? 'All' : `${s}★`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-white font-semibold">Nothing here yet</p>
            <p className="text-gray-500 text-sm mt-1">{ratings.length === 0 ? 'Go rate some titles to build your library' : 'Try a different filter'}</p>
            {ratings.length === 0 && (
              <button type="button" onClick={() => navigate('/rate')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold">
                + Rate Titles
              </button>
            )}
          </div>
        )}
        {filtered.map((r) => (
          <button key={r.id} type="button" onClick={() => { setEditing(r); setPendingScore(r.score) }}
            className="flex gap-3 p-3 rounded-2xl bg-white/5 active:bg-white/10 transition-colors text-left">
            <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
              {r.posterPath
                ? <img src={`${POSTER_BASE}${r.posterPath}`} alt={r.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">🎬</div>}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <p className="font-semibold text-white leading-snug line-clamp-1">{r.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{r.mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
              <p className="text-amber-400 text-sm mt-1">{'★'.repeat(r.score)}<span className="text-gray-700">{'★'.repeat(5 - r.score)}</span></p>
            </div>
            <div className="flex items-center"><span className="text-gray-600 text-lg">›</span></div>
          </button>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setEditing(null)}>
          <div className="w-full bg-[#1a1a1a] rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              {editing.posterPath && <img src={`${POSTER_BASE}${editing.posterPath}`} alt={editing.title} className="w-12 h-16 rounded-xl object-cover" />}
              <div>
                <p className="text-white font-bold leading-snug">{editing.title}</p>
                <p className="text-gray-400 text-sm capitalize">{editing.mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
              </div>
            </div>
            <StarRating value={pendingScore ?? editing.score} onChange={setPendingScore} size="lg" />
            <button type="button" onClick={() => navigate(`/detail/${editing.mediaType}/${editing.tmdbId}`)}
              className="w-full mt-4 py-3 rounded-2xl bg-white/8 text-gray-300 text-sm font-medium active:opacity-70">
              View Details
            </button>
            <button type="button" disabled={!pendingScore || saving} onClick={() => void handleUpdateRating()}
              className="w-full mt-2 py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity">
              {saving ? 'Saving…' : 'Update Rating'}
            </button>
            <button type="button" onClick={() => void handleDelete(editing.id)}
              className="w-full mt-2 py-3 rounded-2xl bg-red-600/15 text-red-400 text-sm font-medium active:opacity-70">
              Delete Rating
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
