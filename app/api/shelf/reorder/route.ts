import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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

  // Update each item individually to avoid upsert type inference issues
  const updates = itemIds.map((id, index) => ({
    id,
    rank: index + 1,
    score: n === 1 ? 1200 : Math.round(maxElo - (index / (n - 1)) * spread),
  }))

  // Run updates sequentially (small n, fine for shelf size)
  for (const { id, rank, score } of updates) {
    const { error } = await (supabase
      .from('shelf_items')
      .update({ rank, score })
      .eq('id', id)
      .eq('user_id', user.id) as unknown as Promise<{ error: { message: string } | null }>)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, updated: updates.length })
}
