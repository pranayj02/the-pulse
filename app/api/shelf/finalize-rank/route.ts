import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type ShelfRow = {
  id: string
  cafe_id: string | null
  score: number
}

export async function POST(request: Request) {
  try {
    const { cafeId, categoryId, finalRank } = await request.json() as {
      cafeId: string
      categoryId: string
      finalRank: number
    }

    if (!cafeId || !categoryId || typeof finalRank !== 'number') {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rawShelf, error: shelfErr } = await supabase
      .from('shelf_items')
      .select('id, cafe_id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    if (shelfErr) {
      return NextResponse.json({ error: shelfErr.message }, { status: 500 })
    }

    const shelf = (rawShelf ?? []) as ShelfRow[]

    const rankUpdates = shelf.map((row, i) => ({ id: row.id, rank: i + 1 }))

    await Promise.all(
      rankUpdates.map(({ id, rank }) =>
        supabase.from('shelf_items').update({ rank }).eq('id', id)
      )
    )

    const newCafeIdx = shelf.findIndex((r) => r.cafe_id === cafeId)
    const actualRank = newCafeIdx >= 0 ? newCafeIdx + 1 : finalRank

    return NextResponse.json({ success: true, actualRank })
  } catch (err) {
    console.error('POST /api/shelf/finalize-rank:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
