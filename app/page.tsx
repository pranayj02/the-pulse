import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { getFeed, type FeedItem, type FeedScope } from '@/lib/feed'

type PageProps = {
  searchParams?: Promise<{
    scope?: string
  }>
}

const tabs: { key: FeedScope; label: string }[] = [
  { key: 'for-you', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'city', label: 'City' },
]

function actorName(item: FeedItem) {
  return item.actor.full_name || item.actor.username || 'Someone'
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatVisitDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const requestedScope = params.scope

  const scope: FeedScope =
    requestedScope === 'following' || requestedScope === 'city' || requestedScope === 'for-you'
      ? requestedScope
      : 'for-you'

  const feed = await getFeed(scope)

  if (!feed) {
    redirect('/auth')
  }

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="home" />

      <div className="container max-w-2xl space-y-6">
        <section className="card-strong p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-faint">Chun</p>
              <h1 className="section-title mt-2 text-white">Activity</h1>
              <p className="mt-1 text-sm text-muted">
                {feed.currentUser.level} · {feed.currentUser.xp} XP
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/discover" className="cta-secondary">
                Discover
              </Link>
              <Link href="/faceoff" className="cta-primary">
                Face-off
              </Link>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const active = tab.key === scope
              return (
                <Link
                  key={tab.key}
                  href={tab.key === 'for-you' ? '/' : `/?scope=${tab.key}`}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? 'bg-white text-slate-950 shadow-[var(--shadow-soft)]'
                      : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-faint">Following</p>
              <p className="mt-2 text-lg font-semibold text-white">{feed.counts.following}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-faint">City</p>
              <p className="mt-2 text-lg font-semibold text-white">{feed.counts.city}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-faint">Feed logic</p>
              <p className="mt-2 text-sm text-muted">Only friend visit activity appears here, with current rank on their shelf.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {feed.items.length === 0 ? (
            <div className="card p-5 md:p-6">
              <h2 className="text-base font-semibold text-white">No visit activity yet</h2>
              <p className="mt-2 text-sm text-muted">
                Start by following a few people or logging a café visit so the feed has real-world taste data to show.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/discover" className="cta-secondary">
                  Log a visit
                </Link>
                <Link href="/profile" className="cta-primary">
                  Find people
                </Link>
              </div>
            </div>
          ) : (
            feed.items.map((item) => {
              const isOwn = item.actor.id === feed.currentUser.id
              const name = actorName(item)
              const photos = item.payload.photoUrls ?? []
              const visitDate = formatVisitDate(item.payload.visitedAt)

              return (
                <article key={item.id} className="card overflow-hidden p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-sm font-semibold text-white">
                      {item.actor.avatar_url ? (
                        <img
                          src={item.actor.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {isOwn ? 'You' : name}
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-faint">
                          Visit
                        </span>
                        {item.payload.shelfRank !== null && (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                            Rank #{item.payload.shelfRank}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-base font-semibold text-white">
                        {isOwn ? 'Visited' : `${name} visited`} {item.payload.cafeName ?? 'a café'}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
                        <span>{formatTimestamp(item.ts)}</span>
                        {visitDate && <span>Visited on {visitDate}</span>}
                        {item.actor.city && <span>{item.actor.city}</span>}
                      </div>

                      {item.payload.note && (
                        <p className="mt-3 text-sm leading-6 text-muted">{item.payload.note}</p>
                      )}
                    </div>
                  </div>

                  {photos.length > 0 && (
                    <div className={`mt-4 grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {photos.map((url, index) => (
                        <div key={`${item.id}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          <img
                            src={url}
                            alt={`${item.payload.cafeName ?? 'Visit'} photo ${index + 1}`}
                            className="h-48 w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
