import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { FeedCard } from '@/components/FeedCard'
import { getFeed, type FeedScope } from '@/lib/feed'

type PageProps = { searchParams?: Promise<{ scope?: string }> }

const TABS: { key: FeedScope; label: string }[] = [
  { key: 'for-you', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'city', label: 'City' },
]

export default async function HomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const raw = params.scope
  const scope: FeedScope = raw === 'following' || raw === 'city' || raw === 'for-you' ? raw : 'for-you'

  const feed = await getFeed(scope)
  if (!feed) redirect('/auth')

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="home" />

      <div className="container max-w-2xl space-y-6">

        {/* ── Hero card ───────────────────────────────────────────────── */}
        <section className="card-strong p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-faint">Chun</p>
              <h1 className="section-title mt-1 text-white">Activity</h1>
              <p className="mt-0.5 text-sm text-muted">
                {feed.currentUser.level} · {feed.currentUser.xp} XP
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/discover" className="cta-secondary">Discover</Link>
              <Link href="/faceoff" className="cta-primary">Face-off</Link>
            </div>
          </div>

          {/* Scope tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
            {TABS.map((tab) => {
              const active = tab.key === scope
              return (
                <Link key={tab.key}
                  href={tab.key === 'for-you' ? '/' : `/?scope=${tab.key}`}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm transition
                    ${active
                      ? 'bg-white text-slate-950 shadow-[var(--shadow-soft)]'
                      : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'}`}>
                  {tab.label}
                </Link>
              )
            })}
          </div>

          {/* Stats strip */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Following', value: feed.counts.following },
              { label: 'City cohort', value: feed.counts.city },
              { label: 'Scope', value: scope.replace('-', ' '), hidden: 'sm:hidden sm:block' },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border border-white/10 bg-black/10 p-3 ${s.hidden ?? ''}`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-faint">{s.label}</p>
                <p className="mt-1.5 text-lg font-semibold capitalize text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feed ────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          {feed.items.length === 0 ? (
            <div className="card p-5 md:p-6">
              <h2 className="text-base font-semibold text-white">No activity yet</h2>
              <p className="mt-2 text-sm text-muted">
                Follow people or log a café visit to see activity here.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/discover" className="cta-secondary">Log a visit</Link>
                <Link href="/leaderboard" className="cta-primary">Find people</Link>
              </div>
            </div>
          ) : (
            feed.items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                isOwn={item.actor.id === feed.currentUser.id}
                currentUserId={feed.currentUser.id}
              />
            ))
          )}
        </section>
      </div>
    </main>
  )
}
