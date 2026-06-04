import { POSTER_BASE } from '../api/tmdb'
import type { ContentItem } from '../api/types'

interface RecommendationCardProps {
  item: ContentItem
  score?: number
  rank?: number
  onNotInterested: () => void
  onClick: () => void
}

export function RecommendationCard({
  item,
  rank,
  onNotInterested,
  onClick,
}: RecommendationCardProps) {
  const poster = item.posterPath
    ? `${POSTER_BASE}${item.posterPath}`
    : null

  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-white/5 active:bg-white/10 transition-colors">
      {/* Poster */}
      <button
        type="button"
        onClick={onClick}
        className="flex-shrink-0 w-16 h-24 rounded-xl overflow-hidden bg-gray-800"
      >
        {poster ? (
          <img src={poster} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">🎬</div>
        )}
      </button>

      {/* Info */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 text-left flex flex-col justify-center min-w-0"
      >
        {rank !== undefined && (
          <span className="text-xs text-amber-400 font-semibold mb-0.5">#{rank}</span>
        )}
        <p className="font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {item.releaseYear && <span>{item.releaseYear} · </span>}
          <span className="capitalize">{item.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
          <span className="ml-1.5">⭐ {item.voteAverage.toFixed(1)}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.overview}</p>
      </button>

      {/* Not interested */}
      <div className="flex flex-col justify-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNotInterested() }}
          className="p-2 text-gray-600 hover:text-gray-400 transition-colors text-xl leading-none"
          aria-label="Not interested"
          title="Not interested"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
