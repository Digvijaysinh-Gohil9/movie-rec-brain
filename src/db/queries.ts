import { db } from './db'
import type { Rating, StarScore, WatchlistEntry } from './types'
import { buildProfile } from '../engine/profileBuilder'

// ─── Compound ID helper ───────────────────────────────────────────────────────
export function makeId(mediaType: 'movie' | 'tv', tmdbId: number): string {
  return `${mediaType}:${tmdbId}`
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export async function saveRating(
  data: Omit<Rating, 'id' | 'ratedAt'> & { score: StarScore }
): Promise<void> {
  const id = makeId(data.mediaType, data.tmdbId)
  const rating: Rating = { ...data, id, ratedAt: new Date().toISOString() }

  await db.transaction('rw', db.ratings, db.seen, db.tasteProfile, async () => {
    await db.ratings.put(rating)
    await db.seen.put({ id })
    // Recompute taste profile after every rating change
    const all = await db.ratings.toArray()
    const profile = buildProfile(all)
    await db.tasteProfile.put(profile)
  })
}

export async function deleteRating(id: string): Promise<void> {
  await db.transaction('rw', db.ratings, db.tasteProfile, async () => {
    await db.ratings.delete(id)
    // Recompute profile after deletion
    const all = await db.ratings.toArray()
    const profile = buildProfile(all)
    await db.tasteProfile.put(profile)
  })
  // Keep the seen entry so we don't re-surface dismissed titles
}

export async function getAllRatings(): Promise<Rating[]> {
  return db.ratings.orderBy('ratedAt').reverse().toArray()
}

// ─── Seen set ─────────────────────────────────────────────────────────────────

/** Mark as "not interested" without assigning a score */
export async function markNotInterested(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<void> {
  const id = makeId(mediaType, tmdbId)
  await db.seen.put({ id })
}

export async function isAlreadySeen(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<boolean> {
  const id = makeId(mediaType, tmdbId)
  const entry = await db.seen.get(id)
  return entry !== undefined
}

export async function getAllSeenIds(): Promise<Set<string>> {
  const all = await db.seen.toArray()
  return new Set(all.map((e) => e.id))
}

// ─── Taste profile ────────────────────────────────────────────────────────────

export async function getTasteProfile() {
  return db.tasteProfile.get(1)
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function addToWatchlist(
  data: Omit<WatchlistEntry, 'id' | 'addedAt'>
): Promise<void> {
  const id = makeId(data.mediaType, data.tmdbId)
  await db.watchlist.put({ ...data, id, addedAt: new Date().toISOString() })
}

export async function removeFromWatchlist(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<void> {
  await db.watchlist.delete(makeId(mediaType, tmdbId))
}

export async function isOnWatchlist(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<boolean> {
  const entry = await db.watchlist.get(makeId(mediaType, tmdbId))
  return entry !== undefined
}

/** Rate a watchlisted title — saves rating and removes it from watchlist */
export async function rateFromWatchlist(
  entry: WatchlistEntry,
  score: StarScore
): Promise<void> {
  await db.transaction('rw', db.ratings, db.seen, db.tasteProfile, db.watchlist, async () => {
    const id = makeId(entry.mediaType, entry.tmdbId)
    const rating: Rating = {
      id,
      tmdbId: entry.tmdbId,
      mediaType: entry.mediaType,
      title: entry.title,
      posterPath: entry.posterPath,
      genreIds: entry.genreIds,
      score,
      ratedAt: new Date().toISOString(),
    }
    await db.ratings.put(rating)
    await db.seen.put({ id })
    await db.watchlist.delete(id)
    const all = await db.ratings.toArray()
    await db.tasteProfile.put(buildProfile(all))
  })
}
