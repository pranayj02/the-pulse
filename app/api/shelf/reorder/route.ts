import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// POST /api/shelf/reorder
// Body: { itemIds: string[], categoryId: string }
// itemIds is the full ordered array from rank 1 (index 0) to rank N (last index)
// We recalculate ELO scores: keep the min/max ELO from existing scores,
// redistribute evenly so rank order is respected.

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { itemIds: string[]; categoryId: string }
  const { itemIds, categoryId } = body

  if (!itemIds?.length || !categoryId) {
    return NextResponse.json({ error: 'itemIds and categoryId required' }, { status: 400 })
  }

  // Fetch existing scores to preserve the spread
  const existingRes = await supabase
    .from('shelf_items')
    .select('id, score')
    .eq('user_id', user.id)
    .eq('category_id', categoryId) as unknown as { data: { id: string; score: number }[] | null }

  const existing = existingRes.data ?? []
  const scores = existing.map((r) => r.score)
  const maxElo = scores.length ? Math.max(...scores) : 1400
  const minElo = scores.length ? Math.min(...scores) : 1000
  const spread = maxElo - minElo
  const n = itemIds.length

  // Distribute ELO linearly: rank 1 gets maxElo, rank N gets minElo
  // If only 1 item, keep it at 1200
  const updates = itemIds.map((id, index) => {
    const newScore = n === 1
      ? 1200
      : Math.round(maxElo - (index / (n - 1)) * spread)
    return { id, rank: index + 1, score: newScore }
  })

  // Batch update — Supabase doesn't support bulk update in one call,
  // so we upsert with the user_id/category_id guard
  const upsertRows = updates.map(({ id, rank, score }) => ({
    id,
    rank,
    score,
    user_id: user.id,
    category_id: categoryId,
  }))

  const { error } = await supabase
    .from('shelf_items')
    .upsert(upsertRows, { onConflict: 'id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: updates.length })
}
