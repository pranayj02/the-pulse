import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type RawRow = {
  id: string
  cafe_id: string | null
  brand_id: string | null
  display_name: string | null
  score: number
  rank: number
  comparisons_count: number
  cafes:
    | { name: string | null; city: string | null }
    | { name: string | null; city: string | null }[]
    | null
  brands:
    | { name: string | null; logo_url: string | null }
    | { name: string | null; logo_url: string | null }[]
    | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categorySlug = searchParams.get('category') ?? 'coffee'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 50)

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve category slug → UUID
    const catRes = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()
    if (catRes.error || !catRes.data)
      return NextResponse.json(
        { error: `Unknown category: ${categorySlug}` },
        { status: 400 }
      )
    const categoryId = catRes.data.id

    const raw = await supabase
      .from('shelf_items')
      .select(
        'id, cafe_id, brand_id, display_name, score, rank, comparisons_count, cafes(name, city), brands(name, logo_url)'
      )
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('rank', { ascending: true })
      .limit(limit)

    if (raw.error)
      return NextResponse.json({ error: raw.error.message }, { status: 500 })

    const items = ((raw.data ?? []) as unknown as RawRow[]).map((row) => {
      const cafe = Array.isArray(row.cafes) ? row.cafes[0] : row.cafes
      const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands

      const displayName =
        row.display_name ??
        (brand?.name
          ? `${brand.name}${cafe?.city ? ` · ${cafe.city}` : ''}`
          : null) ??
        cafe?.name ??
        'Unknown café'

      return {
        id: row.id,
        cafeId: row.cafe_id,
        brandId: row.brand_id,
        displayName,
        score: row.score ?? 1200,
        rank: row.rank ?? 999,
        comparisons_count: row.comparisons_count ?? 0,
        logoUrl: (brand as { logo_url?: string | null } | null)?.logo_url ?? null,
      }
    })

    return NextResponse.json({ categoryId, categorySlug, items })
  } catch (err) {
    console.error('GET /api/shelf failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
