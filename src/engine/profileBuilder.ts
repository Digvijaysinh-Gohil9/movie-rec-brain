import type { Rating, TasteProfile } from '../db/types'

const RECENCY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const RECENCY_BOOST = 1.5

/**
 * Builds a TasteProfile from all ratings.
 *
 * For each genre that appears in rated titles:
 *   weight = recency-weighted average score
 *
 * Recent ratings (< 30 days old) count 1.5× in the weighted sum.
 */
export function buildProfile(ratings: Rating[]): TasteProfile {
  // genre → { weightedScoreSum, weightSum }
  const acc: Record<number, { scoreSum: number; weightSum: number }> = {}

  const now = Date.now()

  for (const r of ratings) {
    const ratedAt = new Date(r.ratedAt).getTime()
    const isRecent = now - ratedAt < RECENCY_WINDOW_MS
    const weight = isRecent ? RECENCY_BOOST : 1.0

    for (const genreId of r.genreIds) {
      if (!acc[genreId]) acc[genreId] = { scoreSum: 0, weightSum: 0 }
      acc[genreId]!.scoreSum += r.score * weight
      acc[genreId]!.weightSum += weight
    }
  }

  const genreWeights: Record<number, number> = {}
  for (const [genreId, { scoreSum, weightSum }] of Object.entries(acc)) {
    genreWeights[Number(genreId)] = scoreSum / weightSum
  }

  return {
    id: 1,
    genreWeights,
    updatedAt: new Date().toISOString(),
  }
}
