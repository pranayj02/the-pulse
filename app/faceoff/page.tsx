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

  if (picksToday > 0 && isLast && !pickedWinnerId) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <div className="card-strong p-8 text-center">
              <p className="text-5xl">🏆</p>
              <h1 className="heading-md mt-4 text-black">Session complete</h1>
              <p className="mt-3 text-base leading-7 text-muted">
                You made {picksToday} picks this session.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Picks today', value: `${picksToday}` },
                  { label: 'XP earned', value: `+${picksToday * 2}` },
                  { label: 'Category', value: 'Coffee' },
                ].map((item) => (
                  <div key={item.label} className="card p-4">
                    <p className="text-sm text-muted">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-black">{item.value}</p>
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

  const getCardClass = (brand: Brand) => {
    if (!pickedWinnerId) return 'opacity-100 scale-100'
    if (brand.id === pickedWinnerId) return 'opacity-100 scale-[1.02]'
    return 'opacity-30 scale-[0.97]'
  }

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
              <h1 className="section-title text-black">Which one wins for you?</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Tap a brand to pick your preference.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="pill">
                <span>Round</span>
                <strong className="text-black">{pairIndex + 1} / {total}</strong>
              </div>
              <div className="pill">
                <Flame size={14} />
                <span>+2 XP per pick</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            {[brandA, brandB].map((brand, i) => {
              const isWinner = brand.id === pickedWinnerId

              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() =>
                    i === 0
                      ? handlePick(brandA, brandB)
                      : handlePick(brandB, brandA)
                  }
                  disabled={!!pickedWinnerId}
                  className={[
                    'group text-left transition-all duration-500',
                    getCardClass(brand),
                  ].join(' ')}
                >
                  <div
                    className="h-full rounded-[20px] transition-all duration-500"
                    style={
                      isWinner
                        ? {
                            boxShadow: `0 0 24px var(--color-winner-glow)`,
                            border: `2px solid var(--color-winner-ring)`,
                            background: `var(--color-winner-bg)`,
                          }
                        : undefined
                    }
                  >
                    <BrandCard brand={brand} />
                  </div>
                </button>
              )
            })}

            <div className="flex items-center justify-center">
              <div
                className={[
                  'flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-black/5 text-black transition-all duration-500',
                  pickedWinnerId ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
                ].join(' ')}
              >
                <ArrowLeftRight size={18} />
              </div>
            </div>
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
      </div>
    </main>
  )
}
