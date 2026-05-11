import Link from 'next/link'
import {
  Award,
  MapPin,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { XPBadge } from '@/components/XPBadge'
import { BrandCard } from '@/components/BrandCard'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Brand } from '@/lib/types'
import { EditProfileButton } from '@/components/EditProfileButton'
import { ShareProfileButton } from '@/components/ShareProfileButton'

type ProfileRow = {
  id: string
  username: string | null
  full_name: string | null
  city: string | null
  bio: string | null
  avatar_url: string | null
  xp: number | null
  level: string | number | null
  is_early_bird: boolean | null
  is_pioneer: boolean | null
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
    description: 'Completed your first face-off',
  },
  'early-bird': {
    name: 'Early Bird',
    emoji: '☕',
    description: 'Joined during the first launch wave',
  },
  explorer: {
    name: 'Explorer',
    emoji: '🗺️',
    description: 'Started building your café graph',
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

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <section className="card p-6">
            <p className="text-sm text-muted">
              You need to be signed in to view your profile.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const [
    profileRes,
    comparisonsCountRes,
    followsCountRes,
    cafeVisitsCountRes,
    shelfItemsRes,
    userBadgesRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, city, bio, avatar_url, xp, level, is_early_bird, is_pioneer')
      .eq('id', user.id)
      .single(),

    supabase
      .from('comparisons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', user.id),

    supabase
      .from('cafe_visits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    supabase
      .from('shelf_items')
      .select('brand_id, category_id, rank, score')
      .eq('user_id', user.id)
      .order('rank', { ascending: true }),

    supabase
      .from('user_badges')
      .select('badge_slug, earned_at')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
  ])

  if (profileRes.error) {
    throw new Error(profileRes.error.message)
  }
  if (comparisonsCountRes.error) {
    throw new Error(comparisonsCountRes.error.message)
  }
  if (followsCountRes.error) {
    throw new Error(followsCountRes.error.message)
  }
  if (cafeVisitsCountRes.error) {
    throw new Error(cafeVisitsCountRes.error.message)
  }
  if (shelfItemsRes.error) {
    throw new Error(shelfItemsRes.error.message)
  }
  if (userBadgesRes.error) {
    throw new Error(userBadgesRes.error.message)
  }

  const profile = profileRes.data as ProfileRow | null
  const shelfItems = (shelfItemsRes.data ?? []) as ShelfItemRow[]
  const userBadgeRows = (userBadgesRes.data ?? []) as UserBadgeRow[]

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    profile?.username ||
    user.email?.split('@')[0] ||
    'Your profile'

  const initials = getInitials(displayName)
  const city = profile?.city ?? 'City not set'
  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 'Sip'
  const faceOffCount = comparisonsCountRes.count ?? 0
  const followersCount = followsCountRes.count ?? 0
  const cafeVisitsCount = cafeVisitsCountRes.count ?? 0

  const categoriesActive = new Set(
    shelfItems
      .map((item) => item.category_id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
  ).size

  let cityRank: number | null = null

  if (profile?.city) {
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
    const brandsRes = await supabase
      .from('brands')
      .select('*')
      .in('id', shelfBrandIds)

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
    userBadgeRows
      .map((badge) => normalizeBadgeSlug(badge.badge_slug))
      .filter(Boolean)
  )

  if (faceOffCount > 0) unlockedBadgeKeys.add('first-sip')
  if (profile?.is_early_bird) unlockedBadgeKeys.add('early-bird')
  if (profile?.is_pioneer) unlockedBadgeKeys.add('pioneer')

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

  let nextBadgeText = 'You are live. Keep ranking to unlock more.'
  if (faceOffCount < 100) {
    const remaining = 100 - faceOffCount
    nextBadgeText = `Complete ${remaining} more face-offs to unlock Power Brewer.`
  } else if (cafeVisitsCount < 3) {
    const remaining = 3 - cafeVisitsCount
    nextBadgeText = `Log ${remaining} more café visit${remaining === 1 ? '' : 's'} to unlock Explorer.`
  }

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
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  Profile
                </p>
                <h1 className="section-title mt-2 text-white">
                  {displayName}
                </h1>

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
                    <span>{cityRank ? `Rank #${cityRank}` : 'Rank loading'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <ShareProfileButton userId={user.id} />

              <EditProfileButton
                initialName={profile?.full_name ?? null}
                initialUsername={profile?.username ?? null}
                initialCity={profile?.city ?? null}
                initialBio={(profile as ProfileRow & { bio?: string | null })?.bio ?? null}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <XPBadge xp={xp} />

            <div className="card p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                Stats
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Face-offs completed',
                    value: String(faceOffCount),
                  },
                  {
                    label: 'Shelf followers',
                    value: String(followersCount),
                  },
                  {
                    label: 'Café visits logged',
                    value: String(cafeVisitsCount),
                  },
                  {
                    label: 'Categories active',
                    value: String(categoriesActive),
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm text-muted">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-faint">
                    Shelf preview
                  </p>
                  <h2 className="heading-md mt-2 text-white">
                    Your current top brands
                  </h2>
                </div>

                <Link href="/shelf" className="text-sm font-medium text-accent">
                  View all
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
                      Your shelf will appear here once you start ranking brands.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  Badges
                </p>
                <h2 className="heading-md mt-2 text-white">
                  Identity you've unlocked
                </h2>
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
                    <p className="text-sm leading-6 text-muted">
                      {badge.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <p className="font-semibold text-white">No badges yet</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">
                    Your earned badges will appear here as soon as you start
                    ranking and logging visits.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm font-semibold text-white">
                Next badge target
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {nextBadgeText}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
