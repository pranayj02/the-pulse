import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type CommentRow = { id: string; user_id: string; body: string; created_at: string }
type ProfileRow = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }

export async function GET(request: Request) {
  try {
    const visitId = new URL(request.url).searchParams.get('visitId')
    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const raw = await db.from('activity_comments')
      .select('id, user_id, body, created_at')
      .eq('visit_id', visitId).order('created_at', { ascending: true }).limit(50)
    if (raw.error) return NextResponse.json({ error: raw.error.message }, { status: 500 })

    const rows = (raw.data ?? []) as CommentRow[]
    const userIds = [...new Set(rows.map((r) => r.user_id))]
    const pMap: Record<string, Omit<ProfileRow, 'id'>> = {}

    if (userIds.length > 0) {
      const pr = await db.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
      for (const p of (pr.data ?? []) as ProfileRow[]) {
        pMap[p.id] = { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }
      }
    }
    return NextResponse.json({ comments: rows.map((r) => ({ ...r, ...pMap[r.user_id] })) })
  } catch (err) {
    console.error('GET /api/comments:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { visitId, body } = (await request.json()) as { visitId?: string; body?: string }
    if (!visitId || !body?.trim()) return NextResponse.json({ error: 'visitId and body required' }, { status: 400 })
    if (body.trim().length > 500) return NextResponse.json({ error: 'Too long' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const ins = await db.from('activity_comments')
      .insert({ visit_id: visitId, user_id: user.id, body: body.trim() })
      .select('id, user_id, body, created_at').single()
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
    const pr = await db.from('profiles').select('username, full_name, avatar_url').eq('id', user.id).single()
    const p = (pr.data ?? {}) as { username?: string | null; full_name?: string | null; avatar_url?: string | null }
    return NextResponse.json({ comment: { ...ins.data, username: p.username ?? null, full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null } })
  } catch (err) {
    console.error('POST /api/comments:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activity_comments').delete().eq('id', id).eq('user_id', user.id)
    return new Response(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/comments:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
