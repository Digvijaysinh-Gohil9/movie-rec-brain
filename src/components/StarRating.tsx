import { useState } from 'react'
import type { StarScore } from '../db/types'

interface StarRatingProps {
  value?: StarScore
  onChange: (score: StarScore) => void
  size?: 'sm' | 'lg'
}

export function StarRating({ value, onChange, size = 'lg' }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? value ?? 0
  const starSize = size === 'lg' ? 'text-4xl' : 'text-2xl'

  return (
    <div className="flex gap-1 justify-center">
      {([1, 2, 3, 4, 5] as StarScore[]).map((s) => (
        <button
          key={s}
          type="button"
          className={`${starSize} leading-none transition-transform active:scale-110 select-none`}
          style={{ color: s <= active ? '#f59e0b' : '#4b5563' }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={() => setHover(s)}
          onTouchEnd={() => { onChange(s); setHover(null) }}
          onClick={() => onChange(s)}
          aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
