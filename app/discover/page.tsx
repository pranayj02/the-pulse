'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MapPin, Navigation, Search, X, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'
import { createClient } from '@/lib/supabase'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

type CafeResult = {
  id: string | null
  osm_place_id: string | null
  name: string
  city: string | null
  address: string | null
  lat: number | null
  lng: number | null
  source: 'db' | 'nominatim'
}

type MapPlace = {
  id: string
  name: string
  lat: number
  lng: number
  city?: string | null
  address?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(city: string | null | undefined, address: string | null | undefined) {
  const neighbourhood = address?.split(',')[0]?.trim() ?? null
  return [city, neighbourhood].filter(Boolean).join(' · ') || null
}

function Monogram({ name }: { name: string }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white">
      {letters || '?'}
    </div>
  )
}

function ResultSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-white/8" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-white/8" />
            <div className="h-2.5 w-28 animate-pulse rounded bg-white/8" />
          </div>
          <div className="h-8 w-24 shrink-0 animate-pulse rounded-xl bg-white/8" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CafeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([])
  const [city, setCity] = useState('your city')
  const [loggingKey, setLoggingKey] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load map cafés + default results ────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      let userCity: string | null = null
      if (user) {
        const pr = await supabase
          .from('profiles')
          .select('city')
          .eq('id', user.id)
          .maybeSingle()
        userCity =
          (pr.data as { city: string | null } | null)?.city ?? null
      }
      if (userCity && mounted) setCity(userCity)

      let q = supabase
        .from('cafes')
        .select('id, name, lat, lng, city, address')
        .order('name')
        .limit(100)
      if (userCity) q = q.eq('city', userCity)
      const { data } = await q
      if (!mounted) return

      const places = (
        (data ?? []) as {
          id: string
          name: string
          lat: number | null
          lng: number | null
          city: string | null
          address: string | null
        }[]
      )
        .filter(
          (c): c is typeof c & { lat: number; lng: number } =>
            typeof c.lat === 'number' && typeof c.lng === 'number'
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          city: c.city,
          address: c.address,
        }))

      setMapPlaces(places)

      // Default list = first 8 DB cafés when no search query yet
      setResults((prev) =>
        prev.length > 0
          ? prev
          : places.slice(0, 8).map((p) => ({
              id: p.id,
              osm_place_id: null,
              name: p.name,
              city: p.city ?? null,
              address: p.address ?? null,
              lat: p.lat,
              lng: p.lng,
              source: 'db' as const,
            }))
      )
    }
    init()
    return () => {
      mounted = false
    }
  }, [supabase])

  // ── Debounced search ─────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    setSearching(true)
    try {
      const res = await fetch(
        `/api/cafes/search?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) return
      const data = (await res.json()) as { cafes: CafeResult[] }
      setResults(data.cafes ?? [])
    } catch {
      // silent
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      runSearch('')
      return
    }
    debounceRef.current = setTimeout(() => runSearch(query), 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  // ── Log visit + instant battle ───────────────────────────────────────────────
  const handleLogAndBattle = async (cafe: CafeResult) => {
    const key = cafe.osm_place_id ?? cafe.id ?? cafe.name
    if (loggingKey) return
    setLoggingKey(key)

    try {
      const body = cafe.id
        ? { cafeId: cafe.id, visitedAt: new Date().toISOString() }
        : {
            cafe: {
              osm_place_id: cafe.osm_place_id,
              name: cafe.name,
              city: cafe.city,
              address: cafe.address ?? cafe.city ?? cafe.name,
              lat: cafe.lat,
              lng: cafe.lng,
            },
            visitedAt: new Date().toISOString(),
          }

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        cafeId?: string
        categoryId?: string
        shelfCafes?: {
          cafeId: string
          displayName: string
          score: number
          rank: number
        }[]
      }

      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Could not log visit.')
        return
      }

      const newCafeId = data.cafeId
      const categoryId = data.categoryId
      const opponents = (data.shelfCafes ?? []).filter(
        (s) => s.cafeId !== newCafeId
      )

      if (opponents.length > 0 && newCafeId && categoryId) {
        toast.success(`Visit logged! Battling ${cafe.name} now…`)
        router.push(
          `/faceoff?a=${newCafeId}&aName=${encodeURIComponent(cafe.name)}&b=${opponents[0].cafeId}&bName=${encodeURIComponent(opponents[0].displayName)}&cat=${categoryId}`
        )
      } else if (newCafeId) {
        toast.success(
          `${cafe.name} added to your shelf! Log one more café to start battling.`
        )
      } else {
        toast.success('Visit logged!')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoggingKey(null)
    }
  }

  const clearSearch = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="discover" />

      <div className="container max-w-3xl space-y-6">
        {/* ── Search card ─────────────────────────────────────────────────── */}
        <section className="card-strong p-5 md:p-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-faint">
            Discover · Coffee
          </p>
          <h1 className="section-title mt-1 text-white">
            Find a café, battle it live
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted">
            Search any café — it's logged, added to your shelf, and immediately
            face-off against your current&nbsp;#1.
          </p>

          {/* Search input */}
          <div className="relative mt-5">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search cafés in ${city}…`}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-10 pr-10 text-sm text-white placeholder:text-faint transition focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/8"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-faint transition hover:text-white"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/8">
            {searching ? (
              <ResultSkeleton />
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">
                  {query
                    ? `No results for "${query}". Try a different name or city.`
                    : `No cafés loaded yet for ${city}.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {results.map((cafe, i) => {
                  const key = cafe.osm_place_id ?? cafe.id ?? `r-${i}`
                  const isLogging = loggingKey === key
                  const addr = shortAddr(cafe.city, cafe.address)
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.025]"
                    >
                      <Monogram name={cafe.name} />

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-white">
                          {cafe.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {addr && (
                            <span className="flex items-center gap-1 truncate text-xs text-faint">
                              <MapPin size={10} />
                              {addr}
                            </span>
                          )}
                          {cafe.source === 'nominatim' && (
                            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-faint">
                              New
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLogAndBattle(cafe)}
                        disabled={!!loggingKey}
                        aria-label={`Log visit and battle ${cafe.name}`}
                        className={[
                          'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95',
                          isLogging
                            ? 'cursor-wait bg-white/10 text-faint'
                            : 'bg-[var(--color-accent)] text-black hover:brightness-110 disabled:opacity-50',
                        ].join(' ')}
                      >
                        {isLogging ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Zap size={11} />
                        )}
                        <span>{isLogging ? 'Logging…' : 'Log + Battle'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Map card ────────────────────────────────────────────────────── */}
        <section className="card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
                City map
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                {city} cafés
              </h2>
            </div>
            <Navigation size={16} className="text-accent" />
          </div>

          <div className="relative h-[360px] overflow-hidden rounded-2xl">
            <Map places={mapPlaces} />
            <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-[#11141a]/90 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-xs font-medium text-white">
                {mapPlaces.length} cafés mapped
              </p>
              <p className="text-[10px] text-muted">
                From {city} · grows with every visit
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
