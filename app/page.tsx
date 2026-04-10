'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Flame, MapPin, Swords, Trophy } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { XPBadge } from '@/components/XPBadge'
import { LogVisitModal } from '@/components/LogVisitModal'
import { createClient } from '@/lib/supabase'
import type { Brand } from '@/lib/types'

type BadgeCard = {
  name: string
  emoji: string
  state: string
}

type TopBrandItem = {
  brand: Brand
  score: number
  rank: number
}

type HomeStats = {
  city: string
  xp: number
  faceOffCount: number
  cityRank: number | null
  cityUserCount: number
  brandCount: number
  cafeVisitsCount: number
  topBrands: TopBrandItem[]
  badgeCards: BadgeCard[]
  nextUnlockText: string
}

const DEFAULT_STATS: HomeStats = {
  city: 'Your city',
  xp: 0,
  faceOffCount: 0,
  cityRank: null,
  cityUserCount: 0,
  brandCount: 0,
  cafeVisitsCount: 0,
  topBrands: [],
  badgeCards: [],
  nextUnlockText: 'Keep ranking to unlock your next badge.',
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

export default function HomePage() {
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadHome() {
      try {
        setLoading(true)
        setLoadError(null)

        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          if (isMounted) setStats(DEFAULT_STATS)
          return
        }

        const [
          profileRes,
          comparisonsCountRes,
          shelfCountRes,
          topShelfRes,
          userBadgesRes,
          cafeVisitsCountRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, full_name, city, xp, level, is_early_bird, is_pioneer')
            .eq('id', user.id)
            .single(),

          supabase
            .from('comparisons')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('shelf_items')
            .select('brand_id', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('shelf_items')
            .select('brand_id, rank, score')
            .eq('user_id', user.id)
            .order('rank', { ascending: true })
            .limit(3),

          supabase
            .from('user_badges')
            .select('badge_slug, earned_at')
            .eq('user_id', user.id)
            .order('earned_at', { ascending: false }),

          supabase
            .from('cafe_visits')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ])

        if (profileRes.error) throw profileRes.error
        if (comparisonsCountRes.error) throw comparisonsCountRes.error
        if (shelfCountRes.error) throw shelfCountRes.error
        if (topShelfRes.error) throw topShelfRes.error
        if (userBadgesRes.error) throw userBadgesRes.error
        if (cafeVisitsCountRes.error) throw cafeVisitsCountRes.error

        const profile = profileRes.data
        const city = profile?.city || 'Your city'
        const xp = profile?.xp ?? 0
        const faceOffCount = comparisonsCountRes.count ?? 0
        const brandCount = shelfCountRes.count ?? 0
        const cafeVisitsCount = cafeVisitsCountRes.count ?? 0

        let cityRank: number | null = null
        let cityUserCount = 0

        if (profile?.city) {
          const [rankAboveRes, cityUsersRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('city', profile.city)
              .gt('xp', xp),

            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('city', profile.city),
          ])

          if (rankAboveRes.error) throw rankAboveRes.error
          if (cityUsersRes.error) throw cityUsersRes.error

          cityRank = (rankAboveRes.count ?? 0) + 1
          cityUserCount = cityUsersRes.count ?? 0
        }

        const topShelfRows = topShelfRes.data ?? []
        const brandIds = topShelfRows.map((row) => row.brand_id)

        let topBrands: TopBrandItem[] = []

        if (brandIds.length > 0) {
          const brandsRes = await supabase
            .from('brands')
            .select('*')
            .in('id', brandIds)

          if (brandsRes.error) throw brandsRes.error

          const brandMap = new Map<string, Brand>()
          for (const brand of brandsRes.data ?? []) {
            brandMap.set(brand.id, brand as Brand)
          }

          topBrands = topShelfRows
            .map((row) => {
              const brand = brandMap.get(row.brand_id)
              if (!brand) return null

              return {
                brand,
                score: Math.round(row.score ?? 0),
                rank: row.rank ?? 0,
              }
            })
            .filter(Boolean) as TopBrandItem[]
        }

        const unlockedBadgeKeys = new Set<string>(
          (userBadgesRes.data ?? [])
            .map((badge) => normalizeBadgeSlug(badge.badge_slug))
            .filter(Boolean)
        )

        if (faceOffCount > 0) unlockedBadgeKeys.add('first-sip')
        if (profile?.is_early_bird) unlockedBadgeKeys.add('early-bird')
        if (profile?.is_pioneer) unlockedBadgeKeys.add('pioneer')

        const unlockedBadgeCards: BadgeCard[] = Array.from(unlockedBadgeKeys)
          .map((key) => BADGE_META[key])
          .filter(Boolean)
          .slice(0, 2)
          .map((badge) => ({
            name: badge.name,
            emoji: badge.emoji,
            state: 'Unlocked',
          }))

        const progressCards: BadgeCard[] = [
          {
            name: 'Power Brewer',
            emoji: '⚡',
            state:
              faceOffCount >= 100
                ? 'Unlocked'
                : `${faceOffCount} / 100 face-offs`,
          },
          {
            name: 'Explorer',
            emoji: '🗺️',
            state:
              cafeVisitsCount >= 3
                ? 'Unlocked'
                : `${cafeVisitsCount} / 3 café visits`,
          },
        ]

        const badgeCards = [...unlockedBadgeCards, ...progressCards].slice(0, 4)

        let nextUnlockText = 'You are fully live. Keep ranking to unlock more.'
        if (faceOffCount < 100) {
          const remaining = 100 - faceOffCount
          nextUnlockText = `Complete ${remaining} more face-offs to earn Power Brewer.`
        } else if (cafeVisitsCount < 3) {
          const remaining = 3 - cafeVisitsCount
          nextUnlockText = `Log ${remaining} more café visit${remaining === 1 ? '' : 's'} to earn Explorer.`
        }

        if (isMounted) {
          setStats({
            city,
            xp,
            faceOffCount,
            cityRank,
            cityUserCount,
            brandCount,
            cafeVisitsCount,
            topBrands,
            badgeCards,
            nextUnlockText,
          })
        }
      } catch (error) {
        console.error('Failed to load home page data:', error)
        if (isMounted) {
          setLoadError('Could not load live stats right now.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadHome()

    return () => {
      isMounted = false
    }
  }, [])

  const heroRankText =
    loading || !stats.cityRank
      ? 'Your live ranking is loading.'
      : `You're currently ranked #${stats.cityRank} in ${stats.city}. Complete more face-offs, discover more cafés, and unlock your next badge.`

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="home" />

      <div className="container space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {loadError}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card-strong p-6 md:p-8">
            <div className="pill mb-4">
              <Flame size={14} />
              <span>Beta leaderboard season · April</span>
            </div>

            <h1 className="section-title max-w-3xl text-white">
              Your taste shelf is alive. Keep ranking to sharpen it.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              {heroRankText}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">
                    {loading ? '—' : stats.faceOffCount}
                  </span>
                  <span className="stat-label">Face-offs done</span>
                </div>
              </div>

              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">
                    {loading ? '—' : stats.cityRank ? `#${stats.cityRank}` : '—'}
                  </span>
                  <span className="stat-label">
                    {stats.city !== 'Your city' ? `${stats.city} rank` : 'City rank'}
                  </span>
                </div>
              </div>

              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">
                    {loading ? '—' : stats.brandCount}
                  </span>
                  <span className="stat-label">Brands tried</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/faceoff" className="cta-primary">
                <Swords size={18} />
                <span>Start face-off</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowVisitModal(true)}
                className="cta-primary"
              >
                <MapPin size={18} />
                <span>Log a visit</span>
              </button>

              <Link href="/discover" className="cta-secondary">
                <span>Discovery map</span>
              </Link>
            </div>
          </div>

          <XPBadge xp={stats.xp} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  Shelf snapshot
                </p>
                <h2 className="heading-md mt-2 text-white">
                  Your current top 3
                </h2>
              </div>

              <Link href="/shelf" className="text-sm font-medium text-accent">
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {stats.topBrands.length > 0 ? (
                stats.topBrands.map((item, index) => (
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
                    {loading
                      ? 'Loading your shelf...'
                      : 'No shelf data yet. Start a few face-offs to build it.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  Active badges
                </p>
                <h2 className="heading-md mt-2 text-white">
                  Progress and status
                </h2>
              </div>
              <Trophy size={18} className="text-accent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(stats.badgeCards.length > 0
                ? stats.badgeCards
                : [
                    {
                      name: 'No badges yet',
                      emoji: '✨',
                      state: loading
                        ? 'Loading your progress'
                        : 'Your next badge will appear here',
                    },
                  ]
              ).map((badge) => (
                <div
                  key={badge.name}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{badge.emoji}</span>
                    <p className="font-semibold text-white">{badge.name}</p>
                  </div>
                  <p className="text-sm text-muted">{badge.state}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm font-semibold text-white">Next unlock</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {loading ? 'Loading your next target...' : stats.nextUnlockText}
              </p>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                City snapshot
              </p>
              <h2 className="heading-md mt-2 text-white">
                Your {stats.city} progress
              </h2>
            </div>

            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent"
            >
              <span>See leaderboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'Current city rank',
                value: loading || !stats.cityRank ? '—' : `#${stats.cityRank}`,
              },
              {
                label: 'Rankers in your city',
                value: loading ? '—' : String(stats.cityUserCount),
              },
              {
                label: 'Café visits logged',
                value: loading ? '—' : String(stats.cafeVisitsCount),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showVisitModal && (
        <LogVisitModal onClose={() => setShowVisitModal(false)} />
      )}
    </main>
  )
}
