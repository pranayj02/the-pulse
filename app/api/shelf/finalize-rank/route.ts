import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Called by LogVisitModal once the settle phase is complete.
// Commits the final rank for the newly ranked café and re-sorts the entire shelf.
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

    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch full shelf sorted by current ELO score DESC
    const { data: allShelf, error: shelfErr } = await supabase
      .from('shelf_items')
      .select('id, cafe_id, score')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('score', { ascending: false })

    if (shelfErr) {
      return NextResponse.json({ error: shelfErr.message }, { status: 500 })
    }

    const shelf = allShelf ?? []

    // Re-sort by score and write ranks in one batch
    const rankUpdates = shelf.map((row, i) => ({ id: row.id, rank: i + 1 }))

    await Promise.all(
      rankUpdates.map(({ id, rank }) =>
        supabase.from('shelf_items').update({ rank }).eq('id', id)
      )
    )

    // Return the actual rank of the newly ranked café based on score sort
    const newCafeRow = rankUpdates.find((r) =>
      shelf[rankUpdates.indexOf(r)]?.cafe_id === cafeId
    )
    const actualRank = newCafeRow?.rank ?? finalRank

    return NextResponse.json({ success: true, actualRank })
  } catch (err) {
    console.error('POST /api/shelf/finalize-rank:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
