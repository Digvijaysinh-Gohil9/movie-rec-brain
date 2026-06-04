import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGenres } from '../hooks/useGenres'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

type MediaType = 'movie' | 'tv'
type Step = 'genre' | 'mode'

export function HomePage() {
  const navigate = useNavigate()
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [step, setStep] = useState<Step>('genre')
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null)
  const [selectedGenreName, setSelectedGenreName] = useState<string>('')

  const { genres, loading, error } = useGenres(mediaType)
  const ratingCount = useLiveQuery(() => db.ratings.count(), [], 0)

  function handleSurpriseMe() {
    navigate(`/feed?mediaType=${mediaType}&mode=surprise`)
  }

  function handleGenreSelect(id: number, name: string) {
    setSelectedGenreId(id)
    setSelectedGenreName(name)
    setStep('mode')
  }

  function handleModeSelect(mode: 'new' | 'rewatch') {
    navigate(`/feed?genreId=${selectedGenreId}&mediaType=${mediaType}&mode=${mode}&genre=${encodeURIComponent(selectedGenreName)}`)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">🎬 What to Watch</h1>
          {ratingCount > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{ratingCount} title{ratingCount !== 1 ? 's' : ''} rated</p>
          )}
        </div>
        <div />
      </div>

      {step === 'genre' ? (
        <>
          {/* Surprise Me */}
          <div className="px-5 mb-5">
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg active:opacity-80 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              🎲 Surprise Me
            </button>
            {ratingCount === 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">Rate some titles first to personalise results</p>
            )}
          </div>

          {/* Movie / TV toggle */}
          <div className="px-5 mb-5">
            <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
              {(['movie', 'tv'] as MediaType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMediaType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mediaType === t
                      ? 'bg-white text-black shadow'
                      : 'text-gray-400'
                  }`}
                >
                  {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
                </button>
              ))}
            </div>
          </div>

          {/* Genre grid */}
          <div className="px-5 flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Pick a genre</p>
            {loading && (
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!loading && !error && (
              <div className="grid grid-cols-2 gap-2.5 pb-28">
                {genres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGenreSelect(g.id, g.name)}
                    className="h-14 rounded-2xl bg-white/5 active:bg-white/15 transition-colors text-white font-medium text-sm"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Mode selection step */
        <div className="flex-1 flex flex-col px-5 justify-center gap-4">
          <button
            type="button"
            onClick={() => { setStep('genre'); setSelectedGenreId(null) }}
            className="text-gray-500 text-sm self-start mb-2 flex items-center gap-1"
          >
            ← {selectedGenreName}
          </button>
          <p className="text-xl font-bold text-white text-center mb-2">What are you in the mood for?</p>

          <button
            type="button"
            onClick={() => handleModeSelect('new')}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg active:opacity-80 transition-opacity flex flex-col items-center gap-1 shadow-lg"
          >
            <span className="text-3xl">🆕</span>
            <span>Something New</span>
            <span className="text-xs font-normal opacity-80">Titles you haven't seen yet</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSelect('rewatch')}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 text-white font-bold text-lg active:opacity-80 transition-opacity flex flex-col items-center gap-1 shadow-lg"
          >
            <span className="text-3xl">🔁</span>
            <span>Rewatch</span>
            <span className="text-xs font-normal opacity-80">Your favourites in this genre</span>
          </button>
        </div>
      )}
    </div>
  )
}
