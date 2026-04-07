import { MapPin, MoveRight, Star } from 'lucide-react'
import type { Brand } from '@/lib/types'
import { PRICE_RANGE_LABELS } from '@/lib/constants'

type BrandCardProps = {
  brand: Brand
  rank?: number
  score?: number
  compact?: boolean
}

export function BrandCard({
  brand,
  rank,
  score,
  compact = false,
}: BrandCardProps) {
  return (
    <div className={`brand-gradient card ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold text-white">
            {brand.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white md:text-xl">{brand.name}</h3>
            <p className="text-sm text-muted">{brand.tagline ?? 'Taste-led brand profile'}</p>
          </div>
        </div>

        {typeof rank === 'number' && (
          <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            #{rank}
          </div>
        )}
      </div>

      {!compact && (
        <p className="mb-4 text-sm leading-6 text-muted">
          {brand.description ??
            'A featured brand inside your category shelf, ready for comparisons, discovery, and social ranking.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="pill">
          <Star size={14} />
          <span>{PRICE_RANGE_LABELS[brand.price_range]}</span>
        </div>

        {brand.origin_city && (
          <div className="pill">
            <MapPin size={14} />
            <span>{brand.origin_city}</span>
          </div>
        )}

        {typeof score === 'number' && (
          <div className="pill">
            <MoveRight size={14} />
            <span>{score} pts</span>
          </div>
        )}
      </div>
    </div>
  )
}
