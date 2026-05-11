import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { FeedCard } from '@/components/FeedCard'
import { getFeed, type FeedScope } from '@/lib/feed'

type PageProps = { searchParams?: Promise<{ scope?: string }> }

const TABS: { key: FeedScope; label: string }[] = [
  { key: 'for-you',   label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'city',      label: 'City' },
]

export default async function HomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const raw = params.scope
  const scope: FeedScope =
    raw === 'following' || raw === 'city' || raw === 'for-you' ? raw : 'for-you'

  const feed = await getFeed(scope)
  if (!feed) redirect('/auth')

  return (
    <>
      <Header />

      <div className="screen" style={{ paddingTop: 16 }}>

        {/* Tab row */}
        <div className="pill-tabs mb-5">
          {TABS.map((tab) => {
            const active = tab.key === scope
            return (
              <Link
                key={tab.key}
                href={tab.key === 'for-you' ? '/' : `/?scope=${tab.key}`}
                className={`pill-tab${active ? ' active' : ''}`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Feed */}
        {feed.items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <p className="section-title">Nothing here yet</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', maxWidth: '26ch' }}>
              {scope === 'following'
                ? 'Follow people to see their visits here.'
                : 'Log a visit and your feed will come alive.'}
            </p>
            {scope === 'following' ? (
              <Link href="/people" className="btn-primary mt-2">Find people to follow</Link>
            ) : (
              <Link href="/discover" className="btn-primary mt-2">Discover cafés</Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
            {scope === 'following' && (
              <Link
                href="/people"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px', borderRadius: 12, marginTop: 4,
                  border: '1px dashed var(--color-border)',
                  color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                + Find more people to follow
              </Link>
            )}
          </div>
        )}

      </div>
    </>
  )
}
