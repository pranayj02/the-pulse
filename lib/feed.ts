import { createSupabaseServerClient } from '@/lib/supabase-server'

export type FeedScope = 'for-you' | 'following' | 'city'

type Actor = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  city: string | null
  level: string
  xp: number
}

export type FeedItem = {
  id: string
  type: 'visit'
  ts: string
  actor: Actor
  payload: {
    cafeName?: string | null
    cafeId?: string | null
    note?: string | null
    visitedAt?: string | null
    shelfRank?: number | null
    photoUrls?: string[]
    likeCount: number
    commentCount: number
    isLiked: boolean
    isSaved: boolean
  }
}

export type FeedComment = {
  id: string
  user_id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  body: string
  created_at: string
}

export type FeedResult = {
  scope: FeedScope
  currentUser: Actor
  counts: { following: number; city: number }
  items: FeedItem[]
}

type QR<T> = { data: T; error: { message: string } | null }

function unique(vals: string[]) { return Array.from(new Set(vals.filter(Boolean))) }
function fallbackActor(id: string): Actor {
  return { id, username: null, full_name: null, avatar_url: null, city: null, level: 'Sip', xp: 0 }
}

export async function getFeed(scope: FeedScope = 'for-you'): Promise<FeedResult | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meRes = (await supabase.from('profiles')
    .select('id, username, full_name, avatar_url, city, level, xp')
    .eq('id', user.id).single()) as unknown as QR<Actor | null>
  if (meRes.error || !meRes.data) throw new Error(meRes.error?.message ?? 'No profile')
  const currentUser = meRes.data

  const followRes = (await supabase.from('follows').select('following_id')
    .eq('follower_id', user.id)) as unknown as QR<{ following_id: string }[] | null>
  if (followRes.error) throw new Error(followRes.error.message)
  const followingIds = unique((followRes.data ?? []).map((r) => r.following_id))

  let cityIds: string[] = []
  if (currentUser.city) {
    const cr = (await supabase.from('profiles').select('id').eq('city', currentUser.city)
      .limit(50)) as unknown as QR<{ id: string }[] | null>
    if (cr.error) throw new Error(cr.error.message)
    cityIds = unique((cr.data ?? []).map((r) => r.id))
  }

  const actorIds = scope === 'following' ? followingIds
    : scope === 'city' ? cityIds
    : unique([...followingIds, ...cityIds, user.id])
  const scopedIds = actorIds.length > 0 ? actorIds : [user.id]

  type VisitRow = {
    id: string; user_id: string; note: string | null
    visited_at: string; created_at: string
    cafes: { id: string; name: string | null; primary_brand_id: string | null }
      | { id: string; name: string | null; primary_brand_id: string | null }[] | null
  }

  const [visitsRaw, actorsRaw] = await Promise.all([
    supabase.from('cafe_visits')
      .select('id, user_id, note, visited_at, created_at, cafes(id, name, primary_brand_id)')
      .in('user_id', scopedIds).order('created_at', { ascending: false }).limit(60),
    supabase.from('profiles').select('id, username, full_name, avatar_url, city, level, xp')
      .in('id', unique([...scopedIds, user.id])),
  ])
  const visitsRes = visitsRaw as unknown as QR<VisitRow[] | null>
  const actorsRes = actorsRaw as unknown as QR<Actor[] | null>
  if (visitsRes.error) throw new Error(visitsRes.error.message)
  if (actorsRes.error) throw new Error(actorsRes.error.message)

  const actorMap = new Map<string, Actor>()
  for (const a of actorsRes.data ?? []) actorMap.set(a.id, a)
  actorMap.set(currentUser.id, currentUser)

  const visits = visitsRes.data ?? []
  const visitIds = visits.map((r) => r.id)

  function firstCafe(row: VisitRow) {
    return row.cafes && !Array.isArray(row.cafes) ? row.cafes : null
  }

  // Shelf ranks
  const shelfPairs = visits
    .map((r) => { const c = firstCafe(r); return c?.primary_brand_id ? { uid: r.user_id, bid: c.primary_brand_id } : null })
    .filter((v): v is { uid: string; bid: string } => Boolean(v))
  const shelfRankMap = new Map<string, number>()
  if (shelfPairs.length > 0) {
    const sr = await supabase.from('shelf_items').select('user_id, brand_id, rank')
      .in('user_id', unique(shelfPairs.map((p) => p.uid)))
      .in('brand_id', unique(shelfPairs.map((p) => p.bid)))
    const srRes = sr as unknown as QR<{ user_id: string; brand_id: string; rank: number }[] | null>
    if (!srRes.error) for (const row of srRes.data ?? []) shelfRankMap.set(`${row.user_id}:${row.brand_id}`, row.rank)
  }

  // Photos
  const photoMap = new Map<string, string[]>()
  if (visitIds.length > 0) {
    const pr = await supabase.from('visit_photos').select('*').in('visit_id', visitIds)
    const prRes = pr as unknown as QR<Record<string, string | null>[] | null>
    if (!prRes.error) {
      for (const row of prRes.data ?? []) {
        const vid = row['visit_id'] ?? null
        if (!vid) continue
        let url = row['public_url'] ?? row['photo_url'] ?? row['url'] ?? row['image_url'] ?? null
        if (!url && row['storage_path']) url = supabase.storage.from('visit-photos').getPublicUrl(row['storage_path']).data.publicUrl || null
        if (!url) continue
        const ex = photoMap.get(vid) ?? []; ex.push(url); photoMap.set(vid, ex)
      }
    }
  }

  // Social counts (graceful — all zeros if tables don't exist yet)
  const likeCountMap = new Map<string, number>()
  const likedByMe = new Set<string>()
  const commentCountMap = new Map<string, number>()
  const savedCafeIds = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (visitIds.length > 0) {
    try {
      const [allLikes, myLikes, allComments] = await Promise.all([
        db.from('activity_likes').select('visit_id').in('visit_id', visitIds),
        db.from('activity_likes').select('visit_id').in('visit_id', visitIds).eq('user_id', user.id),
        db.from('activity_comments').select('visit_id').in('visit_id', visitIds),
      ])
      if (!allLikes.error) for (const r of allLikes.data ?? []) likeCountMap.set(r.visit_id, (likeCountMap.get(r.visit_id) ?? 0) + 1)
      if (!myLikes.error) for (const r of myLikes.data ?? []) likedByMe.add(r.visit_id)
      if (!allComments.error) for (const r of allComments.data ?? []) commentCountMap.set(r.visit_id, (commentCountMap.get(r.visit_id) ?? 0) + 1)
    } catch { /* pre-migration — continue */ }

    const cafeIds = unique(visits.map((r) => firstCafe(r)?.id ?? '').filter(Boolean))
    if (cafeIds.length > 0) {
      try {
        const sv = await db.from('saved_cafes').select('cafe_id').eq('user_id', user.id).in('cafe_id', cafeIds)
        if (!sv.error) for (const r of sv.data ?? []) savedCafeIds.add(r.cafe_id)
      } catch { /* pre-migration */ }
    }
  }

  const items: FeedItem[] = visits.map((row) => {
    const cafe = firstCafe(row)
    const brandId = cafe?.primary_brand_id ?? null
    const shelfRank = brandId ? shelfRankMap.get(`${row.user_id}:${brandId}`) ?? null : null
    return {
      id: row.id, type: 'visit' as const, ts: row.created_at,
      actor: actorMap.get(row.user_id) ?? fallbackActor(row.user_id),
      payload: {
        cafeName: cafe?.name ?? null, cafeId: cafe?.id ?? null,
        note: row.note, visitedAt: row.visited_at, shelfRank,
        photoUrls: (photoMap.get(row.id) ?? []).slice(0, 4),
        likeCount: likeCountMap.get(row.id) ?? 0,
        commentCount: commentCountMap.get(row.id) ?? 0,
        isLiked: likedByMe.has(row.id),
        isSaved: savedCafeIds.has(cafe?.id ?? ''),
      },
    }
  })

  return {
    scope, currentUser,
    counts: { following: followingIds.length, city: Math.max(0, cityIds.filter((id) => id !== user.id).length) },
    items,
  }
}
