import { Download, Share2, TrendingUp, Coffee } from 'lucide-react'
import { redirect } from 'next/navigation'
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
  cafes: {
    name: string | null
    city: string | null
    address: string | null
  } | null
  brands: {
    name: string | null
    tagline: string | null
    origin_city: string | null
    price_range: string | null
  } | null
}

function getInitials(name: string): string {
  return name
    .split(/[\s·|]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getPriceLabel(range: string | null): string {
  const map: Record<string, string> = {
    budget: 'Budget',
    mid: 'Mid-range',
    premium: 'Premium',
    luxury: 'Luxury',
  }
  return range ? (map[range] ?? range) : ''
}

export default async function ShelfPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

 // Replace the category fetch + shelf query block with this:

    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('slug', 'coffee')
      .maybeSingle()
    
    const categoryId = category?.id ?? null
    const categoryName = category?.name ?? 'Coffee'
    
    const { data: rawShelf } = categoryId
      ? await supabase
          .from('shelf_items')
          .select(
            'id, cafe_id, brand_id, display_name, rank, score, comparisons_count, cafes(name, city, address), brands(name, tagline, origin_city, price_range)'
          )
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .order('rank', { ascending: true })
      : { data: [] }

  const shelf = (rawShelf ?? []) as unknown as ShelfRow[]

  // ── Stats ─────────────────────────────────────────────────────────────────
  const itemCount = shelf.length
  const avgScore =
    itemCount > 0
      ? Math.round(shelf.reduce((sum, s) => sum + s.score, 0) / itemCount)
      : 0

  // Top movement: highest score item that isn't rank #1 (most improved feel)
  const topMover =
    shelf.length > 1
      ? [...shelf].sort((a, b) => b.score - a.score).find((s) => s.rank > 1)
      : null

  const topMoverName = topMover
    ? topMover.display_name ??
      topMover.cafes?.name ??
      topMover.brands?.name ??
      'Unknown'
    : null

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                My shelf · {categoryName}
              </p>
              <h1 className="section-title mt-2 text-white">
                Your {categoryName} shelf
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Your shelf is a live ranking for the currently selected category.
                As you keep making face-off picks, this order updates and becomes
                a sharper model of your taste.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="cta-secondary">
                <Share2 size={16} />
                <span>Share shelf</span>
              </button>
              <button className="cta-primary">
                <Download size={16} />
                <span>Export card</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* ── Stats sidebar ───────────────────────────────────────────── */}
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">
              Shelf stats · {categoryName}
            </p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Items ranked</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {itemCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Average shelf score</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {itemCount > 0 ? avgScore : '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Top movement</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {topMoverName ?? '—'}
                </p>
              </div>
            </div>

            {itemCount > 0 && (
              <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-accent" />
                  <p className="font-semibold text-white">Taste signal</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {itemCount < 3
                    ? 'Log more visits and rank them to build your taste profile.'
                    : 'Keep making face-off picks to sharpen your shelf signal.'}
                </p>
              </div>
            )}
          </div>

          {/* ── Shelf list ──────────────────────────────────────────────── */}
          <div className="space-y-4">
            {shelf.length === 0 ? (
              <div className="card flex flex-col items-center gap-4 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <Coffee size={24} className="text-faint" />
                </div>
                <div>
                  <p className="font-semibold text-white">Your shelf is empty</p>
                  <p className="mt-1 max-w-xs text-sm text-muted">
                    Log a visit on the Discover page to start ranking cafés on
                    your shelf.
                  </p>
                </div>
              </div>
            ) : (
              shelf.map((item) => {
                const displayName =
                  item.display_name ??
                  item.cafes?.name ??
                  item.brands?.name ??
                  'Unknown café'

                const subtitle =
                  item.brands?.tagline ??
                  [item.cafes?.city, item.cafes?.address?.split(',')[0]]
                    .filter(Boolean)
                    .join(' · ') ??
                  null

                const meta = [
                  item.brands ? getPriceLabel(item.brands.price_range) : null,
                  item.cafes?.city ?? item.brands?.origin_city ?? null,
                  `${item.score} pts`,
                ]
                  .filter(Boolean)
                  .join('  ·  ')

                const initials = getInitials(displayName)

                return (
                  <div
                    key={item.id}
                    className="card flex items-start gap-4 p-5"
                  >
                    {/* Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {displayName}
                      </p>
                      {subtitle && (
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {subtitle}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-faint">{meta}</p>
                    </div>

                    {/* Rank badge */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-accent">
                      #{item.rank}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
