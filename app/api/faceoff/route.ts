import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { updateElo } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type FaceoffPayload = {
  categoryId: string
  brandAId: string
  brandBId: string
  winnerId: string
}

const DEFAULT_SCORE = 1200

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FaceoffPayload
    const { categoryId, brandAId, brandBId, winnerId } = body

    if (!categoryId || !brandAId || !brandBId || !winnerId) {
      return NextResponse.json(
        { error: 'Missing required face-off fields.' },
        { status: 400 }
      )
    }

    if (brandAId === brandBId) {
      return NextResponse.json(
        { error: 'A face-off requires two different brands.' },
        { status: 400 }
      )
    }

    if (winnerId !== brandAId && winnerId !== brandBId) {
      return NextResponse.json(
        { error: 'Winner must match one of the brands in the face-off.' },
        { status: 400 }
      )
    }

    const loserId = winnerId === brandAId ? brandBId : brandAId

    

    const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<Database>

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: comparisonError } = await supabase
      .from('comparisons')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        brand_a_id: brandAId,
        brand_b_id: brandBId,
        winner_id: winnerId,
      })

    if (comparisonError) {
      return NextResponse.json({ error: comparisonError.message }, { status: 500 })
    }

    const { data: currentShelf, error: shelfFetchError } = await supabase
      .from('shelf_items')
      .select('brand_id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .in('brand_id', [brandAId, brandBId])

    if (shelfFetchError) {
      return NextResponse.json({ error: shelfFetchError.message }, { status: 500 })
    }

    const winnerCurrent = currentShelf?.find((item) => item.brand_id === winnerId)
    const loserCurrent = currentShelf?.find((item) => item.brand_id === loserId)

    const winnerScore = winnerCurrent?.score ?? DEFAULT_SCORE
    const loserScore = loserCurrent?.score ?? DEFAULT_SCORE

    const nextScores = updateElo(winnerScore, loserScore)

    const upserts = [
      {
        user_id: user.id,
        brand_id: winnerId,
        category_id: categoryId,
        rank: 999,
        score: nextScores.newWinner,
        quick_review: null,
        tried_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        brand_id: loserId,
        category_id: categoryId,
        rank: 999,
        score: nextScores.newLoser,
        quick_review: null,
        tried_at: new Date().toISOString(),
      },
    ]

    const { error: upsertError } = await supabase
      .from('shelf_items')
      .upsert(upserts, {
        onConflict: 'user_id,brand_id,category_id',
      })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    const { data: allShelf, error: allShelfError } = await supabase
      .from('shelf_items')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    if (allShelfError) {
      return NextResponse.json({ error: allShelfError.message }, { status: 500 })
    }

    const rankUpdates =
      allShelf?.map((item, index) =>
        supabase
          .from('shelf_items')
          .update({ rank: index + 1 })
          .eq('id', item.id)
      ) ?? []

    await Promise.all(rankUpdates)

    return NextResponse.json({
      success: true,
      winnerId,
      loserId,
      scores: nextScores,
    })
  } catch (error) {
    console.error('Face-off API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong while saving the face-off.' },
      { status: 500 }
    )
  }
}
