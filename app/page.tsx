'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Flame, MapPin, Swords, Trophy } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { XPBadge } from '@/components/XPBadge'
import { LogVisitModal } from '@/components/LogVisitModal'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'

export default function HomePage() {
  const [showVisitModal, setShowVisitModal] = useState(false)

  const topBrands: Brand[] = SEED_COFFEE_BRANDS.slice(0, 3).map((brand, index) => ({
    id: `seed-brand-${index + 1}`,
    category_id: 'coffee',
    name: brand.name,
    slug: brand.name.toLowerCase().replace(/\s+/g, '-'),
    logo_url: null,
    tagline: brand.tagline,
    description: null,
    price_range: brand.price_range as Brand['price_range'],
    origin_city: brand.origin_city,
    origin_country: 'India',
    website_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
  }))

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="home" />

      <div className="container space-y-6">
        {/* ── Hero ── */}
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
              You're currently in the top 12% of coffee rankers in Mumbai. Complete more face-offs,
              discover more cafés, and unlock your next badge.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">47</span>
                  <span className="stat-label">Face-offs done</span>
                </div>
              </div>
              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">#18</span>
                  <span className="stat-label">Mumbai rank</span>
                </div>
              </div>
              <div className="card p-4">
                <div className="stat">
                  <span className="stat-value text-white">9</span>
                  <span className="stat-label">Brands tried</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/faceoff" className="cta-primary">
                <Swords size={18} />
                <span>Start face-off</span>
              </Link>

              {/* ── Primary recurring action ── */}
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

          <XPBadge xp={164} />
        </section>

        {/* ── Shelf + Badges ── */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Shelf snapshot</p>
                <h2 className="heading-md mt-2 text-white">Your current top 3</h2>
              </div>
              <Link href="/shelf" className="text-sm font-medium text-accent">
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {topBrands.map((brand, index) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  rank={index + 1}
                  score={1540 - index * 35}
                  compact
                />
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">Active badges</p>
                <h2 className="heading-md mt-2 text-white">Progress and status</h2>
              </div>
              <Trophy size={18} className="text-accent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: 'First Sip',    emoji: '🌱', state: 'Unlocked' },
                { name: 'Early Bird',   emoji: '☕', state: 'Unlocked' },
                { name: 'Power Brewer', emoji: '⚡', state: '53 / 100 face-offs' },
                { name: 'Explorer',     emoji: '🗺️', state: '2 / 3 cafés reviewed' },
              ].map((badge) => (
                <div key={badge.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                Complete 47 more face-offs to earn{' '}
                <span className="text-white">Power Brewer</span>.
              </p>
            </div>
          </div>
        </section>

        {/* ── City pulse ── */}
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">City pulse</p>
              <h2 className="heading-md mt-2 text-white">Trending now in Mumbai</h2>
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
              { label: 'Most compared brand',  value: 'Blue Tokai' },
              { label: 'Fastest rising shelf', value: 'Araku Coffee' },
              { label: 'Hot café zone',         value: 'Bandra West' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Log Visit Modal ── */}
      {showVisitModal && (
        <LogVisitModal onClose={() => setShowVisitModal(false)} />
      )}
    </main>
  )
}
