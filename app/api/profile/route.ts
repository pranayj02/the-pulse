import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type ProfileUpdatePayload = {
  full_name?: string | null
  username?: string | null
  city?: string | null
  bio?: string | null
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, username, full_name, city, bio, avatar_url, xp, level, is_early_bird, is_pioneer')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as ProfileUpdatePayload

  // Validate
  if (body.full_name !== undefined && typeof body.full_name === 'string' && body.full_name.trim().length > 80) {
    return NextResponse.json({ error: 'Name too long (max 80 chars)' }, { status: 400 })
  }
  if (body.username !== undefined && body.username !== null) {
    const uname = body.username.trim()
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters, lowercase letters, numbers, underscores only' },
        { status: 400 }
      )
    }
    // Check uniqueness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('username', uname)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
  }
  if (body.bio !== undefined && typeof body.bio === 'string' && body.bio.length > 200) {
    return NextResponse.json({ error: 'Bio too long (max 200 chars)' }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  if (body.full_name !== undefined) updates.full_name = body.full_name?.trim() ?? null
  if (body.username !== undefined) updates.username = body.username?.trim() ?? null
  if (body.city !== undefined) updates.city = body.city?.trim() ?? null
  if (body.bio !== undefined) updates.bio = body.bio?.trim() ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, username, full_name, city, bio, avatar_url, xp, level')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
