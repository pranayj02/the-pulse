import Link from 'next/link'
import { Crown, Flame, Trophy, ChevronRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { FollowButton } from '@/components/FollowButton'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const activeCategory = {
  slug: 'coffee',
  name: 'Coffee',
}

type LeaderboardProfile = {
  id: string
  city: string | null
  full_name: string | null
  username: string | null
  xp: number | null
  level: string | null
}

type FollowingRow = {
  following_id: string
}

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <section className="card p-6">
            <p className="text-sm text-muted">
              You need to be signed in to view the leaderboard.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const [
    { data: currentProfile, error: currentProfileError },
    { data: followingRows, error: followsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, city, full_name, username, xp, level')
      .eq('id', user.id)
      .single()
      .overrideTypes<LeaderboardProfile, { merge: false }>(),

    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .overrideTypes<FollowingRow[], { merge: false }>(),
  ])

  if (currentProfileError) {
    throw new Error(currentProfileError.message)
  }

  if (followsError) {
    throw new Error(followsError.message)
  }

  const followingSet = new Set((followingRows ?? []).map((row) => row.following_id))
  const city = currentProfile?.city ?? 'Mumbai'

  const { data: leaderboard, error: leaderboardError } = await supabase
    .from('profiles')
    .select('id, full_name, username, city, xp, level')
    .eq('city', city)
    .order('xp', { ascending: false })
    .limit(50)
    .overrideTypes<LeaderboardProfile[], { merge: false }>()

  if (leaderboardError) {
    throw new Error(leaderboardError.message)
  }

  const currentIndex = (leaderboard ?? []).findIndex((entry) => entry.id === user.id)
  const currentRank = currentIndex >= 0 ? currentIndex + 1 : null

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="pill mb-4">
                <Trophy size={14} />
                <span>{city} · {activeCategory.name} · XP ranking</span>
              </div>

              <h1 className="section-title text-white">
                Who’s leading coffee taste in {city}?
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                This board currently ranks people in your city by total XP earned through activity
                across Chun.
              </p>
            </div>

            <div className="rounded-3xl border border-accent/20 bg-accent/10 px-4 py-3">
              <p className="text-sm text-muted">Your current position</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {currentRank ? `#${currentRank}` : '—'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">How this works</p>

            <div className="mt-4 space-y-3">
              {[
                'This version is city-scoped and sorted by XP.',
                'Profiles are public, so you can discover and follow strong shelves.',
                'Top ranks help surface people whose taste graph is worth watching.',
                'Seasonal scoring can be layered in later without changing the page structure.',
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
              {(leaderboard ?? []).map((entry, index) => {
                const rank = index + 1
                const displayName = entry.full_name || entry.username || 'Anonymous'
                const badge =
                  rank === 1
                    ? 'Category King'
                    : rank === 2
                      ? 'Taste Maker'
                      : rank === 3
                        ? 'Power Brewer'
                        : entry.level || 'Sip'
                const isSelf = entry.id === user.id

                return (
                  <div
                    key={entry.id}
                    className={`rounded-3xl border p-4 ${
                      rank <= 3
                        ? 'border-accent/20 bg-accent/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <Link
                        href={isSelf ? '/profile' : `/profile/${entry.id}`}
                        className="group flex min-w-0 items-center gap-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-lg text-white">
                          #{rank}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-white group-hover:text-accent">
                              {displayName}
                            </p>
                            {rank === 1 && <Crown size={16} className="text-accent" />}
                            {isSelf ? (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-faint">
                                You
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                            <span>{entry.city ?? 'Unknown city'}</span>
                            <span>·</span>
                            <span>{entry.xp ?? 0} XP</span>
                            <span>·</span>
                            <span>{badge}</span>
                          </div>
                        </div>

                        <ChevronRight
                          size={16}
                          className="ml-auto hidden shrink-0 text-faint transition group-hover:text-white md:block"
                        />
                      </Link>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="pill">
                          <Flame size={14} />
                          <span>{entry.xp ?? 0} XP</span>
                        </div>

                        {!isSelf ? (
                          <FollowButton
                            userId={entry.id}
                            initialFollowing={followingSet.has(entry.id)}
                            compact
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
