'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
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

function CafeMonogram({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? '?'
  return <div className="list-item-monogram">{letter}</div>
}

function shortAddr(city: string | null, address: string | null) {
  if (address && city && !address.toLowerCase().includes(city.toLowerCase()))
    return `${address}, ${city}`
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

  useEffect(() => {
    let mounted = true
    fetch('/api/cafes/search?q=')
      .then((r) => r.json())
      .then((d) => { if (mounted) setResults(d.cafes ?? []) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (selectedCafe) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/cafes/search?q=${encodeURIComponent(query)}`)
        const d = await res.json()
        setResults(d.cafes ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selectedCafe])

  const handleSelect = useCallback((cafe: CafeResult) => setSelectedCafe(cafe), [])

  const handleModalClose = useCallback(() => {
    setSelectedCafe(null)
    setQuery('')
    fetch('/api/cafes/search?q=').then((r) => r.json()).then((d) => setResults(d.cafes ?? [])).catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  return (
    <>
      <Header title="Discover" />

      <div className="screen" style={{ paddingTop: 16 }}>

        {/* Search bar */}
        <div className="search-bar mb-4">
          {searching
            ? <Loader2 size={16} style={{ flexShrink: 0, color: 'var(--color-text-faint)', animation: 'spin 1s linear infinite' }} />
            : <Search size={16} style={{ flexShrink: 0, color: 'var(--color-text-faint)' }} />
          }
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setSelectedCafe(null); setQuery(e.target.value) }}
            placeholder="Search cafés by name or area…"
          />
          {query.length > 0 && (
            <button onClick={() => { setQuery(''); setSelectedCafe(null) }} aria-label="Clear" style={{ flexShrink: 0, display: 'flex' }}>
              <X size={14} style={{ color: 'var(--color-text-faint)' }} />
            </button>
          )}
        </div>

        {/* Results list */}
        {results.length === 0 && !searching && query.trim().length >= 2 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)', fontSize: 14 }}>
            No cafés found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className="card">
            {results.length === 0 && !searching ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 14 }}>
                Start typing to search cafés…
              </div>
            ) : (
              results.map((cafe, i) => {
                const key = cafe.osm_place_id ?? cafe.id ?? `r-${i}`
                const addr = shortAddr(cafe.city, cafe.address)
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(cafe)}
                    className="list-item w-full text-left"
                    style={{ width: '100%', display: 'flex' }}
                  >
                    <CafeMonogram name={cafe.name} />
                    <div className="list-item-body">
                      <p className="list-item-name">{cafe.name}</p>
                      {addr && (
                        <p className="list-item-meta" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} style={{ flexShrink: 0 }} />
                          {addr}
                        </p>
                      )}
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', marginLeft: 8 }}>
                      Log →
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {selectedCafe && (
        <LogVisitModal prefillCafe={selectedCafe} onClose={handleModalClose} />
      )}
    </>
  )
}
