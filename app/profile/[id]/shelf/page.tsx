import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type ShelfRow = {
  id: string
  cafe_id: string | null
  display_name: string | null
  rank: number
  score: number
  comparisons_count: number
  cafes: { name: string | null; city: string | null; address: string | null; lat: number | null; lng: number | null } | null
}

function rankColor(rank: number) {
  if (rank === 1) return '#f5c542'
  if (rank === 2) return '#cbd5e1'
  if (rank === 3) return '#cd7c3c'
  return 'var(--color-text-faint)'
}

function scoreDisplay(score: number, total: number): string {
  if (total === 1) return '10.0'
  const val = 10 - ((score === 1 ? 0 : (score - 1) / (total - 1)) * 9)
  return val.toFixed(1)
}

function eloToDisplay(score: number): string {
  const val = Math.max(1, Math.min(10, ((score - 800) / 800) * 9 + 1))
  return val.toFixed(1)
}

export default async function PublicShelfPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, city')
    .eq('id', id)
    .maybeSingle() as unknown as { data: { id: string; full_name: string | null; username: string | null; city: string | null } | null }

  if (!profile) notFound()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', 'coffee')
    .maybeSingle() as unknown as { data: { id: string; name: string } | null }

  const categoryId = category?.id ?? null
  const categoryName = category?.name ?? 'Coffee'

  const { data: rawShelf } = categoryId
    ? await supabase
        .from('shelf_items')
        .select('id, cafe_id, display_name, rank, score, comparisons_count, cafes(name, city, address, lat, lng)')
        .eq('user_id', id)
        .eq('category_id', categoryId)
        .order('rank', { ascending: true })
    : { data: [] }

  const shelf = (rawShelf ?? []) as unknown as ShelfRow[]
  const displayName = profile.full_name || profile.username || 'This person'

  return (
    <>
      <Header
        title={`${displayName}'s Shelf`}
        action={
          <Link
            href={`/profile/${id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-muted)', padding: '6px 10px', borderRadius: 999, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ArrowLeft size={13} /> Profile
          </Link>
        }
      />

      <div className="screen" style={{ paddingTop: 16, paddingBottom: 100 }}>

        {/* Category pill */}
        <div style={{ marginBottom: 16 }}>
          <div className="pill-tabs">
            <button className="pill-tab active">{categoryName}</button>
          </div>
        </div>

        {/* Stats row */}
        {shelf.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Ranked</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{shelf.length}</p>
            </div>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Top Pick</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shelf[0]?.display_name ?? shelf[0]?.cafes?.name ?? '—'}
              </p>
            </div>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>City</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.city ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Shelf list */}
        {shelf.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 32 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>No ranked cafés yet</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: '26ch', marginInline: 'auto' }}>
              {displayName} hasn&apos;t ranked any cafés yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shelf.map((item, idx) => {
              const name = item.display_name ?? item.cafes?.name ?? 'Unknown café'
              const city = item.cafes?.city ?? null
              const address = item.cafes?.address ?? null
              const meta = address && !address.toLowerCase().includes((city ?? '~~~').toLowerCase())
                ? `${address}${city ? `, ${city}` : ''}`
                : city
              const score = eloToDisplay(item.score)

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 14px',
                    background: idx === 0 ? 'rgba(245,197,66,0.06)' : 'var(--color-surface)',
                    borderRadius: 12,
                    border: `1px solid ${idx === 0 ? 'rgba(245,197,66,0.18)' : 'var(--color-border)'}`,
                  }}
                >
                  {/* Rank number */}
                  <span style={{
                    width: 28, flexShrink: 0,
                    fontSize: item.rank <= 3 ? 16 : 13,
                    fontWeight: 800,
                    color: rankColor(item.rank),
                    textAlign: 'center',
                  }}>
                    {item.rank <= 3 ? ['🥇','🥈','🥉'][item.rank - 1] : `#${item.rank}`}
                  </span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </p>
                    {meta && (
                      <p style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        <MapPin size={9} style={{ flexShrink: 0 }} />
                        {meta}
                      </p>
                    )}
                  </div>

                  {/* Score badge */}
                  <div style={{
                    flexShrink: 0,
                    width: 38, height: 38,
                    borderRadius: '50%',
                    background: idx === 0 ? 'rgba(245,197,66,0.15)' : 'var(--color-surface-offset)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                    color: idx === 0 ? '#f5c542' : 'var(--color-text-muted)',
                  }}>
                    {score}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
