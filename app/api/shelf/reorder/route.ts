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

  // Fetch existing scores to preserve the ELO spread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingRes = await (supabase as any)
    .from('shelf_items')
    .select('id, score')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)

  const existing = (existingRes.data ?? []) as { id: string; score: number }[]
  const scores = existing.map((r) => r.score)
  const maxElo = scores.length ? Math.max(...scores) : 1400
  const minElo = scores.length ? Math.min(...scores) : 1000
  const spread = maxElo - minElo
  const n = itemIds.length

  const updates = itemIds.map((id, index) => ({
    id,
    rank: index + 1,
    score: n === 1 ? 1200 : Math.round(maxElo - (index / (n - 1)) * spread),
  }))

  for (const { id, rank, score } of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('shelf_items')
      .update({ rank, score })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, updated: updates.length })
}
