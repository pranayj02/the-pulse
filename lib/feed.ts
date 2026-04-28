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
    note?: string | null
    visitedAt?: string | null
    shelfRank?: number | null
    photoUrls?: string[]
  }
}

export type FeedResult = {
  scope: FeedScope
  currentUser: Actor
  counts: {
    following: number
    city: number
  }
  items: FeedItem[]
}

type QueryError = { message: string }
type QueryResult<T> = { data: T; error: QueryError | null }

type FollowingRow = { following_id: string }
type CityRow = { id: string }

type VisitRow = {
  id: string
  user_id: string
  note: string | null
  visited_at: string
  created_at: string
  cafes:
    | { name: string | null; primary_brand_id: string | null }
    | { name: string | null; primary_brand_id: string | null }[]
    | null
}

type ShelfRankRow = {
  user_id: string
  brand_id: string
  rank: number
}

type VisitPhotoRow = {
  visit_id?: string | null
  storage_path?: string | null
  public_url?: string | null
  photo_url?: string | null
  url?: string | null
  image_url?: string | null
  created_at?: string | null
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function fallbackActor(id: string): Actor {
  return {
    id,
    username: null,
    full_name: null,
    avatar_url: null,
    city: null,
    level: 'Sip',
    xp: 0,
  }
}

function firstCafe(row: VisitRow) {
  return row.cafes && !Array.isArray(row.cafes) ? row.cafes : null
}

export async function getFeed(scope: FeedScope = 'for-you'): Promise<FeedResult | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const currentProfileRes = (await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, city, level, xp')
    .eq('id', user.id)
    .single()) as unknown as QueryResult<Actor | null>

  if (currentProfileRes.error || !currentProfileRes.data) {
    throw new Error(currentProfileRes.error?.message ?? 'Could not load profile')
  }

  const currentUser = currentProfileRes.data

  const followingRes = (await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)) as unknown as QueryResult<FollowingRow[] | null>

  if (followingRes.error) throw new Error(followingRes.error.message)

  const followingIds = unique((followingRes.data ?? []).map((row) => row.following_id))

  let cityIds: string[] = []
  if (currentUser.city) {
    const cityRes = (await supabase
      .from('profiles')
      .select('id')
      .eq('city', currentUser.city)
      .limit(50)) as unknown as QueryResult<CityRow[] | null>

    if (cityRes.error) throw new Error(cityRes.error.message)
    cityIds = unique((cityRes.data ?? []).map((row) => row.id))
  }

  const actorIds =
    scope === 'following'
      ? followingIds
      : scope === 'city'
        ? cityIds
        : unique([...followingIds, ...cityIds, user.id])

  const scopedActorIds = actorIds.length > 0 ? actorIds : [user.id]

  const [visitsRaw, actorsRaw] = await Promise.all([
    supabase
      .from('cafe_visits')
      .select('id, user_id, note, visited_at, created_at, cafes(name, primary_brand_id)')
      .in('user_id', scopedActorIds)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, city, level, xp')
      .in('id', unique([...scopedActorIds, user.id])),
  ])

  const visitsRes = visitsRaw as unknown as QueryResult<VisitRow[] | null>
  const actorsRes = actorsRaw as unknown as QueryResult<Actor[] | null>

  if (visitsRes.error) throw new Error(visitsRes.error.message)
  if (actorsRes.error) throw new Error(actorsRes.error.message)

  const actorMap = new Map<string, Actor>()
  for (const actor of actorsRes.data ?? []) actorMap.set(actor.id, actor)
  actorMap.set(currentUser.id, currentUser)

  const visits = visitsRes.data ?? []

  const shelfPairs = visits
    .map((row) => {
      const cafe = firstCafe(row)
      const brandId = cafe?.primary_brand_id
      return brandId ? { user_id: row.user_id, brand_id: brandId } : null
    })
    .filter((value): value is { user_id: string; brand_id: string } => Boolean(value))

  const shelfUserIds = unique(shelfPairs.map((row) => row.user_id))
  const shelfBrandIds = unique(shelfPairs.map((row) => row.brand_id))

  const shelfRankMap = new Map<string, number>()
  if (shelfUserIds.length > 0 && shelfBrandIds.length > 0) {
    const shelfRaw = await supabase
      .from('shelf_items')
      .select('user_id, brand_id, rank')
      .in('user_id', shelfUserIds)
      .in('brand_id', shelfBrandIds)

    const shelfRes = shelfRaw as unknown as QueryResult<ShelfRankRow[] | null>
    if (shelfRes.error) throw new Error(shelfRes.error.message)

    for (const row of shelfRes.data ?? []) {
      shelfRankMap.set(`${row.user_id}:${row.brand_id}`, row.rank)
    }
  }

  const photoMap = new Map<string, string[]>()
  const visitIds = visits.map((row) => row.id)
  if (visitIds.length > 0) {
    const photosRaw = await supabase.from('visit_photos').select('*').in('visit_id', visitIds)
    const photosRes = photosRaw as unknown as QueryResult<VisitPhotoRow[] | null>

    if (!photosRes.error) {
      for (const row of photosRes.data ?? []) {
        const visitId = row.visit_id ?? null
        if (!visitId) continue

        let url = row.public_url ?? row.photo_url ?? row.url ?? row.image_url ?? null
        if (!url && row.storage_path) {
          const publicUrl = supabase.storage.from('visit-photos').getPublicUrl(row.storage_path).data.publicUrl
          url = publicUrl || null
        }
        if (!url) continue

        const existing = photoMap.get(visitId) ?? []
        existing.push(url)
        photoMap.set(visitId, existing)
      }
    }
  }

  const items: FeedItem[] = visits.map((row) => {
    const cafe = firstCafe(row)
    const brandId = cafe?.primary_brand_id ?? null
    const shelfRank = brandId ? shelfRankMap.get(`${row.user_id}:${brandId}`) ?? null : null

    return {
      id: row.id,
      type: 'visit',
      ts: row.created_at,
      actor: actorMap.get(row.user_id) ?? fallbackActor(row.user_id),
      payload: {
        cafeName: cafe?.name ?? null,
        note: row.note,
        visitedAt: row.visited_at,
        shelfRank,
        photoUrls: (photoMap.get(row.id) ?? []).slice(0, 4),
      },
    }
  })

  return {
    scope,
    currentUser,
    counts: {
      following: followingIds.length,
      city: Math.max(0, cityIds.filter((id) => id !== user.id).length),
    },
    items,
  }
}
