import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Returns:
//  - tastematch: cafes highly ranked by users with similar taste profiles
//  - friends: cafes recently visited by people you follow
//  - city: top-ranked cafes in the current user's city (by avg ELO score)
//  - unvisited: cafes in DB the user hasn't visited yet

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'for-you'

  // Get current user's profile (city + shelf)
  const { data: profile } = await supabase
    .from('profiles').select('city').eq('id', user.id).single()

  const city = profile?.city ?? null

  // Get user's already-visited cafe IDs
  const { data: visitedRows } = await supabase
    .from('cafe_visits').select('cafe_id').eq('user_id', user.id)
  const visitedIds = new Set((visitedRows ?? []).map((v: { cafe_id: string | null }) => v.cafe_id).filter(Boolean))

  // Get user's shelf scores to find taste-similar users
  const { data: myShelf } = await supabase
    .from('shelf_items')
    .select('cafe_id, score, rank')
    .eq('user_id', user.id)
    .not('cafe_id', 'is', null)
    .order('score', { ascending: false })
    .limit(20)

  const myTopCafeIds = (myShelf ?? []).slice(0, 5).map((s: { cafe_id: string | null }) => s.cafe_id).filter(Boolean)

  if (tab === 'for-you') {
    // Find users who also highly rank our top cafes → taste-similar users
    let similarUserIds: string[] = []
    if (myTopCafeIds.length > 0) {
      const { data: similarRows } = await supabase
        .from('shelf_items')
        .select('user_id, cafe_id, score')
        .in('cafe_id', myTopCafeIds)
        .neq('user_id', user.id)
        .gte('score', 1100) // only users who also rank them highly
        .order('score', { ascending: false })
        .limit(50)

      // Score similarity: users who match more of our top cafes rank higher
      const userMatchCount: Record<string, number> = {}
      for (const row of (similarRows ?? []) as { user_id: string; cafe_id: string; score: number }[]) {
        userMatchCount[row.user_id] = (userMatchCount[row.user_id] ?? 0) + 1
      }
      similarUserIds = Object.entries(userMatchCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id]) => id)
    }

    if (similarUserIds.length === 0) {
      // Fallback: city top cafes
      const { data: cityTop } = await supabase
        .from('shelf_items')
        .select('cafe_id, score, cafes(id, name, city, address)')
        .not('cafe_id', 'is', null)
        .order('score', { ascending: false })
        .limit(30)

      const seen = new Set<string>()
      const recs = []
      for (const row of (cityTop ?? []) as any[]) {
        const cafeId = row.cafe_id
        if (!cafeId || seen.has(cafeId) || visitedIds.has(cafeId)) continue
        seen.add(cafeId)
        recs.push({
          cafeId,
          name: row.cafes?.name ?? 'Unknown',
          city: row.cafes?.city ?? null,
          address: row.cafes?.address ?? null,
          avgScore: row.score,
          reason: 'Popular in your city',
          matchCount: null,
        })
        if (recs.length >= 10) break
      }
      return NextResponse.json({ tab, recs, hasTasteData: false })
    }

    // Get top cafes from taste-similar users that current user hasn't visited
    const { data: theirShelf } = await supabase
      .from('shelf_items')
      .select('cafe_id, score, user_id, cafes(id, name, city, address)')
      .in('user_id', similarUserIds)
      .not('cafe_id', 'is', null)
      .gte('score', 1050)
      .order('score', { ascending: false })
      .limit(100)

    // Aggregate: avg score + how many similar users love it
    const cafeAgg: Record<string, { name: string; city: string | null; address: string | null; totalScore: number; count: number }> = {}
    for (const row of (theirShelf ?? []) as any[]) {
      const cafeId = row.cafe_id
      if (!cafeId || visitedIds.has(cafeId)) continue
      if (!cafeAgg[cafeId]) {
        cafeAgg[cafeId] = { name: row.cafes?.name ?? 'Unknown', city: row.cafes?.city ?? null, address: row.cafes?.address ?? null, totalScore: 0, count: 0 }
      }
      cafeAgg[cafeId].totalScore += row.score
      cafeAgg[cafeId].count += 1
    }

    const recs = Object.entries(cafeAgg)
      .map(([cafeId, d]) => ({
        cafeId,
        name: d.name,
        city: d.city,
        address: d.address,
        avgScore: Math.round(d.totalScore / d.count),
        matchCount: d.count,
        reason: d.count === 1 ? '1 person with your taste loves this' : `${d.count} people with your taste love this`,
      }))
      .sort((a, b) => b.matchCount! * b.avgScore - a.matchCount! * a.avgScore)
      .slice(0, 12)

    return NextResponse.json({ tab, recs, hasTasteData: true })
  }

  if (tab === 'friends') {
    // Get followed users
    const { data: followRows } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id)
    const followingIds = (followRows ?? []).map((f: { following_id: string }) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ tab, recs: [], hasTasteData: false, empty: 'Follow people to see what they love' })
    }

    // Recent high-ranked visits from people you follow
    const { data: friendShelf } = await supabase
      .from('shelf_items')
      .select('cafe_id, score, rank, user_id, profiles(username, full_name), cafes(id, name, city, address)')
      .in('user_id', followingIds)
      .not('cafe_id', 'is', null)
      .lte('rank', 3) // only their top 3
      .order('score', { ascending: false })
      .limit(30)

    const seen = new Set<string>()
    const recs = []
    for (const row of (friendShelf ?? []) as any[]) {
      const cafeId = row.cafe_id
      if (!cafeId || seen.has(cafeId)) continue
      seen.add(cafeId)
      const friendName = row.profiles?.full_name || row.profiles?.username || 'A friend'
      recs.push({
        cafeId,
        name: row.cafes?.name ?? 'Unknown',
        city: row.cafes?.city ?? null,
        address: row.cafes?.address ?? null,
        avgScore: row.score,
        matchCount: null,
        reason: `#${row.rank} on ${friendName}'s shelf`,
        alreadyVisited: visitedIds.has(cafeId),
      })
      if (recs.length >= 10) break
    }
    return NextResponse.json({ tab, recs, hasTasteData: true })
  }

  if (tab === 'city') {
    const cityFilter = city
    const query = supabase
      .from('shelf_items')
      .select('cafe_id, score, cafes(id, name, city, address)')
      .not('cafe_id', 'is', null)
      .order('score', { ascending: false })
      .limit(80)

    const { data: cityRows } = await query

    const cafeAgg: Record<string, { name: string; city: string | null; address: string | null; totalScore: number; count: number }> = {}
    for (const row of (cityRows ?? []) as any[]) {
      const cafeId = row.cafe_id
      const c = row.cafes
      if (!cafeId || !c) continue
      if (cityFilter && c.city && !c.city.toLowerCase().includes(cityFilter.toLowerCase())) continue
      if (!cafeAgg[cafeId]) cafeAgg[cafeId] = { name: c.name, city: c.city, address: c.address, totalScore: 0, count: 0 }
      cafeAgg[cafeId].totalScore += row.score
      cafeAgg[cafeId].count += 1
    }

    const recs = Object.entries(cafeAgg)
      .filter(([, d]) => d.count >= 1)
      .map(([cafeId, d]) => ({
        cafeId,
        name: d.name,
        city: d.city,
        address: d.address,
        avgScore: Math.round(d.totalScore / d.count),
        matchCount: d.count,
        reason: `Ranked by ${d.count} Chun user${d.count > 1 ? 's' : ''}`,
        alreadyVisited: visitedIds.has(cafeId),
      }))
      .sort((a, b) => b.avgScore * Math.log(b.matchCount! + 1) - a.avgScore * Math.log(a.matchCount! + 1))
      .slice(0, 15)

    return NextResponse.json({ tab, recs, hasTasteData: recs.length > 0, city: cityFilter })
  }

  return NextResponse.json({ tab, recs: [], hasTasteData: false })
}
