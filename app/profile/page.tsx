import { Award, MapPin, Settings, Share2, Sparkles, Trophy } from 'lucide-react'
import { Header } from '@/components/Header'
import { XPBadge } from '@/components/XPBadge'

const badges = [
  { name: 'First Sip', emoji: '🌱', description: 'Completed your first face-off' },
  { name: 'Early Bird', emoji: '☕', description: 'Joined during the first launch wave' },
  { name: 'Explorer', emoji: '🗺️', description: 'Reviewed category places on the discovery map' },
  { name: 'Power Brewer', emoji: '⚡', description: 'Completed 100+ face-offs' },
]

export default function ProfilePage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="profile" />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
                PJ
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Profile</p>
                <h1 className="section-title mt-2 text-white">Pranay Jain</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="pill">
                    <MapPin size={14} />
                    <span>Mumbai</span>
                  </div>
                  <div className="pill">
                    <Sparkles size={14} />
                    <span>Coffee pilot user</span>
                  </div>
                  <div className="pill">
                    <Trophy size={14} />
                    <span>Rank #4 this month</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="cta-secondary">
                <Share2 size={16} />
                <span>Share profile</span>
              </button>
              <button className="cta-secondary">
                <Settings size={16} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <XPBadge xp={164} />

            <div className="card p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-faint">Stats</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Face-offs completed', value: '47' },
                  { label: 'Shelf followers', value: '12' },
                  { label: 'Places reviewed', value: '2' },
                  { label: 'Categories active', value: '1' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-muted">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Badges</p>
                <h2 className="heading-md mt-2 text-white">Identity you’ve unlocked</h2>
              </div>
              <Award size={18} className="text-accent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {badges.map((badge) => (
                <div key={badge.name} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{badge.emoji}</span>
                    <p className="font-semibold text-white">{badge.name}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">{badge.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm font-semibold text-white">Next badge target</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Complete 53 more face-offs to unlock <span className="text-white">Power Brewer</span>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
