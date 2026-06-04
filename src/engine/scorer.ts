import type { ContentItem } from '../api/types'
import type { TasteProfile } from '../db/types'

export interface ScoredItem {
  item: ContentItem
  score: number
}

/**
 * Score a single candidate against the user's taste profile.
 *
 * Formula:
 *   score = Σ genreWeight[g] for each shared genre
 *         + 0.1 × (voteAverage / 10)   ← small popularity nudge
 *
 * Returns 0 for titles with no genre overlap (still surfaced if no profile exists).
 */
export function scoreCandidate(
  candidate: ContentItem,
  profile: TasteProfile | undefined
): number {
  const popularityNudge = 0.1 * (candidate.voteAverage / 10)

  if (!profile || Object.keys(profile.genreWeights).length === 0) {
    // No profile yet — fall back to pure TMDB rating
    return candidate.voteAverage + popularityNudge
  }

  let genreScore = 0
  for (const gId of candidate.genreIds) {
    genreScore += profile.genreWeights[gId] ?? 0
  }

  return genreScore + popularityNudge
}

/**
 * Rank a list of candidates, filtering out seen IDs, returning top N.
 */
export function rankCandidates(
  candidates: ContentItem[],
  profile: TasteProfile | undefined,
  seenIds: Set<string>,
  topN = 10
): ScoredItem[] {
  return candidates
    .filter((c) => !seenIds.has(`${c.mediaType}:${c.tmdbId}`))
    .map((item) => ({ item, score: scoreCandidate(item, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
