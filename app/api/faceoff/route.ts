import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { awardXP } from '@/lib/award-xp'

const K_FACTOR = 32
const DEFAULT_ELO = 1200

function expectedScore(a: number, b: number) {
  return 1 / (1 + Math.pow(10, (b - a) / 400))
}
function newElo(rating: number, expected: number, actual: 0 | 1) {
  return Math.round(rating + K_FACTOR * (actual - expected))
}
function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

// Accepts brand-centric OR café-centric field names. IDs can be UUID or slug.
type FaceoffBody = {
  categoryId: string
  brandAId?: string
  brandBId?: string
  winnerId?: string
  cafeAId?: string
  cafeBId?: string
  winnerCafeId?: string
}

type ShelfRow = {
  id: string
  cafe_id: string | null
  brand_id: string | null
  score: number
  rank: number
  comparisons_count: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FaceoffBody

    const rawCat = body.categoryId
    const rawA = body.brandAId ?? body.cafeAId
    const rawB = body.brandBId ?? body.cafeBId
    const rawWinner = body.winnerId ?? body.winnerCafeId

    if (!rawCat || !rawA || !rawB || !rawWinner) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const supabase =
      (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── 1. Resolve category slug → UUID ──────────────────────────────────────
    let categoryId = rawCat
    if (!isUUID(categoryId)) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categoryId)
        .single()
      if (!cat)
        return NextResponse.json(
          { error: `Unknown category: "${categoryId}"` },
          { status: 400 }
        )
      categoryId = cat.id
    }

    // ── 2. Resolve brand slugs → UUIDs if needed ─────────────────────────────
    async function resolveId(raw: string): Promise<string> {
      if (isUUID(raw)) return raw
      const { data } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', raw)
        .eq('category_id', categoryId)
        .maybeSingle()
      return data?.id ?? raw // keep raw so cafe_id lookup still works below
    }
    const [resolvedA, resolvedB] = await Promise.all([
      resolveId(rawA),
      resolveId(rawB),
    ])

    // ── 3. Fetch shelf rows — try brand_id first, fall back to cafe_id ────────
    const byBrandRes = await supabase
      .from('shelf_items')
      .select('id, cafe_id, brand_id, score, rank, comparisons_count')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .in('brand_id', [resolvedA, resolvedB])

    const byBrand = (byBrandRes.data ?? []) as ShelfRow[]
    const foundByBrand = new Set(byBrand.map((r) => r.brand_id).filter(Boolean))
    const missingIds = [resolvedA, resolvedB].filter((id) => !foundByBrand.has(id))

    let byCafe: ShelfRow[] = []
    if (missingIds.length > 0) {
      const byCafeRes = await supabase
        .from('shelf_items')
        .select('id, cafe_id, brand_id, score, rank, comparisons_count')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .in('cafe_id', missingIds)
      byCafe = (byCafeRes.data ?? []) as ShelfRow[]
    }

    const rows = [...byBrand, ...byCafe]
    const rowA = rows.find(
      (r) => r.brand_id === resolvedA || r.cafe_id === resolvedA
    )
    const rowB = rows.find(
      (r) => r.brand_id === resolvedB || r.cafe_id === resolvedB
    )

    if (!rowA || !rowB) {
      return NextResponse.json(
        {
          error:
            'Both items must be on your shelf before a face-off. Log a visit first.',
        },
        { status: 404 }
      )
    }

    // ── 4. ELO ────────────────────────────────────────────────────────────────
    const scoreA = rowA.score ?? DEFAULT_ELO
    const scoreB = rowB.score ?? DEFAULT_ELO
    const expA = expectedScore(scoreA, scoreB)
    const expB = 1 - expA
    const aWon =
      rawWinner === rawA ||
      rawWinner === resolvedA ||
      rawWinner === rowA.cafe_id ||
      rawWinner === rowA.brand_id
    const newScoreA = newElo(scoreA, expA, aWon ? 1 : 0)
    const newScoreB = newElo(scoreB, expB, aWon ? 0 : 1)

    const [updA, updB] = await Promise.all([
      supabase
        .from('shelf_items')
        .update({
          score: newScoreA,
          comparisons_count: (rowA.comparisons_count ?? 0) + 1,
        })
        .eq('id', rowA.id),
      supabase
        .from('shelf_items')
        .update({
          score: newScoreB,
          comparisons_count: (rowB.comparisons_count ?? 0) + 1,
        })
        .eq('id', rowB.id),
    ])
    if (updA.error)
      return NextResponse.json({ error: updA.error.message }, { status: 500 })
    if (updB.error)
      return NextResponse.json({ error: updB.error.message }, { status: 500 })

    // ── 5. Log comparison ─────────────────────────────────────────────────────
    await supabase.from('comparisons').insert({
      user_id: user.id,
      category_id: categoryId,
      brand_a_id: rowA.brand_id ?? null,
      brand_b_id: rowB.brand_id ?? null,
      winner_id: aWon ? rowA.brand_id ?? null : rowB.brand_id ?? null,
      cafe_a_id: rowA.cafe_id ?? null,
      cafe_b_id: rowB.cafe_id ?? null,
      winner_cafe_id: aWon ? rowA.cafe_id ?? null : rowB.cafe_id ?? null,
    })

    // ── 6. Recalculate ranks ──────────────────────────────────────────────────
    const { data: allShelf } = await supabase
      .from('shelf_items')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    const rankUpdates = (allShelf ?? []).map((r, i) => ({
      id: r.id,
      rank: i + 1,
    }))
    await Promise.all(
      rankUpdates.map(({ id, rank }) =>
        supabase.from('shelf_items').update({ rank }).eq('id', id)
      )
    )

    const winnerNewRank =
      rankUpdates.find((r) => r.id === (aWon ? rowA.id : rowB.id))?.rank ??
      null

    // ── 7. Award XP + check badges ────────────────────────────────────────────
    const totalFaceoffs = (rankUpdates.length > 0)
      ? await supabase
          .from('comparisons')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .then((r: { count: number | null }) => (r.count ?? 0) + 1)
      : 1

    await awardXP(supabase, user.id, 2, [
      {
        slug: 'first_sip',
        xpReward: 25,
        condition: totalFaceoffs >= 1,
      },
      {
        slug: 'power_brewer',
        xpReward: 25,
        condition: totalFaceoffs >= 100,
      },
    ])

    return NextResponse.json({
      success: true,
      winnerId: aWon ? resolvedA : resolvedB,
      winnerCafeId: aWon ? rowA.cafe_id : rowB.cafe_id,
      winnerRank: winnerNewRank,
      newScores: { [resolvedA]: newScoreA, [resolvedB]: newScoreB },
    })
  } catch (err) {
    console.error('POST /api/faceoff:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
