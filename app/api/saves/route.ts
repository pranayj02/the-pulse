import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { cafeId, visitId } = (await request.json()) as { cafeId?: string; visitId?: string }
    if (!cafeId) return NextResponse.json({ error: 'cafeId required' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const existing = await db.from('saved_cafes').select('id')
      .eq('cafe_id', cafeId).eq('user_id', user.id).maybeSingle()
    if (existing.data) {
      await db.from('saved_cafes').delete().eq('cafe_id', cafeId).eq('user_id', user.id)
      return NextResponse.json({ saved: false })
    }
    await db.from('saved_cafes').insert({ cafe_id: cafeId, user_id: user.id, ...(visitId ? { visit_id: visitId } : {}) })
    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('POST /api/saves:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
