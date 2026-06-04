// ─── Database Entity Types ────────────────────────────────────────────────────

export type MediaType = 'movie' | 'tv'
export type StarScore = 1 | 2 | 3 | 4 | 5

/** A title the user has rated */
export interface Rating {
  /** Compound key: "movie:550" or "tv:1396" */
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  genreIds: number[]
  score: StarScore
  ratedAt: string // ISO timestamp
}

/**
 * Computed taste profile — single row, id always 1.
 * genreWeights: genre ID → weighted average score (1-5 scale)
 */
export interface TasteProfile {
  id: 1
  genreWeights: Record<number, number>
  updatedAt: string // ISO timestamp
}

/** Fast lookup: have we already seen (rated or dismissed) this title? */
export interface SeenEntry {
  /** Same compound key as Rating.id */
  id: string
}

/** A title the user wants to watch later */
export interface WatchlistEntry {
  /** Compound key: "movie:550" or "tv:1396" */
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  overview: string
  releaseYear: string
  voteAverage: number
  genreIds: number[]
  addedAt: string // ISO timestamp
}
