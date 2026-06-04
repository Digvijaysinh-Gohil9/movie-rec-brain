import { useState } from 'react'
import { db } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { buildProfile } from '../engine/profileBuilder'
import type { Rating, WatchlistEntry, SeenEntry, TasteProfile } from '../db/types'

// ─── Schema for the backup file ──────────────────────────────────────────────
interface BackupFile {
  version: 1
  exportedAt: string
  ratings: Rating[]
  watchlist: WatchlistEntry[]
  seen: SeenEntry[]
  tasteProfile: TasteProfile | null
}

function isValidBackup(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    d['version'] === 1 &&
    typeof d['exportedAt'] === 'string' &&
    Array.isArray(d['ratings']) &&
    Array.isArray(d['watchlist']) &&
    Array.isArray(d['seen'])
  )
}

export function SettingsPage() {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const ratingCount = useLiveQuery(() => db.ratings.count(), [], 0)
  const watchlistCount = useLiveQuery(() => db.watchlist.count(), [], 0)

  // ─── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    const [ratings, watchlist, seen, profileRows] = await Promise.all([
      db.ratings.toArray(),
      db.watchlist.toArray(),
      db.seen.toArray(),
      db.tasteProfile.toArray(),
    ])

    const backup: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      ratings,
      watchlist,
      seen,
      tasteProfile: profileRows[0] ?? null,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movie-recommender-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Import ────────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)

      if (!isValidBackup(data)) {
        setImportResult({ ok: false, msg: 'Invalid backup file — make sure you selected the right JSON.' })
        return
      }

      await db.transaction('rw', db.ratings, db.watchlist, db.seen, db.tasteProfile, async () => {
        // Upsert everything — existing data is preserved for entries not in backup
        await db.ratings.bulkPut(data.ratings)
        await db.watchlist.bulkPut(data.watchlist)
        await db.seen.bulkPut(data.seen)

        // Recompute profile from merged ratings rather than trusting the backup value
        const allRatings = await db.ratings.toArray()
        await db.tasteProfile.put(buildProfile(allRatings))
      })

      setImportResult({
        ok: true,
        msg: `Restored ${data.ratings.length} rating${data.ratings.length !== 1 ? 's' : ''} and ${data.watchlist.length} watchlist title${data.watchlist.length !== 1 ? 's' : ''}.`,
      })
    } catch (err) {
      setImportResult({
        ok: false,
        msg: err instanceof Error ? err.message : 'Import failed — file may be corrupted.',
      })
    } finally {
      setImporting(false)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Stats summary */}
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

      {/* Backup & Restore section */}
      <div className="px-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Backup & Restore</p>

        <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/8">
          {/* Export */}
          <button
            type="button"
            onClick={() => void handleExport()}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-white/8 transition-colors text-left"
          >
            <span className="text-2xl w-9 text-center">⬇️</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Export Backup</p>
              <p className="text-gray-500 text-xs mt-0.5">Download all ratings & watchlist as JSON</p>
            </div>
            <span className="text-gray-600">›</span>
          </button>

          {/* Import */}
          <label className="flex items-center gap-4 px-4 py-4 active:bg-white/8 transition-colors cursor-pointer">
            <span className="text-2xl w-9 text-center">⬆️</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">
                {importing ? 'Importing…' : 'Import Backup'}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Restore from a previously exported JSON file</p>
            </div>
            <span className="text-gray-600">›</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => void handleImport(e)}
              disabled={importing}
            />
          </label>
        </div>

        {/* Import result banner */}
        {importResult && (
          <div className={`mt-3 px-4 py-3 rounded-2xl text-sm ${
            importResult.ok ? 'bg-green-600/15 text-green-400' : 'bg-red-600/15 text-red-400'
          }`}>
            {importResult.ok ? '✓ ' : '✕ '}{importResult.msg}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
          Save the exported file to iCloud Drive or Files app as a backup. Use Import to restore your data on a new device or after clearing browser storage.
        </p>
      </div>
    </div>
  )
}
