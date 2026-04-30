import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const K_FACTOR = 32
const DEFAULT_ELO = 1200

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function newElo(rating: number, expected: number, actual: 0 | 1): number {
  return Math.round(rating + K_FACTOR * (actual - expected))
}

type FaceoffBody = {
  categoryId: string
  // brand-centric (what the faceoff page sends)
  brandAId?: string
  brandBId?: string
  winnerId?: string
  // cafe-centric (legacy / alternative)
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
  comparisons_count?: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FaceoffBody

    // Normalise: accept either brand-centric or cafe-centric field names
    const categoryId = body.categoryId
    const idA = body.brandAId ?? body.cafeAId
    const idB = body.brandBId ?? body.cafeBId
    const winnerId = body.winnerId ?? body.winnerCafeId

    if (!categoryId || !idA || !idB || !winnerId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (winnerId !== idA && winnerId !== idB) {
      return NextResponse.json(
        { error: 'winnerId must be one of the two competing IDs.' },
        { status: 400 }
      )
    }

    const supabase =
      (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Fetch both shelf items (try brand_id first, fall back to cafe_id) ────
    let rows: ShelfRow[] = []
    let usedField: 'brand_id' | 'cafe_id' = 'brand_id'

    const { data: byBrand, error: brandErr } = await supabase
      .from('shelf_items')
      .select('id, cafe_id, brand_id, score, rank, comparisons_count')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .in('brand_id', [idA, idB])

    if (!brandErr && byBrand && byBrand.length === 2) {
      rows = byBrand as ShelfRow[]
      usedField = 'brand_id'
    } else {
      // Fall back to cafe_id lookup (legacy)
      const { data: byCafe, error: cafeErr } = await supabase
        .from('shelf_items')
        .select('id, cafe_id, brand_id, score, rank, comparisons_count')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .in('cafe_id', [idA, idB])

      if (cafeErr) {
        return NextResponse.json({ error: cafeErr.message }, { status: 500 })
      }
      rows = (byCafe ?? []) as ShelfRow[]
      usedField = 'cafe_id'
    }

    const rowA = rows.find((r) => r[usedField] === idA)
    const rowB = rows.find((r) => r[usedField] === idB)

    if (!rowA || !rowB) {
      return NextResponse.json(
        { error: 'Both items must be on your shelf before a face-off.' },
        { status: 404 }
      )
    }

    // ── ELO ──────────────────────────────────────────────────────────────────
    const scoreA = rowA.score ?? DEFAULT_ELO
    const scoreB = rowB.score ?? DEFAULT_ELO
    const expectedA = expectedScore(scoreA, scoreB)
    const expectedB = 1 - expectedA
    const aWon = winnerId === idA
    const newScoreA = newElo(scoreA, expectedA, aWon ? 1 : 0)
    const newScoreB = newElo(scoreB, expectedB, aWon ? 0 : 1)

    // ── Update scores ─────────────────────────────────────────────────────────
    const [updateA, updateB] = await Promise.all([
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

    if (updateA.error) return NextResponse.json({ error: updateA.error.message }, { status: 500 })
    if (updateB.error) return NextResponse.json({ error: updateB.error.message }, { status: 500 })

    // ── Log comparison ────────────────────────────────────────────────────────
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

    // ── Recalculate ranks ─────────────────────────────────────────────────────
    const { data: allShelf, error: allShelfError } = await supabase
      .from('shelf_items')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    if (allShelfError) {
      return NextResponse.json({ error: allShelfError.message }, { status: 500 })
    }

    const rankUpdates = (allShelf ?? []).map((row, index) => ({
      id: row.id,
      rank: index + 1,
    }))

    await Promise.all(
      rankUpdates.map(({ id, rank }) =>
        supabase.from('shelf_items').update({ rank }).eq('id', id)
      )
    )

    const winnerNewRank =
      rankUpdates.find((r) => r.id === (aWon ? rowA.id : rowB.id))?.rank ?? null

    return NextResponse.json({
      success: true,
      winnerId,
      winnerRank: winnerNewRank,
      newScores: {
        [idA]: newScoreA,
        [idB]: newScoreB,
      },
    })
  } catch (error) {
    console.error('POST /api/faceoff failed:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
