// lib/feed.ts
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
  type: 'visit' | 'comparison' | 'badge'
  ts: string
  actor: Actor
  payload: {
    cafeName?: string | null
    note?: string | null
    badgeSlug?: string | null
    brandAName?: string | null
    brandBName?: string | null
    winnerName?: string | null
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

type QueryError = {
  message: string
}

type QueryResult<T> = {
  data: T
  error: QueryError | null
}

type FollowingRow = {
  following_id: string
}

type CityRow = {
  id: string
}

type VisitRow = {
  id: string
  user_id: string
  note: string | null
  visited_at: string
  cafes: { name: string | null } | { name: string | null }[] | null
}

type ComparisonRow = {
  id: string
  user_id: string
  created_at: string
  brand_a_id: string
  brand_b_id: string
  winner_id: string
}

type BadgeRow = {
  id: string
  user_id: string
  badge_slug: string | null
  earned_at: string
}

type BrandRow = {
  id: string
  name: string
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

  if (followingRes.error) {
    throw new Error(followingRes.error.message)
  }

  const followingIds = unique((followingRes.data ?? []).map((row) => row.following_id))

  let cityIds: string[] = []

  if (currentUser.city) {
    const cityRes = (await supabase
      .from('profiles')
      .select('id')
      .eq('city', currentUser.city)
      .limit(50)) as unknown as QueryResult<CityRow[] | null>

    if (cityRes.error) {
      throw new Error(cityRes.error.message)
    }

    cityIds = unique((cityRes.data ?? []).map((row) => row.id))
  }

  const actorIds =
    scope === 'following'
      ? followingIds
      : scope === 'city'
        ? cityIds
        : unique([...followingIds, ...cityIds, user.id])

  const scopedActorIds = actorIds.length > 0 ? actorIds : [user.id]

  const [visitsRaw, comparisonsRaw, badgesRaw, actorsRaw] = await Promise.all([
    supabase
      .from('cafe_visits')
      .select('id, user_id, note, visited_at, cafes(name)')
      .in('user_id', scopedActorIds)
      .order('visited_at', { ascending: false })
      .limit(40),

    supabase
      .from('comparisons')
      .select('id, user_id, created_at, brand_a_id, brand_b_id, winner_id')
      .in('user_id', scopedActorIds)
      .order('created_at', { ascending: false })
      .limit(40),

    supabase
      .from('user_badges')
      .select('id, user_id, badge_slug, earned_at')
      .in('user_id', scopedActorIds)
      .order('earned_at', { ascending: false })
      .limit(40),

    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, city, level, xp')
      .in('id', unique([...scopedActorIds, user.id])),
  ])

  const visitsRes = visitsRaw as unknown as QueryResult<VisitRow[] | null>
  const comparisonsRes = comparisonsRaw as unknown as QueryResult<ComparisonRow[] | null>
  const badgesRes = badgesRaw as unknown as QueryResult<BadgeRow[] | null>
  const actorsRes = actorsRaw as unknown as QueryResult<Actor[] | null>

  if (visitsRes.error) throw new Error(visitsRes.error.message)
  if (comparisonsRes.error) throw new Error(comparisonsRes.error.message)
  if (badgesRes.error) throw new Error(badgesRes.error.message)
  if (actorsRes.error) throw new Error(actorsRes.error.message)

  const actorMap = new Map<string, Actor>()
  for (const actor of actorsRes.data ?? []) {
    actorMap.set(actor.id, actor)
  }
  actorMap.set(currentUser.id, currentUser)

  const comparisonBrandIds = unique(
    (comparisonsRes.data ?? []).flatMap((row) => [
      row.brand_a_id,
      row.brand_b_id,
      row.winner_id,
    ])
  )

  const brandMap = new Map<string, string>()
  if (comparisonBrandIds.length > 0) {
    const brandsRes = (await supabase
      .from('brands')
      .select('id, name')
      .in('id', comparisonBrandIds)) as unknown as QueryResult<BrandRow[] | null>

    if (brandsRes.error) throw new Error(brandsRes.error.message)

    for (const brand of brandsRes.data ?? []) {
      brandMap.set(brand.id, brand.name)
    }
  }

  const visitItems: FeedItem[] = (visitsRes.data ?? []).map((row) => ({
    id: row.id,
    type: 'visit',
    ts: row.visited_at,
    actor: actorMap.get(row.user_id) ?? fallbackActor(row.user_id),
    payload: {
      cafeName:
        row.cafes && !Array.isArray(row.cafes) ? row.cafes.name : 'Unknown café',
      note: row.note,
    },
  }))

  const comparisonItems: FeedItem[] = (comparisonsRes.data ?? []).map((row) => ({
    id: row.id,
    type: 'comparison',
    ts: row.created_at,
    actor: actorMap.get(row.user_id) ?? fallbackActor(row.user_id),
    payload: {
      brandAName: brandMap.get(row.brand_a_id) ?? 'Brand A',
      brandBName: brandMap.get(row.brand_b_id) ?? 'Brand B',
      winnerName: brandMap.get(row.winner_id) ?? 'Winner',
    },
  }))

  const badgeItems: FeedItem[] = (badgesRes.data ?? []).map((row) => ({
    id: row.id,
    type: 'badge',
    ts: row.earned_at,
    actor: actorMap.get(row.user_id) ?? fallbackActor(row.user_id),
    payload: {
      badgeSlug: row.badge_slug,
    },
  }))

  const items = [...visitItems, ...comparisonItems, ...badgeItems]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 50)

  return {
    scope,
    currentUser,
    counts: {
      following: followingIds.length,
      city: cityIds.filter((id) => id !== user.id).length,
    },
    items,
  }
}
