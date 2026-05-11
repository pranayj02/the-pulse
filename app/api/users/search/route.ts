import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const mode = searchParams.get('mode') ?? 'search' // 'search' | 'city' | 'suggested'

  // Get current user profile for city + taste matching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: me } = await (supabase as any)
    .from('profiles')
    .select('city, xp')
    .eq('id', user.id)
    .single()

  const myCity: string | null = me?.city ?? null

  // Get who I already follow (for follow state on each result)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: followingRows } = await (supabase as any)
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingSet = new Set<string>(
    ((followingRows ?? []) as { following_id: string }[]).map((r) => r.following_id)
  )

  type ProfileHit = {
    id: string
    username: string | null
    full_name: string | null
    city: string | null
    xp: number | null
    level: string | null
    bio: string | null
    avatar_url: string | null
  }

  let profiles: ProfileHit[] = []

  // ── SEARCH by name or username ─────────────────────────────────────────────
  if (mode === 'search' && q.length >= 2) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, username, full_name, city, xp, level, bio, avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .neq('id', user.id)
      .order('xp', { ascending: false })
      .limit(20)
    profiles = data ?? []
  }

  // ── CITY — people in same city sorted by XP ────────────────────────────────
  else if (mode === 'city' && myCity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, username, full_name, city, xp, level, bio, avatar_url')
      .eq('city', myCity)
      .neq('id', user.id)
      .order('xp', { ascending: false })
      .limit(30)
    profiles = data ?? []
  }

  // ── SUGGESTED — users whose top cafés overlap with mine ───────────────────
  else if (mode === 'suggested') {
    // Get my top 10 cafe IDs by score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: myShelf } = await (supabase as any)
      .from('shelf_items')
      .select('cafe_id')
      .eq('user_id', user.id)
      .not('cafe_id', 'is', null)
      .order('score', { ascending: false })
      .limit(10)

    const myCafeIds = ((myShelf ?? []) as { cafe_id: string }[])
      .map((r) => r.cafe_id)
      .filter(Boolean)

    if (myCafeIds.length >= 2) {
      // Find users who have those cafes highly ranked
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: overlaps } = await (supabase as any)
        .from('shelf_items')
        .select('user_id')
        .in('cafe_id', myCafeIds)
        .neq('user_id', user.id)
        .gte('score', 1100)

      // Count overlaps per user, take top 20
      const countMap: Record<string, number> = {}
      for (const row of ((overlaps ?? []) as { user_id: string }[])) {
        countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1
      }
      const topUserIds = Object.entries(countMap)
        .filter(([, c]) => c >= 2) // at least 2 shared cafes
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id]) => id)

      if (topUserIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('profiles')
          .select('id, username, full_name, city, xp, level, bio, avatar_url')
          .in('id', topUserIds)
          .neq('id', user.id)
        profiles = data ?? []
        // Sort by overlap count
        profiles.sort((a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0))
      }
    }

    // Fallback to city if not enough taste overlap
    if (profiles.length < 5 && myCity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, username, full_name, city, xp, level, bio, avatar_url')
        .eq('city', myCity)
        .neq('id', user.id)
        .order('xp', { ascending: false })
        .limit(20)
      // Merge without dupes
      const existingIds = new Set(profiles.map((p) => p.id))
      for (const p of (data ?? []) as ProfileHit[]) {
        if (!existingIds.has(p.id)) profiles.push(p)
      }
    }
  }

  // Attach follow state and clean up display
  const results = profiles.map((p) => ({
    id: p.id,
    username: p.username,
    full_name: p.full_name,
    city: p.city,
    xp: p.xp ?? 0,
    level: p.level ?? 'sip',
    bio: p.bio,
    avatar_url: p.avatar_url,
    isFollowing: followingSet.has(p.id),
  }))

  return NextResponse.json({ users: results, myCity })
}
