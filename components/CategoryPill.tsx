import { cn } from '@/lib/utils'

type CategoryPillProps = {
  emoji: string
  label: string
  active?: boolean
}

export function CategoryPill({ emoji, label, active = false }: CategoryPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
        active
          ? 'border-accent bg-accent text-black'
          : 'border-white/10 bg-white/5 text-white'
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  )
}
