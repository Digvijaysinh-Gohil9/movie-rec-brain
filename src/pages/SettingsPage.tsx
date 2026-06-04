import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRatingCount, useWatchlistCount } from '../hooks/useDb'
import { supabase } from '../lib/supabase'
import { saveRating, addToWatchlist } from '../db/queries'
import type { Rating, WatchlistEntry } from '../db/types'

interface BackupFile {
  version: 1
  exportedAt: string
  ratings: Rating[]
  watchlist: WatchlistEntry[]
}

function isValidBackup(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d['version'] === 1 && Array.isArray(d['ratings']) && Array.isArray(d['watchlist'])
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const ratingCount   = useRatingCount()
  const watchlistCount = useWatchlistCount()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleExport() {
    const [{ data: ratingsData }, { data: watchlistData }] = await Promise.all([
      supabase.from('ratings').select('*').order('rated_at', { ascending: false }),
      supabase.from('watchlist').select('*').order('added_at', { ascending: false }),
    ])

    const ratings: Rating[] = (ratingsData ?? []).map((r) => ({
      id: r['id'] as string, tmdbId: r['tmdb_id'] as number,
      mediaType: r['media_type'] as 'movie' | 'tv', title: r['title'] as string,
      posterPath: r['poster_path'] as string | null, genreIds: r['genre_ids'] as number[],
      score: r['score'] as Rating['score'], ratedAt: r['rated_at'] as string,
    }))

    const watchlist: WatchlistEntry[] = (watchlistData ?? []).map((r) => ({
      id: r['id'] as string, tmdbId: r['tmdb_id'] as number,
      mediaType: r['media_type'] as 'movie' | 'tv', title: r['title'] as string,
      posterPath: r['poster_path'] as string | null, overview: r['overview'] as string,
      releaseYear: r['release_year'] as string, voteAverage: r['vote_average'] as number,
      genreIds: r['genre_ids'] as number[], addedAt: r['added_at'] as string,
    }))

    const backup: BackupFile = { version: 1, exportedAt: new Date().toISOString(), ratings, watchlist }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movie-recommender-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!isValidBackup(data)) {
        setImportResult({ ok: false, msg: 'Invalid backup file.' })
        return
      }
      // Import ratings
      for (const r of data.ratings) {
        await saveRating({ tmdbId: r.tmdbId, mediaType: r.mediaType, title: r.title, posterPath: r.posterPath, genreIds: r.genreIds, score: r.score })
      }
      // Import watchlist
      for (const w of data.watchlist) {
        await addToWatchlist({ tmdbId: w.tmdbId, mediaType: w.mediaType, title: w.title, posterPath: w.posterPath, overview: w.overview, releaseYear: w.releaseYear, voteAverage: w.voteAverage, genreIds: w.genreIds })
      }
      setImportResult({ ok: true, msg: `Imported ${data.ratings.length} ratings and ${data.watchlist.length} watchlist titles.` })
    } catch (err) {
      setImportResult({ ok: false, msg: err instanceof Error ? err.message : 'Import failed.' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col pb-28">
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {user && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <div className="bg-white/5 rounded-2xl p-4 flex divide-x divide-white/10">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-white">{ratingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rated</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-white">{watchlistCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Watchlist</p>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="px-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Backup & Restore</p>
        <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/8">
          <button type="button" onClick={() => void handleExport()}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/8 transition-colors text-left">
            <span className="text-2xl w-9 text-center">⬇️</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Export Backup</p>
              <p className="text-gray-500 text-xs mt-0.5">Download all ratings & watchlist as JSON</p>
            </div>
            <span className="text-gray-600">›</span>
          </button>
          <label className="flex items-center gap-4 px-4 py-4 active:bg-white/8 transition-colors cursor-pointer">
            <span className="text-2xl w-9 text-center">⬆️</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{importing ? 'Importing…' : 'Import Backup'}</p>
              <p className="text-gray-500 text-xs mt-0.5">Restore from a previously exported JSON file</p>
            </div>
            <span className="text-gray-600">›</span>
            <input type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => void handleImport(e)} disabled={importing} />
          </label>
        </div>
        {importResult && (
          <div className={`mt-3 px-4 py-3 rounded-2xl text-sm ${importResult.ok ? 'bg-green-600/15 text-green-400' : 'bg-red-600/15 text-red-400'}`}>
            {importResult.ok ? '✓ ' : '✕ '}{importResult.msg}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="px-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Account</p>
        <div className="bg-white/5 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => void signOut()}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/8 transition-colors text-left">
            <span className="text-2xl w-9 text-center">🚪</span>
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm">Sign Out</p>
              <p className="text-gray-500 text-xs mt-0.5">Your data stays saved in the cloud</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
