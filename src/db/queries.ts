import { supabase } from '../lib/supabase'
import type { Rating, StarScore, WatchlistEntry, TasteProfile } from './types'
import { buildProfile } from '../engine/profileBuilder'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeId(mediaType: 'movie' | 'tv', tmdbId: number): string {
  return `${mediaType}:${tmdbId}`
}

function toRating(row: Record<string, unknown>): Rating {
  return {
    id:         row['id'] as string,
    tmdbId:     row['tmdb_id'] as number,
    mediaType:  row['media_type'] as 'movie' | 'tv',
    title:      row['title'] as string,
    posterPath: row['poster_path'] as string | null,
    genreIds:   row['genre_ids'] as number[],
    score:      row['score'] as StarScore,
    ratedAt:    row['rated_at'] as string,
  }
}

function toWatchlistEntry(row: Record<string, unknown>): WatchlistEntry {
  return {
    id:           row['id'] as string,
    tmdbId:       row['tmdb_id'] as number,
    mediaType:    row['media_type'] as 'movie' | 'tv',
    title:        row['title'] as string,
    posterPath:   row['poster_path'] as string | null,
    overview:     row['overview'] as string,
    releaseYear:  row['release_year'] as string,
    voteAverage:  row['vote_average'] as number,
    genreIds:     row['genre_ids'] as number[],
    addedAt:      row['added_at'] as string,
  }
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export async function saveRating(
  data: Omit<Rating, 'id' | 'ratedAt'> & { score: StarScore }
): Promise<void> {
  const id = makeId(data.mediaType, data.tmdbId)

  const { error } = await supabase.from('ratings').upsert({
    id,
    tmdb_id:     data.tmdbId,
    media_type:  data.mediaType,
    title:       data.title,
    poster_path: data.posterPath,
    genre_ids:   data.genreIds,
    score:       data.score,
    rated_at:    new Date().toISOString(),
  })
  if (error) throw error

  // Also mark as seen
  await supabase.from('seen').upsert({ id })

  // Recompute and save taste profile
  const all = await getAllRatings()
  const profile = buildProfile(all)
  await supabase.from('taste_profile').upsert({
    genre_weights: profile.genreWeights,
    updated_at:    profile.updatedAt,
  })
}

export async function deleteRating(id: string): Promise<void> {
  const { error } = await supabase.from('ratings').delete().eq('id', id)
  if (error) throw error

  // Recompute profile
  const all = await getAllRatings()
  const profile = buildProfile(all)
  await supabase.from('taste_profile').upsert({
    genre_weights: profile.genreWeights,
    updated_at:    profile.updatedAt,
  })
}

export async function getAllRatings(): Promise<Rating[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .order('rated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toRating)
}

// ─── Seen ─────────────────────────────────────────────────────────────────────

export async function markNotInterested(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<void> {
  const id = makeId(mediaType, tmdbId)
  await supabase.from('seen').upsert({ id })
}

export async function getAllSeenIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('seen').select('id')
  if (error) throw error
  return new Set((data ?? []).map((r: { id: string }) => r.id))
}

// ─── Taste profile ────────────────────────────────────────────────────────────

export async function getTasteProfile(): Promise<TasteProfile | undefined> {
  const { data, error } = await supabase
    .from('taste_profile')
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined

  // JSON keys are strings — convert back to numbers
  const genreWeights: Record<number, number> = {}
  for (const [k, v] of Object.entries(data['genre_weights'] as Record<string, number>)) {
    genreWeights[Number(k)] = v
  }
  return { id: 1, genreWeights, updatedAt: data['updated_at'] as string }
}

// ─── Bulk import (for backup restore — single profile recompute at end) ───────

export async function bulkImport(ratings: Rating[], watchlistEntries: WatchlistEntry[]): Promise<void> {
  // Bulk upsert ratings
  if (ratings.length > 0) {
    const rows = ratings.map((r) => ({
      id:          r.id,
      tmdb_id:     r.tmdbId,
      media_type:  r.mediaType,
      title:       r.title,
      poster_path: r.posterPath,
      genre_ids:   r.genreIds,
      score:       r.score,
      rated_at:    r.ratedAt,
    }))
    const { error } = await supabase.from('ratings').upsert(rows)
    if (error) throw error

    // Also mark all as seen in one shot
    const seenRows = ratings.map((r) => ({ id: r.id }))
    await supabase.from('seen').upsert(seenRows)

    // Recompute profile once
    const all = await getAllRatings()
    const profile = buildProfile(all)
    await supabase.from('taste_profile').upsert({
      genre_weights: profile.genreWeights,
      updated_at:    profile.updatedAt,
    })
  }

  // Bulk upsert watchlist
  if (watchlistEntries.length > 0) {
    const rows = watchlistEntries.map((w) => ({
      id:           w.id,
      tmdb_id:      w.tmdbId,
      media_type:   w.mediaType,
      title:        w.title,
      poster_path:  w.posterPath,
      overview:     w.overview,
      release_year: w.releaseYear,
      vote_average: w.voteAverage,
      genre_ids:    w.genreIds,
      added_at:     w.addedAt,
    }))
    const { error } = await supabase.from('watchlist').upsert(rows)
    if (error) throw error
  }
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function addToWatchlist(
  data: Omit<WatchlistEntry, 'id' | 'addedAt'>
): Promise<void> {
  const id = makeId(data.mediaType, data.tmdbId)
  const { error } = await supabase.from('watchlist').upsert({
    id,
    tmdb_id:      data.tmdbId,
    media_type:   data.mediaType,
    title:        data.title,
    poster_path:  data.posterPath,
    overview:     data.overview,
    release_year: data.releaseYear,
    vote_average: data.voteAverage,
    genre_ids:    data.genreIds,
    added_at:     new Date().toISOString(),
  })
  if (error) throw error
}

export async function removeFromWatchlist(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<void> {
  const id = makeId(mediaType, tmdbId)
  const { error } = await supabase.from('watchlist').delete().eq('id', id)
  if (error) throw error
}

export async function getAllWatchlist(): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toWatchlistEntry)
}

export async function isOnWatchlist(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<boolean> {
  const id = makeId(mediaType, tmdbId)
  const { data } = await supabase.from('watchlist').select('id').eq('id', id).maybeSingle()
  return data !== null
}

export async function rateFromWatchlist(
  entry: WatchlistEntry,
  score: StarScore
): Promise<void> {
  const id = makeId(entry.mediaType, entry.tmdbId)

  // Save rating
  await supabase.from('ratings').upsert({
    id,
    tmdb_id:     entry.tmdbId,
    media_type:  entry.mediaType,
    title:       entry.title,
    poster_path: entry.posterPath,
    genre_ids:   entry.genreIds,
    score,
    rated_at:    new Date().toISOString(),
  })

  // Mark seen + remove from watchlist
  await supabase.from('seen').upsert({ id })
  await supabase.from('watchlist').delete().eq('id', id)

  // Recompute profile
  const all = await getAllRatings()
  const profile = buildProfile(all)
  await supabase.from('taste_profile').upsert({
    genre_weights: profile.genreWeights,
    updated_at:    profile.updatedAt,
  })
}
