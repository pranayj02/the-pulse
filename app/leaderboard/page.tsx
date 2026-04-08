import { Crown, Flame, Trophy } from 'lucide-react'
import { Header } from '@/components/Header'

const activeCategory = {
  slug: 'coffee',
  name: 'Coffee',
}

const leaderboard = [
  { rank: 1, name: 'Aarav', city: 'Mumbai', xp: 1820, badge: 'Category King' },
  { rank: 2, name: 'Mira', city: 'Mumbai', xp: 1710, badge: 'Taste Maker' },
  { rank: 3, name: 'Kabir', city: 'Mumbai', xp: 1635, badge: 'Power Brewer' },
  { rank: 4, name: 'Pranay', city: 'Mumbai', xp: 164, badge: 'Early Bird' },
  { rank: 5, name: 'Rhea', city: 'Mumbai', xp: 150, badge: 'Explorer' },
]

export default function LeaderboardPage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="leaderboard" />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="pill mb-4">
                <Trophy size={14} />
                <span>Leaderboard · Mumbai · {activeCategory.name}</span>
              </div>

              <h1 className="section-title text-white">
                Who’s shaping taste in {activeCategory.name.toLowerCase()} this month?
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                This board blends face-off activity, discovery behaviour, and shelf momentum into a
                monthly ranking for the active category.
              </p>
            </div>

            <div className="rounded-3xl border border-accent/20 bg-accent/10 px-4 py-3">
              <p className="text-sm text-muted">Your current position</p>
              <p className="mt-1 text-2xl font-semibold text-white">#4</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">Season mechanics</p>

            <div className="mt-4 space-y-3">
              {[
                'Face-offs increase your activity score.',
                'Discovery actions improve your explorer standing.',
                'Badges strengthen identity but do not overpower rankings.',
                'Leaderboards reset monthly to keep competition alive.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-3 md:p-4">
            <div className="grid gap-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex flex-col gap-4 rounded-3xl border p-4 md:flex-row md:items-center md:justify-between ${
                    entry.rank <= 3
                      ? 'border-accent/20 bg-accent/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-display text-lg text-white">
                      #{entry.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{entry.name}</p>
                        {entry.rank === 1 && <Crown size={16} className="text-accent" />}
                      </div>
                      <p className="text-sm text-muted">{entry.city}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="pill">
                      <Flame size={14} />
                      <span>{entry.xp} XP</span>
                    </div>
                    <div className="pill">
                      <span>{entry.badge}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
