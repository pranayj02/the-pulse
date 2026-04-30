import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { visitId } = (await request.json()) as { visitId?: string }
    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const existing = await db.from('activity_likes').select('id')
      .eq('visit_id', visitId).eq('user_id', user.id).maybeSingle()
    if (existing.data) {
      await db.from('activity_likes').delete().eq('visit_id', visitId).eq('user_id', user.id)
    } else {
      await db.from('activity_likes').insert({ visit_id: visitId, user_id: user.id })
    }
    const countRes = await db.from('activity_likes').select('id', { count: 'exact', head: true }).eq('visit_id', visitId)
    return NextResponse.json({ liked: !existing.data, count: countRes.count ?? 0 })
  } catch (err) {
    console.error('POST /api/likes:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
