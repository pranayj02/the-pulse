'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { ArrowLeftRight, Flame, RotateCcw, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBrand(index: number): Brand {
  const brand = SEED_COFFEE_BRANDS[index]
  return {
    id: brand.name.toLowerCase().replace(/\s+/g, '-'),
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
  }
}

type Pair = [Brand, Brand]

function buildPool(): Pair[] {
  return [
    [toBrand(0), toBrand(1)],
    [toBrand(2), toBrand(3)],
    [toBrand(4), toBrand(5)],
    [toBrand(6), toBrand(7)],
    [toBrand(8), toBrand(9)],
    [toBrand(10), toBrand(11)],
  ]
}

// ─── Card state helpers ────────────────────────────────────────────────────────

function getCardClass(brand: Brand, pickedWinnerId: string | null): string {
  if (!pickedWinnerId) return 'opacity-100 scale-100'
  if (brand.id === pickedWinnerId) return 'opacity-100 scale-[1.02]'
  return 'opacity-30 scale-[0.97]'
}

function getCardRingClass(brand: Brand, pickedWinnerId: string | null): string {
  if (brand.id === pickedWinnerId) {
    return 'ring-2 ring-[var(--color-accent)] shadow-[var(--shadow-winner)]'
  }
  if (pickedWinnerId) return ''
  return 'group-hover:ring-2 group-hover:ring-[rgba(var(--color-accent-rgb),0.25)]'
}

function getCardBgClass(brand: Brand, pickedWinnerId: string | null): string {
  if (brand.id === pickedWinnerId) {
    return 'bg-[rgba(var(--color-accent-rgb),0.07)]'
  }
  return ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaceoffPage() {
  const pool = useMemo(() => buildPool(), [])
  const [pairIndex, setPairIndex] = useState(0)
  const [picksToday, setPicksToday] = useState(0)
  const [pickedWinnerId, setPickedWinnerId] = useState<string | null>(null)

  const total = pool.length
  const current = pool[pairIndex] ?? null
  const isLast = pairIndex >= total - 1

  const handlePick = (winner: Brand, loser: Brand) => {
    if (pickedWinnerId) return

    setPickedWinnerId(winner.id)

    fetch('/api/faceoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: winner.category_id,
        brandAId: winner.id,
        brandBId: loser.id,
        winnerId: winner.id,
      }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) {
          toast.error(result.error || 'Could not save face-off.')
        }
      })
      .catch(() => toast.error('Could not save face-off.'))

    setTimeout(() => {
      setPickedWinnerId(null)
      setPicksToday((prev) => prev + 1)
      if (!isLast) setPairIndex((prev) => prev + 1)
    }, 600)
  }

  const handleSkip = () => {
    if (pickedWinnerId) return
    if (!isLast) {
      setPairIndex((prev) => prev + 1)
    } else {
      toast('You have gone through all pairs in this session.')
    }
  }

  // ─── Session complete ──────────────────────────────────────────────────────

  if (picksToday > 0 && isLast && !pickedWinnerId) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <div className="card-strong p-8 text-center">
              <p className="text-5xl">🏆</p>
              <h1 className="heading-md mt-4" style={{ color: 'var(--color-text)' }}>
                Session complete
              </h1>
              <p className="mt-3 text-base leading-7" style={{ color: 'var(--color-text-muted)' }}>
                You made {picksToday} picks this session. Your shelf has been updated
                and your leaderboard position may have shifted.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Picks today', value: `${picksToday}` },
                  { label: 'XP earned',   value: `+${picksToday * 2}` },
                  { label: 'Category',    value: 'Coffee' },
                ].map((item) => (
                  <div key={item.label} className="card p-4">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => { setPairIndex(0); setPicksToday(0) }}
                  className="cta-secondary"
                >
                  <RotateCcw size={16} />
                  <span>Start new session</span>
                </button>
                <Link href="/shelf" className="cta-primary">
                  View updated shelf
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!current) return null

  const [brandA, brandB] = current

  // ─── Main face-off ─────────────────────────────────────────────────────────

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="pill mb-4">
                <Zap size={14} />
                <span>Face-off · Coffee</span>
              </div>
              <h1 className="section-title" style={{ color: 'var(--color-text)' }}>
                Which one wins for you?
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: 'var(--color-text-muted)' }}>
                Tap a brand to pick your preference. That single decision updates your shelf,
                improves recommendations, and moves your leaderboard standing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="pill">
                <span>Round</span>
                <strong style={{ color: 'var(--color-text)' }}>{pairIndex + 1} / {total}</strong>
              </div>
              <div className="pill">
                <Flame size={14} style={{ color: 'var(--color-accent)' }} />
                <span>+2 XP per pick</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            {/* Brand A */}
            <button
              type="button"
              onClick={() => handlePick(brandA, brandB)}
              disabled={!!pickedWinnerId}
              className={[
                'group text-left transition-all duration-500',
                'disabled:cursor-default',
                getCardClass(brandA, pickedWinnerId),
              ].join(' ')}
              aria-label={`Pick ${brandA.name}`}
            >
              <div className={[
                'h-full rounded-[20px] transition-all duration-500',
                getCardRingClass(brandA, pickedWinnerId),
                getCardBgClass(brandA, pickedWinnerId),
              ].join(' ')}>
                <BrandCard brand={brandA} />
              </div>
            </button>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <div className={[
                'flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500',
                pickedWinnerId ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
              ].join(' ')}
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'rgba(28,27,24,0.04)',
                  color: 'var(--color-text)',
                }}
              >
                <ArrowLeftRight size={18} />
              </div>
            </div>

            {/* Brand B */}
            <button
              type="button"
              onClick={() => handlePick(brandB, brandA)}
              disabled={!!pickedWinnerId}
              className={[
                'group text-left transition-all duration-500',
                'disabled:cursor-default',
                getCardClass(brandB, pickedWinnerId),
              ].join(' ')}
              aria-label={`Pick ${brandB.name}`}
            >
              <div className={[
                'h-full rounded-[20px] transition-all duration-500',
                getCardRingClass(brandB, pickedWinnerId),
                getCardBgClass(brandB, pickedWinnerId),
              ].join(' ')}>
                <BrandCard brand={brandB} />
              </div>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={!!pickedWinnerId}
              className="cta-secondary disabled:opacity-40"
            >
              <RotateCcw size={16} />
              <span>Skip this pair</span>
            </button>
            <Link href="/shelf" className="cta-primary">
              See current shelf
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
              Why this works
            </p>
            <h2 className="heading-md mt-2" style={{ color: 'var(--color-text)' }}>
              Binary choice beats star ratings
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--color-text-muted)' }}>
              Choosing between two options produces a cleaner preference signal than assigning
              abstract numbers. It also makes the experience feel more like a game.
            </p>
          </div>

          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
              Session stats
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Picks this session', value: `${picksToday}` },
                { label: 'XP earned',          value: `+${picksToday * 2}` },
                { label: 'Next badge',          value: 'Power Brewer' },
              ].map((item) => (
                <div key={item.label} className="card p-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
