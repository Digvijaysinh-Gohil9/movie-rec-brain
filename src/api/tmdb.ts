import type {
  TMDBGenre,
  TMDBMovie,
  TMDBTVShow,
  TMDBSearchResult,
  TMDBMovieDetail,
  TMDBTVDetail,
  TMDBPaginatedResult,
  ContentItem,
} from './types'

const BASE_URL = 'https://api.themoviedb.org/3'
export const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
export const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780'

function getKey(): string {
  const key = import.meta.env['VITE_TMDB_API_KEY'] as string | undefined
  if (!key || key === 'your_tmdb_read_access_token_here') {
    throw new Error('VITE_TMDB_API_KEY is not set. Add it to your .env file.')
  }
  return key
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getKey()}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${res.statusText} — ${path}`)
  }
  return res.json() as Promise<T>
}

// ─── Genre Lists ──────────────────────────────────────────────────────────────

export async function fetchMovieGenres(): Promise<TMDBGenre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list')
  return data.genres
}

export async function fetchTVGenres(): Promise<TMDBGenre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>('/genre/tv/list')
  return data.genres
}

// ─── Discover ─────────────────────────────────────────────────────────────────

export async function discoverMovies(
  genreId: number,
  page = 1
): Promise<TMDBPaginatedResult<TMDBMovie>> {
  return tmdbFetch('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
    page: String(page),
  })
}

export async function discoverTV(
  genreId: number,
  page = 1
): Promise<TMDBPaginatedResult<TMDBTVShow>> {
  return tmdbFetch('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '100',
    page: String(page),
  })
}

// Surprise Me: random popular titles across all genres
export async function discoverRandom(
  mediaType: 'movie' | 'tv',
  page = 1
): Promise<TMDBPaginatedResult<TMDBMovie | TMDBTVShow>> {
  const path = mediaType === 'movie' ? '/discover/movie' : '/discover/tv'
  return tmdbFetch(path, {
    sort_by: 'popularity.desc',
    page: String(page),
  })
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMulti(query: string): Promise<TMDBSearchResult[]> {
  const data = await tmdbFetch<TMDBPaginatedResult<TMDBSearchResult>>('/search/multi', {
    query,
    include_adult: 'false',
  })
  // Only keep movies and tv, filter out people
  return data.results.filter(
    (r) => r.media_type === 'movie' || r.media_type === 'tv'
  )
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function fetchMovieDetail(id: number): Promise<TMDBMovieDetail> {
  return tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos' })
}

export async function fetchTVDetail(id: number): Promise<TMDBTVDetail> {
  return tmdbFetch(`/tv/${id}`, { append_to_response: 'credits,videos' })
}

// ─── Normalise ────────────────────────────────────────────────────────────────

export function normaliseMovie(m: TMDBMovie): ContentItem {
  return {
    tmdbId: m.id,
    mediaType: 'movie',
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseYear: m.release_date?.slice(0, 4) ?? '',
    voteAverage: m.vote_average,
    genreIds: m.genre_ids,
  }
}

export function normaliseTV(t: TMDBTVShow): ContentItem {
  return {
    tmdbId: t.id,
    mediaType: 'tv',
    title: t.name,
    overview: t.overview,
    posterPath: t.poster_path,
    backdropPath: t.backdrop_path,
    releaseYear: t.first_air_date?.slice(0, 4) ?? '',
    voteAverage: t.vote_average,
    genreIds: t.genre_ids,
  }
}
