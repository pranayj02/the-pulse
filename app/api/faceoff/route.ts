import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const K_FACTOR = 32
const DEFAULT_ELO = 1200

function expectedScore(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)) }
function newElo(rating: number, expected: number, actual: 0 | 1) {
  return Math.round(rating + K_FACTOR * (actual - expected))
}

// Simple UUID v4 check
function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

type FaceoffBody = {
  categoryId: string        // UUID or slug — we resolve either
  brandAId?: string         // UUID or slug
  brandBId?: string         // UUID or slug
  winnerId?: string         // must match one of the above (same form)
  cafeAId?: string          // legacy
  cafeBId?: string          // legacy
  winnerCafeId?: string     // legacy
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

    // Normalise field names (accept both brand-centric and cafe-centric)
    const rawCategoryId = body.categoryId
    const rawIdA   = body.brandAId   ?? body.cafeAId
    const rawIdB   = body.brandBId   ?? body.cafeBId
    const rawWinner = body.winnerId  ?? body.winnerCafeId

    if (!rawCategoryId || !rawIdA || !rawIdB || !rawWinner) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase =
      (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── 1. Resolve categoryId slug → UUID if needed ───────────────────────────
    let categoryId = rawCategoryId
    if (!isUUID(categoryId)) {
      const { data: cat, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categoryId)
        .single()
      if (catErr || !cat) {
        return NextResponse.json({ error: `Unknown category: "${categoryId}"` }, { status: 400 })
      }
      categoryId = cat.id
    }

    // ── 2. Resolve brand slugs → UUIDs if needed ─────────────────────────────
    async function resolveBrandId(raw: string): Promise<string | null> {
      if (isUUID(raw)) return raw
      const { data } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', raw)
        .eq('category_id', categoryId)
        .maybeSingle()
      return data?.id ?? null
    }

    const [resolvedA, resolvedB] = await Promise.all([
      resolveBrandId(rawIdA),
      resolveBrandId(rawIdB),
    ])

    if (!resolvedA || !resolvedB) {
      return NextResponse.json(
        { error: 'One or both brands could not be found in this category.' },
        { status: 404 }
      )
    }

    // Winner resolution: the raw winner ID maps to either A or B
    const resolvedWinner = (rawWinner === rawIdA || rawWinner === resolvedA)
      ? resolvedA
      : resolvedB

    // ── 3. Fetch shelf items for both brands ──────────────────────────────────
    const { data: shelfRows, error: shelfErr } = await supabase
      .from('shelf_items')
      .select('id, cafe_id, brand_id, score, rank, comparisons_count')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .in('brand_id', [resolvedA, resolvedB])

    if (shelfErr) return NextResponse.json({ error: shelfErr.message }, { status: 500 })

    const rows = (shelfRows ?? []) as ShelfRow[]
    const rowA = rows.find((r) => r.brand_id === resolvedA)
    const rowB = rows.find((r) => r.brand_id === resolvedB)

    if (!rowA || !rowB) {
      return NextResponse.json(
        { error: 'Both brands must be on your shelf before a face-off. Add them first.' },
        { status: 404 }
      )
    }

    // ── 4. ELO calculation ────────────────────────────────────────────────────
    const scoreA = rowA.score ?? DEFAULT_ELO
    const scoreB = rowB.score ?? DEFAULT_ELO
    const expectedA = expectedScore(scoreA, scoreB)
    const expectedB = 1 - expectedA
    const aWon = resolvedWinner === resolvedA
    const newScoreA = newElo(scoreA, expectedA, aWon ? 1 : 0)
    const newScoreB = newElo(scoreB, expectedB, aWon ? 0 : 1)

    // ── 5. Update scores ──────────────────────────────────────────────────────
    const [updA, updB] = await Promise.all([
      supabase.from('shelf_items').update({
        score: newScoreA,
        comparisons_count: (rowA.comparisons_count ?? 0) + 1,
      }).eq('id', rowA.id),
      supabase.from('shelf_items').update({
        score: newScoreB,
        comparisons_count: (rowB.comparisons_count ?? 0) + 1,
      }).eq('id', rowB.id),
    ])
    if (updA.error) return NextResponse.json({ error: updA.error.message }, { status: 500 })
    if (updB.error) return NextResponse.json({ error: updB.error.message }, { status: 500 })

    // ── 6. Log comparison ─────────────────────────────────────────────────────
    await supabase.from('comparisons').insert({
      user_id: user.id,
      category_id: categoryId,
      brand_a_id: resolvedA,
      brand_b_id: resolvedB,
      winner_id: resolvedWinner,
      cafe_a_id: rowA.cafe_id ?? null,
      cafe_b_id: rowB.cafe_id ?? null,
      winner_cafe_id: aWon ? rowA.cafe_id ?? null : rowB.cafe_id ?? null,
    })

    // ── 7. Recalculate ranks ──────────────────────────────────────────────────
    const { data: allShelf, error: rankErr } = await supabase
      .from('shelf_items')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    if (rankErr) return NextResponse.json({ error: rankErr.message }, { status: 500 })

    const rankUpdates = (allShelf ?? []).map((r, i) => ({ id: r.id, rank: i + 1 }))
    await Promise.all(
      rankUpdates.map(({ id, rank }) => supabase.from('shelf_items').update({ rank }).eq('id', id))
    )

    const winnerNewRank = rankUpdates.find((r) => r.id === (aWon ? rowA.id : rowB.id))?.rank ?? null

    return NextResponse.json({
      success: true,
      winnerId: resolvedWinner,
      winnerRank: winnerNewRank,
      newScores: { [resolvedA]: newScoreA, [resolvedB]: newScoreB },
    })
  } catch (err) {
    console.error('POST /api/faceoff failed:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
