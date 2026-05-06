import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'for-you'

  // Profile — cast to avoid `never` inference
  const profileRes = await supabase
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .single() as unknown as { data: { city: string | null } | null; error: unknown }

  const city: string | null = profileRes.data?.city ?? null

  // Visited cafe IDs
  const visitedRes = await supabase
    .from('cafe_visits')
    .select('cafe_id')
    .eq('user_id', user.id) as unknown as { data: { cafe_id: string | null }[] | null }

  const visitedIds = new Set((visitedRes.data ?? []).map((v) => v.cafe_id).filter((x): x is string => !!x))

  // User's own shelf top picks
  const myShelfRes = await supabase
    .from('shelf_items')
    .select('cafe_id, score')
    .eq('user_id', user.id)
    .not('cafe_id', 'is', null)
    .order('score', { ascending: false })
    .limit(20) as unknown as { data: { cafe_id: string | null; score: number }[] | null }

  const myTopCafeIds = (myShelfRes.data ?? [])
    .slice(0, 5)
    .map((s) => s.cafe_id)
    .filter((x): x is string => !!x)

  // ── FOR YOU ────────────────────────────────────────────────────────────────
  if (tab === 'for-you') {
    let similarUserIds: string[] = []

    if (myTopCafeIds.length > 0) {
      const similarRes = await supabase
        .from('shelf_items')
        .select('user_id, cafe_id, score')
        .in('cafe_id', myTopCafeIds)
        .neq('user_id', user.id)
        .gte('score', 1100)
        .order('score', { ascending: false })
        .limit(50) as unknown as { data: { user_id: string; cafe_id: string; score: number }[] | null }

      const matchCount: Record<string, number> = {}
      for (const row of (similarRes.data ?? [])) {
        matchCount[row.user_id] = (matchCount[row.user_id] ?? 0) + 1
      }
      similarUserIds = Object.entries(matchCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id]) => id)
    }

    if (similarUserIds.length === 0) {
      // Fallback: global top cafes the user hasn't visited
      const fallbackRes = await supabase
        .from('shelf_items')
        .select('cafe_id, score, cafes(id, name, city, address)')
        .not('cafe_id', 'is', null)
        .order('score', { ascending: false })
        .limit(40) as unknown as { data: { cafe_id: string; score: number; cafes: { id: string; name: string; city: string | null; address: string | null } | null }[] | null }

      const seen = new Set<string>()
      const recs = []
      for (const row of (fallbackRes.data ?? [])) {
        if (!row.cafe_id || seen.has(row.cafe_id) || visitedIds.has(row.cafe_id)) continue
        seen.add(row.cafe_id)
        recs.push({
          cafeId: row.cafe_id,
          name: row.cafes?.name ?? 'Unknown',
          city: row.cafes?.city ?? null,
          address: row.cafes?.address ?? null,
          avgScore: row.score,
          matchCount: null,
          reason: 'Popular on Chun',
        })
        if (recs.length >= 10) break
      }
      return NextResponse.json({ tab, recs, hasTasteData: false })
    }

    const theirRes = await supabase
      .from('shelf_items')
      .select('cafe_id, score, user_id, cafes(id, name, city, address)')
      .in('user_id', similarUserIds)
      .not('cafe_id', 'is', null)
      .gte('score', 1050)
      .order('score', { ascending: false })
      .limit(100) as unknown as { data: { cafe_id: string; score: number; user_id: string; cafes: { id: string; name: string; city: string | null; address: string | null } | null }[] | null }

    const cafeAgg: Record<string, { name: string; city: string | null; address: string | null; totalScore: number; count: number }> = {}
    for (const row of (theirRes.data ?? [])) {
      if (!row.cafe_id || visitedIds.has(row.cafe_id)) continue
      if (!cafeAgg[row.cafe_id]) {
        cafeAgg[row.cafe_id] = { name: row.cafes?.name ?? 'Unknown', city: row.cafes?.city ?? null, address: row.cafes?.address ?? null, totalScore: 0, count: 0 }
      }
      cafeAgg[row.cafe_id].totalScore += row.score
      cafeAgg[row.cafe_id].count += 1
    }

    const recs = Object.entries(cafeAgg)
      .map(([cafeId, d]) => ({
        cafeId, name: d.name, city: d.city, address: d.address,
        avgScore: Math.round(d.totalScore / d.count),
        matchCount: d.count,
        reason: d.count === 1 ? '1 person with your taste loves this' : `${d.count} people with your taste love this`,
      }))
      .sort((a, b) => b.matchCount * b.avgScore - a.matchCount * a.avgScore)
      .slice(0, 12)

    return NextResponse.json({ tab, recs, hasTasteData: true })
  }

  // ── FRIENDS ────────────────────────────────────────────────────────────────
  if (tab === 'friends') {
    const followRes = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id) as unknown as { data: { following_id: string }[] | null }

    const followingIds = (followRes.data ?? []).map((f) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ tab, recs: [], hasTasteData: false, empty: 'Follow people to see what they love' })
    }

    const friendRes = await supabase
      .from('shelf_items')
      .select('cafe_id, score, rank, user_id, profiles(username, full_name), cafes(id, name, city, address)')
      .in('user_id', followingIds)
      .not('cafe_id', 'is', null)
      .lte('rank', 3)
      .order('score', { ascending: false })
      .limit(30) as unknown as {
        data: {
          cafe_id: string; score: number; rank: number; user_id: string;
          profiles: { username: string | null; full_name: string | null } | null;
          cafes: { id: string; name: string; city: string | null; address: string | null } | null
        }[] | null
      }

    const seen = new Set<string>()
    const recs = []
    for (const row of (friendRes.data ?? [])) {
      if (!row.cafe_id || seen.has(row.cafe_id)) continue
      seen.add(row.cafe_id)
      const friendName = row.profiles?.full_name || row.profiles?.username || 'A friend'
      recs.push({
        cafeId: row.cafe_id,
        name: row.cafes?.name ?? 'Unknown',
        city: row.cafes?.city ?? null,
        address: row.cafes?.address ?? null,
        avgScore: row.score,
        matchCount: null,
        reason: `#${row.rank} on ${friendName}'s shelf`,
        alreadyVisited: visitedIds.has(row.cafe_id),
      })
      if (recs.length >= 10) break
    }
    return NextResponse.json({ tab, recs, hasTasteData: true })
  }

  // ── CITY ───────────────────────────────────────────────────────────────────
  if (tab === 'city') {
    const cityRes = await supabase
      .from('shelf_items')
      .select('cafe_id, score, cafes(id, name, city, address)')
      .not('cafe_id', 'is', null)
      .order('score', { ascending: false })
      .limit(80) as unknown as {
        data: { cafe_id: string; score: number; cafes: { id: string; name: string; city: string | null; address: string | null } | null }[] | null
      }

    const cafeAgg: Record<string, { name: string; city: string | null; address: string | null; totalScore: number; count: number }> = {}
    for (const row of (cityRes.data ?? [])) {
      const c = row.cafes
      if (!row.cafe_id || !c) continue
      if (city && c.city && !c.city.toLowerCase().includes(city.toLowerCase())) continue
      if (!cafeAgg[row.cafe_id]) cafeAgg[row.cafe_id] = { name: c.name, city: c.city, address: c.address, totalScore: 0, count: 0 }
      cafeAgg[row.cafe_id].totalScore += row.score
      cafeAgg[row.cafe_id].count += 1
    }

    const recs = Object.entries(cafeAgg)
      .map(([cafeId, d]) => ({
        cafeId, name: d.name, city: d.city, address: d.address,
        avgScore: Math.round(d.totalScore / d.count),
        matchCount: d.count,
        reason: `Ranked by ${d.count} Chun user${d.count > 1 ? 's' : ''}`,
        alreadyVisited: visitedIds.has(cafeId),
      }))
      .sort((a, b) => b.avgScore * Math.log(b.matchCount + 1) - a.avgScore * Math.log(a.matchCount + 1))
      .slice(0, 15)

    return NextResponse.json({ tab, recs, hasTasteData: recs.length > 0, city })
  }

  return NextResponse.json({ tab, recs: [], hasTasteData: false })
}
