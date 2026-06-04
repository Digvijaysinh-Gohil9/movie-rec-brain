// ─── TMDB API Response Types ───────────────────────────────────────────────

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  media_type?: 'movie'
}

export interface TMDBTVShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  media_type?: 'tv'
}

export type TMDBSearchResult =
  | (TMDBMovie & { media_type: 'movie' })
  | (TMDBTVShow & { media_type: 'tv' })

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number
  tagline: string
  genres: TMDBGenre[]
  credits?: TMDBCredits
  videos?: TMDBVideosResult
}

export interface TMDBTVDetail extends TMDBTVShow {
  number_of_seasons: number
  number_of_episodes: number
  tagline: string
  genres: TMDBGenre[]
  credits?: TMDBCredits
  videos?: TMDBVideosResult
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export interface TMDBCredits {
  cast: TMDBCastMember[]
}

export interface TMDBVideo {
  key: string
  site: string
  type: string
  official: boolean
}

export interface TMDBVideosResult {
  results: TMDBVideo[]
}

export interface TMDBPaginatedResult<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

// Normalised content item we use internally
export interface ContentItem {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  releaseYear: string
  voteAverage: number
  genreIds: number[]
}
