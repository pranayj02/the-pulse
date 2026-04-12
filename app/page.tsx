// app/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
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

function cardCopy(item: FeedItem) {
  const name = actorName(item)

  if (item.type === 'visit') {
    return {
      title: `${name} visited ${item.payload.cafeName ?? 'a café'}`,
      body: item.payload.note ?? null,
      eyebrow: 'Visit',
    }
  }

  if (item.type === 'comparison') {
    return {
      title: `${name} picked ${item.payload.winnerName ?? 'a winner'}`,
      body: `${item.payload.brandAName ?? 'Brand A'} vs ${item.payload.brandBName ?? 'Brand B'}`,
      eyebrow: 'Face-off',
    }
  }

  return {
    title: `${name} earned ${item.payload.badgeSlug ?? 'a badge'}`,
    body: null,
    eyebrow: 'Badge',
  }
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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
      <section className="mb-5 rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-faint">Chun</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Activity</h1>
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
                    ? 'bg-accent text-black'
                    : 'border border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Following</p>
            <p className="mt-2 text-lg font-semibold text-white">{feed.counts.following}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">City cohort</p>
            <p className="mt-2 text-lg font-semibold text-white">{feed.counts.city}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-3 sm:block hidden">
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Scope</p>
            <p className="mt-2 text-lg font-semibold capitalize text-white">
              {scope.replace('-', ' ')}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {feed.items.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-semibold text-white">No activity yet</h2>
            <p className="mt-2 text-sm text-muted">
              Start by following a few people, logging a café visit, or doing a face-off.
            </p>

            <div className="mt-4 flex gap-2">
              <Link href="/leaderboard" className="cta-secondary">
                Find people
              </Link>
              <Link href="/faceoff" className="cta-primary">
                Start ranking
              </Link>
            </div>
          </div>
        ) : (
          feed.items.map((item) => {
            const copy = cardCopy(item)
            const isOwn = item.actor.id === feed.currentUser.id

            return (
              <article
                key={`${item.type}-${item.id}`}
                className="rounded-[28px] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">
                        {copy.eyebrow}
                      </p>
                      {isOwn ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-faint">
                          You
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2 text-sm font-medium text-white">{copy.title}</h3>

                    {copy.body ? (
                      <p className="mt-2 text-sm text-muted">{copy.body}</p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2 text-xs text-faint">
                      <span>{formatTimestamp(item.ts)}</span>
                      {item.actor.city ? <span>· {item.actor.city}</span> : null}
                    </div>
                  </div>

                  <Link
                    href={`/profile/${item.actor.id}`}
                    className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:bg-white/10 hover:text-white"
                  >
                    View
                  </Link>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}
