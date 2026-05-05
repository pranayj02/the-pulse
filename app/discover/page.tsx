'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'
import { LogVisitModal } from '@/components/LogVisitModal'

type CafeResult = {
  id: string | null
  osm_place_id: string | null
  name: string
  city: string | null
  address: string | null
  lat: number | null
  lng: number | null
  source?: 'db' | 'nominatim'
}

function Monogram({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white"
    >
      {initials}
    </div>
  )
}

function shortAddr(city: string | null, address: string | null) {
  if (address && city && !address.toLowerCase().includes(city.toLowerCase())) {
    return `${address}, ${city}`
  }
  return address ?? city ?? ''
}

export default function DiscoverPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CafeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState<CafeResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial cafes
  useEffect(() => {
    let mounted = true
    fetch('/api/cafes/search?q=')
      .then((r) => r.json())
      .then((d) => { if (mounted) setResults(d.cafes ?? []) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  // Debounced search
  useEffect(() => {
    if (selectedCafe) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/cafes/search?q=${encodeURIComponent(query)}`)
        const d = await res.json()
        setResults(d.cafes ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selectedCafe])

  const handleSelect = useCallback((cafe: CafeResult) => {
    setSelectedCafe(cafe)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedCafe(null)
    setQuery('')
    // Reload initial list
    fetch('/api/cafes/search?q=')
      .then((r) => r.json())
      .then((d) => setResults(d.cafes ?? []))
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const showEmpty = !searching && results.length === 0 && query.trim().length >= 2

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[var(--color-bg)] px-4 pb-24 pt-6">
        <div className="mx-auto max-w-lg">

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold text-white">Discover</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Search a café, log your visit, rank it on your shelf.
            </p>
          </div>

          {/* Search input */}
          <div className="relative mb-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 focus-within:border-[var(--color-accent)]/40 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/10 transition">
              {searching
                ? <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-text-muted)]" />
                : <Search size={16} className="shrink-0 text-[var(--color-text-muted)]" />
              }
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => { setSelectedCafe(null); setQuery(e.target.value) }}
                placeholder="Search cafés by name or area…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-text-faint)]"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setSelectedCafe(null) }}
                  className="shrink-0 rounded-full p-0.5 hover:bg-white/10 transition"
                  aria-label="Clear search"
                >
                  <X size={14} className="text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {showEmpty ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-faint)]">
              No cafés found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-surface)]">
              {results.length === 0 && !searching && (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-faint)]">
                  Start typing to search cafés…
                </div>
              )}
              {results.map((cafe, i) => {
                const key = cafe.osm_place_id ?? cafe.id ?? `r-${i}`
                const addr = shortAddr(cafe.city, cafe.address)
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(cafe)}
                    className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left transition last:border-0 hover:bg-white/[0.04] active:bg-white/[0.07]"
                  >
                    <Monogram name={cafe.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{cafe.name}</p>
                      {addr && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--color-text-faint)]">
                          <MapPin size={10} className="shrink-0" />
                          {addr}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-[var(--color-accent)] font-medium">
                      Log →
                    </span>
                  </button>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* Modal: triggered when a cafe is selected */}
      {selectedCafe && (
        <LogVisitModal
          prefillCafe={selectedCafe}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}
