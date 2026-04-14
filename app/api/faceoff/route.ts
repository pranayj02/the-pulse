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
  cafeAId: string
  cafeBId: string
  winnerCafeId: string
}

type ShelfRow = {
  id: string
  cafe_id: string
  brand_id: string | null
  score: number
  rank: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FaceoffBody
    const { categoryId, cafeAId, cafeBId, winnerCafeId } = body

    if (!categoryId || !cafeAId || !cafeBId || !winnerCafeId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (winnerCafeId !== cafeAId && winnerCafeId !== cafeBId) {
      return NextResponse.json({ error: 'winnerCafeId must be cafeAId or cafeBId.' }, { status: 400 })
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

    // ── Fetch both shelf items ────────────────────────────────────────────────
    const { data: shelfRows, error: shelfError } = await supabase
      .from('shelf_items')
      .select('id, cafe_id, brand_id, score, rank')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .in('cafe_id', [cafeAId, cafeBId])

    if (shelfError) {
      return NextResponse.json({ error: shelfError.message }, { status: 500 })
    }

    const rows = (shelfRows ?? []) as ShelfRow[]
    const rowA = rows.find((r) => r.cafe_id === cafeAId)
    const rowB = rows.find((r) => r.cafe_id === cafeBId)

    if (!rowA || !rowB) {
      return NextResponse.json(
        { error: 'Could not find shelf items for both cafes.' },
        { status: 404 }
      )
    }

    // ── Elo calculation ───────────────────────────────────────────────────────
    const scoreA = rowA.score ?? DEFAULT_ELO
    const scoreB = rowB.score ?? DEFAULT_ELO
    const expectedA = expectedScore(scoreA, scoreB)
    const expectedB = 1 - expectedA

    const aWon = winnerCafeId === cafeAId
    const newScoreA = newElo(scoreA, expectedA, aWon ? 1 : 0)
    const newScoreB = newElo(scoreB, expectedB, aWon ? 0 : 1)

    // ── Update Elo scores ─────────────────────────────────────────────────────
    const [updateA, updateB] = await Promise.all([
      supabase
        .from('shelf_items')
        .update({
          score: newScoreA,
          comparisons_count: (rowA as ShelfRow & { comparisons_count?: number }).comparisons_count ?? 0 + 1,
        })
        .eq('id', rowA.id),
      supabase
        .from('shelf_items')
        .update({
          score: newScoreB,
          comparisons_count: (rowB as ShelfRow & { comparisons_count?: number }).comparisons_count ?? 0 + 1,
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
      cafe_a_id: cafeAId,
      cafe_b_id: cafeBId,
      winner_cafe_id: winnerCafeId,
    })

    // ── Recalculate ranks for this user's category shelf ──────────────────────
    // Fetch all shelf items for this category, sort by score DESC, assign ranks 1..n
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

    // Batch rank updates
    await Promise.all(
      rankUpdates.map(({ id, rank }) =>
        supabase.from('shelf_items').update({ rank }).eq('id', id)
      )
    )

    // ── Return new rank of the winner ─────────────────────────────────────────
    const winnerNewRank = rankUpdates.find(
      (r) => r.id === (aWon ? rowA.id : rowB.id)
    )?.rank ?? null

    return NextResponse.json({
      success: true,
      winnerCafeId,
      winnerRank: winnerNewRank,
      newScores: {
        [cafeAId]: newScoreA,
        [cafeBId]: newScoreB,
      },
    })
  } catch (error) {
    console.error('POST /api/faceoff failed:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
