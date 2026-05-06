import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type ShelfRow = {
  id: string
  cafe_id: string | null
  brand_id: string | null
  display_name: string | null
  rank: number
  score: number
  comparisons_count: number
  cafes: { name: string | null; city: string | null } | null
  brands: { name: string | null; origin_city: string | null } | null
}

function buildScoreMap(shelf: ShelfRow[]): Map<string, string> {
  if (shelf.length === 0) return new Map()
  if (shelf.length === 1) return new Map([[shelf[0].id, '10.0']])

  const scores = shelf.map((r) => r.score)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const range = maxScore - minScore

  return new Map(
    shelf.map((r) => {
      // #1 (highest score) always = 10.0, last always = 1.0
      const normalised = range === 0
        ? 10
        : 1 + ((r.score - minScore) / range) * 9
      return [r.id, normalised.toFixed(1)]
    })
  )
}

function rankColor(rank: number): string {
  if (rank === 1) return '#f5c542'
  if (rank === 2) return '#cbd5e1'
  if (rank === 3) return '#cd7c3c'
  return 'var(--color-text-faint)'
}

export default async function ShelfPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: category } = await supabase
    .from('categories').select('id, name').eq('slug', 'coffee').maybeSingle() as unknown as
    { data: { id: string; name: string } | null }

  const categoryId = category?.id ?? null
  const categoryName = category?.name ?? 'Coffee'

  const { data: rawShelf } = categoryId
    ? await supabase
        .from('shelf_items')
        .select('id, cafe_id, brand_id, display_name, rank, score, comparisons_count, cafes(name, city), brands(name, origin_city)')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .order('rank', { ascending: true })
    : { data: [] }

  const shelf = (rawShelf ?? []) as unknown as ShelfRow[]
  const scoreMap = buildScoreMap(shelf)

  function getName(row: ShelfRow) {
    return row.display_name ?? row.cafes?.name ?? row.brands?.name ?? 'Unknown'
  }
  function getMeta(row: ShelfRow) {
    return row.cafes?.city ?? row.brands?.origin_city ?? null
  }

  return (
    <>
      <Header title="My Shelf" />

      <div className="screen" style={{ paddingTop: 16 }}>

        {/* Category pill */}
        <div style={{ marginBottom: 16 }}>
          <div className="pill-tabs">
            <button className="pill-tab active">{categoryName}</button>
          </div>
        </div>

        {/* Stats row */}
        {shelf.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, marginBottom: 16,
          }}>
            <div className="card-inset" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Ranked</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', fontFamily: "'Clash Display', sans-serif" }}>{shelf.length}</p>
            </div>
            <div className="card-inset" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Top Pick</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)', fontFamily: "'Clash Display', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shelf[0] ? getName(shelf[0]) : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Shelf list */}
        {shelf.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 32 }}>
            <p className="section-title" style={{ marginBottom: 8 }}>Your shelf is empty</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, maxWidth: '26ch', marginInline: 'auto' }}>
              Log a café visit and rank it to build your shelf.
            </p>
            <Link href="/discover" className="btn-primary">Discover cafés</Link>
          </div>
        ) : (
          <div className="card">
            {shelf.map((row) => {
              const name  = getName(row)
              const meta  = getMeta(row)
              const score = scoreMap.get(row.id) ?? '—'
              const letter = name[0]?.toUpperCase() ?? '?'
              return (
                <div key={row.id} className="list-item">
                  {/* Rank */}
                  <span className="rank-num" style={{ color: rankColor(row.rank) }}>
                    {row.rank}
                  </span>
                  {/* Monogram */}
                  <div className="list-item-monogram">{letter}</div>
                  {/* Body */}
                  <div className="list-item-body">
                    <p className="list-item-name">{name}</p>
                    {meta && <p className="list-item-meta">{meta}</p>}
                    <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                      {row.comparisons_count} match{row.comparisons_count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  {/* Score badge */}
                  <div className="score-badge score-badge-gold">{score}</div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
