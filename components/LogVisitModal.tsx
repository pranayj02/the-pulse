'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Search, X, Loader2, ChevronRight, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

type Cafe = {
  id: string
  name: string
  city: string | null
  address: string | null
}

export function LogVisitModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Cafe[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null)
  const [note, setNote] = useState('')
  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().slice(0, 10)   // YYYY-MM-DD for date input
  )
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Debounced cafe search
  useEffect(() => {
    if (!query.trim() && !selectedCafe) {
      setResults([])
      return
    }
    if (selectedCafe) return   // don't re-search after selection

    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/cafes/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.cafes ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query, selectedCafe])

  // Load all cafes on open
  useEffect(() => {
    fetch('/api/cafes/search?q=')
      .then((r) => r.json())
      .then((d) => setResults(d.cafes ?? []))
  }, [])

  const handleSubmit = async () => {
    if (!selectedCafe) {
      toast.error('Please select a cafe.')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId: selectedCafe.id,
          note,
          visitedAt: new Date(visitedAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`Visit to ${selectedCafe.name} logged!`)
      onClose()

      // If cafe has brands → go to faceoff to rank them
      if (data.brandIds?.length >= 2) {
        router.push('/faceoff')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log visit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1c1b19] p-6 sm:rounded-3xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log a visit</h2>
            <p className="mt-1 text-sm text-muted">Which cafe did you visit?</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Cafe search */}
        {!selectedCafe ? (
          <div className="mb-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {searching
                ? <Loader2 size={16} className="shrink-0 animate-spin text-muted" />
                : <Search size={16} className="shrink-0 text-muted" />
              }
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cafes..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-faint"
              />
            </div>

            {results.length > 0 && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
                {results.map((cafe) => (
                  <button
                    key={cafe.id}
                    onClick={() => { setSelectedCafe(cafe); setQuery(cafe.name) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <MapPin size={14} className="shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-white">{cafe.name}</p>
                      {cafe.city && (
                        <p className="text-xs text-muted">{cafe.city}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 && query.length > 1 && !searching && (
              <p className="mt-3 text-center text-sm text-muted">
                No cafes found. Ask us to add it!
              </p>
            )}
          </div>
        ) : (
          // Selected cafe chip
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-accent" />
              <div>
                <p className="text-sm font-semibold text-white">{selectedCafe.name}</p>
                {selectedCafe.city && <p className="text-xs text-muted">{selectedCafe.city}</p>}
              </div>
            </div>
            <button
              onClick={() => { setSelectedCafe(null); setQuery('') }}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label="Change cafe"
            >
              <X size={14} className="text-muted" />
            </button>
          </div>
        )}

        {/* Date */}
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

        {/* Note */}
        <div className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you try? How was it?"
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="cta-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCafe || saving}
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
