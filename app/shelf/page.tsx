import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { ShelfClient, type ShelfItem } from '@/components/ShelfClient'
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
  cafes: { name: string | null; city: string | null; address: string | null; lat: number | null; lng: number | null } | null
  brands: { name: string | null; origin_city: string | null } | null
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
        .select('id, cafe_id, brand_id, display_name, rank, score, comparisons_count, cafes(name, city, address, lat, lng), brands(name, origin_city)')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .order('rank', { ascending: true })
    : { data: [] }

  const shelf = (rawShelf ?? []) as unknown as ShelfRow[]

  function getName(row: ShelfRow) {
    return row.display_name ?? row.cafes?.name ?? row.brands?.name ?? 'Unknown'
  }
  function getMeta(row: ShelfRow) {
    return row.cafes?.city ?? row.brands?.origin_city ?? null
  }

  const items: ShelfItem[] = shelf.map((row) => ({
    id: row.id,
    name: getName(row),
    meta: getMeta(row),
    rank: row.rank,
    score: row.score,
    comparisons_count: row.comparisons_count,
    lat: row.cafes?.lat ?? null,
    lng: row.cafes?.lng ?? null,
  }))

  const mapPinCount = items.filter((i) => i.lat && i.lng).length

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
        {items.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8, marginBottom: 16,
          }}>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Ranked</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{items.length}</p>
            </div>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>Top Pick</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {items[0]?.name ?? '—'}
              </p>
            </div>
            <div className="card-inset" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 4 }}>On Map</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{mapPinCount}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 32 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Your shelf is empty</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, maxWidth: '26ch', marginInline: 'auto' }}>
              Log a café visit and rank it to build your shelf.
            </p>
          </div>
        ) : (
          <ShelfClient initialItems={items} categoryId={categoryId ?? ''} />
        )}

      </div>
    </>
  )
}
