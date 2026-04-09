'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Search,
  X,
  Loader2,
  ChevronRight,
  CalendarDays,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type SearchCafeResult = {
  id?: string | null
  osm_place_id?: string | null
  name: string
  city: string | null
  address: string | null
  lat?: number | null
  lng?: number | null
}

type BrandOption = {
  id: string
  name: string
  is_active?: boolean | null
}

export function LogVisitModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCafeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState<SearchCafeResult | null>(null)

  const [brands, setBrands] = useState<BrandOption[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])

  const [note, setNote] = useState('')
  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [saving, setSaving] = useState(false)

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      try {
        setBrandsLoading(true)

        const supabase = createSupabaseBrowserClient()

        const [cafesRes, brandsRes] = await Promise.all([
          fetch('/api/cafes/search?q=').then(async (r) => {
            if (!r.ok) throw new Error('Could not load cafes')
            return r.json()
          }),
          supabase
            .from('brands')
            .select('id, name, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ])

        if (!mounted) return

        setResults(cafesRes.cafes ?? [])

        if (brandsRes.error) throw brandsRes.error
        setBrands((brandsRes.data ?? []) as BrandOption[])
      } catch (error) {
        console.error('Failed to load visit modal data:', error)
        if (mounted) {
          setResults([])
          setBrands([])
        }
      } finally {
        if (mounted) setBrandsLoading(false)
      }
    }

    loadInitialData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedCafe) return

    if (searchRef.current) clearTimeout(searchRef.current)

    searchRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await fetch(`/api/cafes/search?q=${encodeURIComponent(query)}`)

        if (!res.ok) throw new Error('Could not search cafes')

        const data = await res.json()
        setResults(data.cafes ?? [])
      } catch (error) {
        console.error('Cafe search failed:', error)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchRef.current) clearTimeout(searchRef.current)
    }
  }, [query, selectedCafe])

  function toggleBrand(brandId: string) {
    setSelectedBrandIds((current) =>
      current.includes(brandId)
        ? current.filter((id) => id !== brandId)
        : [...current, brandId]
    )
  }

  async function handleSubmit() {
    if (!selectedCafe) {
      toast.error('Please select a café.')
      return
    }

    if (selectedBrandIds.length === 0) {
      toast.error('Select at least one brand you tried.')
      return
    }

    try {
      setSaving(true)

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId: selectedCafe.id ?? null,
          cafe: {
            id: selectedCafe.id ?? null,
            osm_place_id: selectedCafe.osm_place_id ?? null,
            name: selectedCafe.name,
            city: selectedCafe.city,
            address: selectedCafe.address,
            lat: selectedCafe.lat ?? null,
            lng: selectedCafe.lng ?? null,
          },
          brandIds: selectedBrandIds,
          note,
          visitedAt: new Date(visitedAt).toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not log visit.')
      }

      toast.success(`Visit to ${selectedCafe.name} logged!`)
      onClose()

      const faceoffBrandIds: string[] = Array.isArray(data.brandIds)
        ? data.brandIds.filter(Boolean)
        : []

      if (faceoffBrandIds.length >= 2) {
        router.push(`/faceoff?brands=${faceoffBrandIds.slice(0, 2).join(',')}`)
      } else {
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log visit.')
    } finally {
      setSaving(false)
    }
  }

  const showEmptyState = !searching && results.length === 0 && query.trim().length >= 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl rounded-t-3xl bg-[#1c1b19] p-6 sm:rounded-3xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log a visit</h2>
            <p className="mt-1 text-sm text-muted">
              Pick the café, then select the brands you tried.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} className="text-muted" />
          </button>
        </div>

        {!selectedCafe ? (
          <div className="mb-5">
            <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
              Search café
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {searching ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-muted" />
              ) : (
                <Search size={16} className="shrink-0 text-muted" />
              )}

              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cafés by name or area..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-faint"
              />
            </div>

            {results.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
                {results.map((cafe, index) => (
                  <button
                    key={cafe.id ?? cafe.osm_place_id ?? `${cafe.name}-${index}`}
                    onClick={() => {
                      setSelectedCafe(cafe)
                      setQuery(cafe.name)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-white">{cafe.name}</p>
                      <p className="text-xs text-muted">
                        {[cafe.city, cafe.address].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showEmptyState && (
              <p className="mt-3 text-center text-sm text-muted">
                No cafés found yet. Try a more specific name or area.
              </p>
            )}
          </div>
        ) : (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <MapPin size={14} className="mt-0.5 text-accent" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedCafe.name}
                </p>
                <p className="text-xs text-muted">
                  {[selectedCafe.city, selectedCafe.address].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCafe(null)
                setQuery('')
                setSelectedBrandIds([])
              }}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label="Change café"
            >
              <X size={14} className="text-muted" />
            </button>
          </div>
        )}

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs uppercase tracking-widest text-faint">
              Brands tried
            </label>
            <span className="text-xs text-muted">
              {selectedBrandIds.length} selected
            </span>
          </div>

          {brandsLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading brands...</span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {brands.map((brand) => {
                const selected = selectedBrandIds.includes(brand.id)

                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-accent/40 bg-accent/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">
                      {brand.name}
                    </span>

                    {selected ? (
                      <Check size={16} className="text-accent" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-white/20" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-faint">
            <CalendarDays size={12} />
            <span>Date visited</span>
          </label>
          <input
            type="date"
            value={visitedAt}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setVisitedAt(e.target.value)}
            className="input w-full"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you try? Any standout impressions?"
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="cta-secondary flex-1">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!selectedCafe || selectedBrandIds.length === 0 || saving}
            className="cta-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>Log visit</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
