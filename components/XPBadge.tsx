import { getXPProgress } from '@/lib/utils'

type XPBadgeProps = {
  xp: number
}

export function XPBadge({ xp }: XPBadgeProps) {
  const progress = getXPProgress(xp)

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-faint">Level</p>
          <h3 className="heading-md mt-1 text-white">
            {progress.emoji} {progress.label}
          </h3>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-muted">
          {xp} XP
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Progress</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
