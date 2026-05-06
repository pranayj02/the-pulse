'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeftRight, Flame, RotateCcw, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'

// ─── Types ────────────────────────────────────────────────────────────────────

type ShelfItem = {
  id: string
  cafeId: string | null
  brandId: string | null
  displayName: string
  score: number
  rank: number
  comparisons_count: number
}

type Pair = [ShelfItem, ShelfItem]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** The ID we pass to /api/faceoff — prefer cafeId, fall back to brandId */
function getFaceoffId(item: ShelfItem) {
  return item.cafeId ?? item.brandId ?? item.id
}

function getCardOpacity(item: ShelfItem, pickedId: string | null) {
  if (!pickedId) return 'opacity-100 scale-100'
  return getFaceoffId(item) === pickedId
    ? 'opacity-100 scale-[1.02]'
    : 'opacity-30 scale-[0.97]'
}

/** Build pairs from shelf items, injecting the instant pair first if provided */
function buildPairs(
  items: ShelfItem[],
  instantA?: ShelfItem,
  instantB?: ShelfItem
): Pair[] {
  const pairs: Pair[] = []
  if (instantA && instantB) pairs.push([instantA, instantB])

  const usedIds = new Set(
    [instantA, instantB]
      .filter(Boolean)
      .map((it) => getFaceoffId(it!))
  )
  const rest = items.filter((it) => !usedIds.has(getFaceoffId(it)))

  for (let i = 0; i + 1 < rest.length && pairs.length < 8; i += 2) {
    pairs.push([rest[i], rest[i + 1]])
  }
  return pairs
}

// ─── Faceoff card ─────────────────────────────────────────────────────────────

function Monogram({ name }: { name: string }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold text-white">
      {letters || '?'}
    </div>
  )
}

function FaceoffCard({
  item,
  isWinner,
}: {
  item: ShelfItem
  isWinner: boolean
}) {
  // displayName is either "Name · City" or just "Name"
  const [primary, secondary] = item.displayName.includes(' · ')
    ? item.displayName.split(' · ', 2)
    : [item.displayName, null]

  return (
    <div
      className={[
        'h-full rounded-[20px] p-5 md:p-6 transition-all duration-500 brand-gradient card',
        isWinner
          ? 'ring-2 ring-[var(--color-accent)] bg-[rgba(var(--color-accent-rgb),0.07)] shadow-[var(--shadow-winner)]'
          : '',
      ].join(' ')}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Monogram name={primary} />
          <div>
            <h3 className="text-lg font-semibold text-white md:text-xl">
              {primary}
            </h3>
            {secondary && (
              <p className="text-sm text-muted">{secondary}</p>
            )}
          </div>
        </div>
        {isWinner && (
          <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
            Winner
          </span>
        )}
      </div>

      <p className="mb-4 text-sm leading-6 text-muted">
        {item.comparisons_count > 0
          ? `${item.comparisons_count} face-off${item.comparisons_count === 1 ? '' : 's'} · ${item.score} ELO`
          : 'New to your shelf · first face-off'}
      </p>

      <div className="flex flex-wrap gap-2">
        <div className="pill text-xs">
          <span>Rank #{item.rank}</span>
        </div>
        <div className="pill text-xs">
          <Flame size={11} className="text-[var(--color-accent)]" />
          <span>{item.score} pts</span>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="card-strong animate-pulse p-6 md:p-8">
      <div className="mb-6 space-y-3">
        <div className="h-5 w-24 rounded-lg bg-white/8" />
        <div className="h-8 w-72 rounded-lg bg-white/8" />
        <div className="h-4 w-full max-w-md rounded bg-white/8" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="h-52 rounded-2xl bg-white/8" />
        <div className="hidden h-14 w-14 self-center rounded-full bg-white/8 lg:block" />
        <div className="h-52 rounded-2xl bg-white/8" />
      </div>
    </div>
  )
}

// ─── Session complete ─────────────────────────────────────────────────────────

function SessionComplete({
  picksToday,
  shelfSize,
  onReset,
}: {
  picksToday: number
  shelfSize: number
  onReset: () => void
}) {
  return (
    <div className="card-strong p-8 text-center">
      <p className="text-5xl">🏆</p>
      <h1 className="heading-md mt-4 text-white">Session complete</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        You made {picksToday} pick{picksToday === 1 ? '' : 's'}. Your shelf ranking has been updated.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Picks', value: `${picksToday}` },
          { label: 'XP earned', value: `+${picksToday * 2}` },
          { label: 'Shelf size', value: `${shelfSize}` },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={onReset} className="cta-secondary">
          <RotateCcw size={16} />
          <span>New session</span>
        </button>
        <Link href="/shelf" className="cta-primary">
          View shelf
        </Link>
      </div>
    </div>
  )
}

// ─── Empty shelf ──────────────────────────────────────────────────────────────

function EmptyShelf() {
  return (
    <div className="card-strong p-8 text-center">
      <p className="text-4xl">☕</p>
      <h1 className="heading-md mt-4 text-white">
        Your shelf needs more cafés
      </h1>
      <p className="mt-3 max-w-md mx-auto text-sm leading-6 text-muted">
        You need at least 2 logged visits to start face-offs. Head to Discover,
        find a café, and tap{' '}
        <strong className="text-white">Log + Battle</strong>.
      </p>
      <Link href="/discover" className="cta-primary mt-6 inline-flex">
        Go to Discover
      </Link>
    </div>
  )
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function FaceoffPageInner() {
  const searchParams = useSearchParams()
  const instantA = searchParams.get('a')     // cafeId or brandId
  const instantB = searchParams.get('b')     // cafeId or brandId
  const instantAName = searchParams.get('aName') // display name fallback (avoids race)
  const instantBName = searchParams.get('bName') // display name fallback (avoids race)
  const catParam = searchParams.get('cat') ?? 'coffee'

  const [shelf, setShelf] = useState<ShelfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<Pair[]>([])
  const [pairIndex, setPairIndex] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [picksToday, setPicksToday] = useState(0)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  // Keep a ref so the setTimeout callback always sees current state
  const isLastRef = useRef(false)

  // ── Load shelf from API ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/shelf?category=${catParam}`)
        if (!res.ok) {
          toast.error('Could not load your shelf.')
          return
        }
        const data = (await res.json()) as {
          items: ShelfItem[]
          categoryId: string
        }
        if (!mounted) return

        const items = data.items ?? []
        setCategoryId(data.categoryId ?? null)
        setShelf(items)

        // Resolve instant battle items — fall back to synthetic items from URL params
        // if the shelf DB write hasn't committed yet (race condition after visit log)
        let iA: ShelfItem | undefined
        let iB: ShelfItem | undefined
        if (instantA && instantB) {
          iA = items.find(
            (it) => it.cafeId === instantA || it.brandId === instantA
          )
          iB = items.find(
            (it) => it.cafeId === instantB || it.brandId === instantB
          )
          // Synthetic fallback: construct minimal ShelfItem from URL params
          if (!iA && instantAName) {
            iA = {
              id: instantA,
              cafeId: instantA,
              brandId: null,
              displayName: instantAName,
              score: 1200,
              rank: 999,
              comparisons_count: 0,
            }
          }
          if (!iB && instantBName) {
            iB = {
              id: instantB,
              cafeId: instantB,
              brandId: null,
              displayName: instantBName,
              score: 1200,
              rank: 999,
              comparisons_count: 0,
            }
          }
        }
        setQueue(buildPairs(items, iA, iB))
      } catch {
        toast.error('Failed to load shelf.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [catParam, instantA, instantB])

  const total = queue.length
  const isLast = pairIndex >= total - 1
  isLastRef.current = isLast
  const current = queue[pairIndex] ?? null

  // ── Pick handler ─────────────────────────────────────────────────────────
  const handlePick = useCallback(
    (winner: ShelfItem, loser: ShelfItem) => {
      if (pickedId) return
      const winnerId = getFaceoffId(winner)
      setPickedId(winnerId)

      fetch('/api/faceoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: categoryId ?? catParam,
          cafeAId: getFaceoffId(winner),
          cafeBId: getFaceoffId(loser),
          winnerCafeId: getFaceoffId(winner),
        }),
      })
        .then((r) => r.json())
        .then(
          (result: {
            success?: boolean
            error?: string
            winnerRank?: number
          }) => {
            if (!result.success) toast.error(result.error ?? 'Could not save.')
            if (result.winnerRank) {
              setShelf((prev) =>
                prev.map((it) =>
                  getFaceoffId(it) === winnerId
                    ? { ...it, rank: result.winnerRank! }
                    : it
                )
              )
            }
          }
        )
        .catch(() => toast.error('Could not save face-off.'))

      setTimeout(() => {
        setPickedId(null)
        setPicksToday((prev) => prev + 1)
        if (!isLastRef.current) setPairIndex((prev) => prev + 1)
      }, 650)
    },
    [pickedId, categoryId, catParam]
  )

  const handleSkip = () => {
    if (pickedId) return
    if (!isLast) setPairIndex((prev) => prev + 1)
    else toast('No more pairs in this session.')
  }

  const reset = useCallback(() => {
    setQueue(buildPairs(shelf))
    setPairIndex(0)
    setPicksToday(0)
    setPickedId(null)
  }, [shelf])

  // ── Render states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <LoadingSkeleton />
        </div>
      </main>
    )
  }

  if (shelf.length < 2) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <EmptyShelf />
          </div>
        </div>
      </main>
    )
  }

  if (picksToday > 0 && isLast && !pickedId) {
    return (
      <main id="main-content" className="page-shell bottom-nav-space">
        <Header />
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <SessionComplete
              picksToday={picksToday}
              shelfSize={shelf.length}
              onReset={reset}
            />
          </div>
        </div>
      </main>
    )
  }

  if (!current) return null
  const [itemA, itemB] = current

  // ── Main face-off ────────────────────────────────────────────────────────
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="pill mb-4">
                <Zap size={14} />
                <span>Face-off · Coffee</span>
              </div>
              <h1 className="section-title text-white">
                Which one wins for you?
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Tap a café to pick your preference. That single decision updates
                your shelf, improves recommendations, and moves your leaderboard
                standing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="pill">
                <span>Round</span>
                <strong className="text-white">
                  {pairIndex + 1} / {total}
                </strong>
              </div>
              <div className="pill">
                <Flame
                  size={14}
                  className="text-[var(--color-accent)]"
                />
                <span>+2 XP per pick</span>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <button
              type="button"
              onClick={() => handlePick(itemA, itemB)}
              disabled={!!pickedId}
              aria-label={`Pick ${itemA.displayName}`}
              className={`group text-left transition-all duration-500 disabled:cursor-default ${getCardOpacity(itemA, pickedId)}`}
            >
              <FaceoffCard
                item={itemA}
                isWinner={pickedId === getFaceoffId(itemA)}
              />
            </button>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 ${pickedId ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'rgba(28,27,24,0.04)',
                  color: 'var(--color-text)',
                }}
              >
                <ArrowLeftRight size={18} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePick(itemB, itemA)}
              disabled={!!pickedId}
              aria-label={`Pick ${itemB.displayName}`}
              className={`group text-left transition-all duration-500 disabled:cursor-default ${getCardOpacity(itemB, pickedId)}`}
            >
              <FaceoffCard
                item={itemB}
                isWinner={pickedId === getFaceoffId(itemB)}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={!!pickedId}
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

        {/* Session stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Picks this session', value: picksToday },
            { label: 'XP earned', value: `+${picksToday * 2}` },
            { label: 'Shelf size', value: shelf.length },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-2 text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

// ─── Export — Suspense required for useSearchParams in Next 15 ────────────────

export default function FaceoffPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell bottom-nav-space">
          <Header />
          <div className="container">
            <div className="card-strong h-64 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </main>
      }
    >
      <FaceoffPageInner />
    </Suspense>
  )
}
