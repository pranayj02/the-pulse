import Link from 'next/link'
import { Award, MapPin, Share2, Sparkles, Trophy } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { XPBadge } from '@/components/XPBadge'
import { BrandCard } from '@/components/BrandCard'
import { FollowButton } from '@/components/FollowButton'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Brand } from '@/lib/types'

type ProfileRow = {
  id: string
  username: string | null
  full_name: string | null
  city: string | null
  xp: number | null
  level: string | number | null
  is_early_bird: boolean | null
  is_pioneer: boolean | null
  bio?: string | null
  avatar_url?: string | null
}

type ShelfItemRow = {
  brand_id: string
  category_id: string | null
  rank: number | null
  score: number | null
}

type UserBadgeRow = {
  badge_slug: string | null
  earned_at: string | null
}

type ShelfPreviewItem = {
  brand: Brand
  rank: number
  score: number
}

const BADGE_META: Record<
  string,
  { name: string; emoji: string; description: string }
> = {
  'first-sip': {
    name: 'First Sip',
    emoji: '🌱',
    description: 'Completed their first face-off',
  },
  'early-bird': {
    name: 'Early Bird',
    emoji: '☕',
    description: 'Joined during the first launch wave',
  },
  explorer: {
    name: 'Explorer',
    emoji: '🗺️',
    description: 'Started building their café graph',
  },
  'power-brewer': {
    name: 'Power Brewer',
    emoji: '⚡',
    description: 'Completed 100+ face-offs',
  },
  pioneer: {
    name: 'Pioneer',
    emoji: '🚀',
    description: 'One of the earliest Chun users',
  },
}

function normalizeBadgeSlug(slug: string | null | undefined) {
  return (slug ?? '').toLowerCase().replace(/_/g, '-').trim()
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === id) {
    redirect('/profile')
  }

  const [
    profileRes,
    comparisonsCountRes,
    followersCountRes,
    followingCountRes,
    cafeVisitsCountRes,
    shelfItemsRes,
    userBadgesRes,
    followStateRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, city, xp, level, is_early_bird, is_pioneer, bio, avatar_url')
      .eq('id', id)
      .maybeSingle(),

    supabase
      .from('comparisons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),

    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', id),

    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', id),

    supabase
      .from('cafe_visits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),

    supabase
      .from('shelf_items')
      .select('brand_id, category_id, rank, score')
      .eq('user_id', id)
      .order('rank', { ascending: true }),

    supabase
      .from('user_badges')
      .select('badge_slug, earned_at')
      .eq('user_id', id)
      .order('earned_at', { ascending: false }),

    user
      ? supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
  ])

  if (profileRes.error) throw new Error(profileRes.error.message)
  if (comparisonsCountRes.error) throw new Error(comparisonsCountRes.error.message)
  if (followersCountRes.error) throw new Error(followersCountRes.error.message)
  if (followingCountRes.error) throw new Error(followingCountRes.error.message)
  if (cafeVisitsCountRes.error) throw new Error(cafeVisitsCountRes.error.message)
  if (shelfItemsRes.error) throw new Error(shelfItemsRes.error.message)
  if (userBadgesRes.error) throw new Error(userBadgesRes.error.message)
  if ('error' in followStateRes && followStateRes.error) throw new Error(followStateRes.error.message)

  const profile = profileRes.data as ProfileRow | null
  if (!profile) notFound()

  const shelfItems = (shelfItemsRes.data ?? []) as ShelfItemRow[]
  const userBadgeRows = (userBadgesRes.data ?? []) as UserBadgeRow[]

  const displayName = profile.full_name || profile.username || 'Profile'
  const initials = getInitials(displayName)
  const city = profile.city ?? 'City not set'
  const xp = profile.xp ?? 0
  const level = profile.level ?? 'Sip'
  const faceOffCount = comparisonsCountRes.count ?? 0
  const followersCount = followersCountRes.count ?? 0
  const followingCount = followingCountRes.count ?? 0
  const cafeVisitsCount = cafeVisitsCountRes.count ?? 0
  const isFollowing = Boolean(followStateRes?.data)

  const categoriesActive = new Set(
    shelfItems
      .map((item) => item.category_id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
  ).size

  let cityRank: number | null = null

  if (profile.city) {
    const rankAboveRes = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('city', profile.city)
      .gt('xp', xp)

    if (rankAboveRes.error) {
      throw new Error(rankAboveRes.error.message)
    }

    cityRank = (rankAboveRes.count ?? 0) + 1
  }

  const shelfBrandIds = shelfItems
    .map((item) => item.brand_id)
    .filter((brandId): brandId is string => Boolean(brandId))

  let shelfPreview: ShelfPreviewItem[] = []

  if (shelfBrandIds.length > 0) {
    const brandsRes = await supabase.from('brands').select('*').in('id', shelfBrandIds)

    if (brandsRes.error) {
      throw new Error(brandsRes.error.message)
    }

    const brands = (brandsRes.data ?? []) as Brand[]
    const brandMap = new Map<string, Brand>()

    for (const brand of brands) {
      brandMap.set(brand.id, brand)
    }

    shelfPreview = shelfItems
      .slice(0, 5)
      .map((item) => {
        const brand = brandMap.get(item.brand_id)
        if (!brand) return null

        return {
          brand,
          rank: item.rank ?? 0,
          score: Math.round(item.score ?? 0),
        }
      })
      .filter((item): item is ShelfPreviewItem => item !== null)
  }

  const unlockedBadgeKeys = new Set<string>(
    userBadgeRows.map((badge) => normalizeBadgeSlug(badge.badge_slug)).filter(Boolean)
  )

  if (faceOffCount > 0) unlockedBadgeKeys.add('first-sip')
  if (profile.is_early_bird) unlockedBadgeKeys.add('early-bird')
  if (profile.is_pioneer) unlockedBadgeKeys.add('pioneer')
  if (cafeVisitsCount >= 3) unlockedBadgeKeys.add('explorer')
  if (faceOffCount >= 100) unlockedBadgeKeys.add('power-brewer')

  const earnedBadges = Array.from(unlockedBadgeKeys)
    .map((key) => BADGE_META[key])
    .filter(
      (
        badge
      ): badge is {
        name: string
        emoji: string
        description: string
      } => Boolean(badge)
    )

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
                {initials || 'U'}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Profile</p>
                <h1 className="section-title mt-2 text-white">{displayName}</h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="pill">
                    <MapPin size={14} />
                    <span>{city}</span>
                  </div>

                  <div className="pill">
                    <Sparkles size={14} />
                    <span>Level {level}</span>
                  </div>

                  <div className="pill">
                    <Trophy size={14} />
                    <span>{cityRank ? `Rank #${cityRank}` : 'Unranked'}</span>
                  </div>
                </div>

                {profile.bio ? (
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted">{profile.bio}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {user ? (
                <FollowButton userId={profile.id} initialFollowing={isFollowing} />
              ) : null}

              <button className="cta-secondary">
                <Share2 size={16} />
                <span>Share profile</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <XPBadge xp={xp} />

            <div className="card p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-faint">Stats</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Face-offs completed', value: String(faceOffCount) },
                  { label: 'Shelf followers', value: String(followersCount) },
                  { label: 'Following', value: String(followingCount) },
                  { label: 'Café visits logged', value: String(cafeVisitsCount) },
                  { label: 'Categories active', value: String(categoriesActive) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm text-muted">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-faint">Shelf preview</p>
                  <h2 className="heading-md mt-2 text-white">Top brands on their shelf</h2>
                </div>

                <Link href={`/profile/${profile.id}/shelf`} className="text-sm font-medium text-accent">
                  View full shelf
                </Link>
              </div>

              <div className="space-y-4">
                {shelfPreview.length > 0 ? (
                  shelfPreview.map((item, index) => (
                    <BrandCard
                      key={item.brand.id}
                      brand={item.brand}
                      rank={item.rank || index + 1}
                      score={item.score}
                      compact
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm text-muted">
                      This shelf will appear here once more rankings have been made.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Badges</p>
                <h2 className="heading-md mt-2 text-white">Identity they&apos;ve unlocked</h2>
              </div>
              <Award size={18} className="text-accent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {earnedBadges.length > 0 ? (
                earnedBadges.map((badge) => (
                  <div
                    key={badge.name}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-2xl">{badge.emoji}</span>
                      <p className="font-semibold text-white">{badge.name}</p>
                    </div>
                    <p className="text-sm leading-6 text-muted">{badge.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <p className="font-semibold text-white">No badges yet</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">
                    Their earned badges will appear here as they keep ranking and logging visits.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
