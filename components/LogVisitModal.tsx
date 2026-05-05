'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  Loader2,
  CalendarDays,
  CheckCircle2,
  Trophy,
  SkipForward,
  Camera,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { initBS, advanceBS, getCurrentOpponent } from '@/lib/faceoff-queue'
import type { BSState, ShelfCafe } from '@/lib/faceoff-queue'

type SearchCafeResult = {
  id?: string | null
  osm_place_id?: string | null
  name: string
  city: string | null
  address: string | null
  lat?: number | null
  lng?: number | null
  primary_brand_id?: string | null
  brand_match_status?: 'matched' | 'pending' | 'unmatched' | null
}

type Phase = 'form' | 'faceoff' | 'done'

type Props = {
  onClose: () => void
  prefillCafe?: SearchCafeResult | null
}

function Monogram({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
      {initials}
    </div>
  )
}

export function LogVisitModal({ onClose, prefillCafe }: Props) {
  const router = useRouter()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCafeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState<SearchCafeResult | null>(prefillCafe ?? null)
  const [note, setNote] = useState('')
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().slice(0, 10))
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // ── Faceoff state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form')
  const [seededCafeId, setSeededCafeId] = useState<string | null>(null)
  const [seededDisplayName, setSeededDisplayName] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [bsState, setBsState] = useState<BSState | null>(null)
  const [faceoffLoading, setFaceoffLoading] = useState(false)
  const [finalRank, setFinalRank] = useState<number | null>(null)

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Keyboard close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Initial café list (only when no prefill) ───────────────────────────────
  useEffect(() => {
    if (prefillCafe) return
    let mounted = true
    fetch('/api/cafes/search?q=')
      .then((r) => r.json())
      .then((d) => { if (mounted) setResults(d.cafes ?? []) })
      .catch(() => {})
    return () => { mounted = false }
  }, [prefillCafe])

  // ── Search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (prefillCafe || selectedCafe) return
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
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
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [query, selectedCafe, prefillCafe])

  // ── Image picker ───────────────────────────────────────────────────────────
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3)
    setImageFiles(files)
    const previews = files.map((f) => URL.createObjectURL(f))
    setImagePreviews(previews)
  }

  // ── Submit visit ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedCafe) { toast.error('Please select a café.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId: selectedCafe.id ?? null,
          cafe: selectedCafe.id ? undefined : {
            osm_place_id: selectedCafe.osm_place_id ?? null,
            name: selectedCafe.name,
            city: selectedCafe.city,
            address: selectedCafe.address ?? selectedCafe.city ?? selectedCafe.name,
            lat: selectedCafe.lat ?? null,
            lng: selectedCafe.lng ?? null,
          },
          note: note.trim() || null,
          visitedAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not log visit.')

      // Cap shelf to 7 items max → guarantees ≤ 3 ELO rounds (ceil(log2(8)) = 3)
      const shelfCafes: ShelfCafe[] = Array.isArray(data.shelfCafes)
        ? (data.shelfCafes as ShelfCafe[])
            .filter((c) => c.cafeId && c.displayName)
            
        : []

      if (data.cafeId && data.categoryId && shelfCafes.length > 0) {
        const bs = initBS(shelfCafes)
        setSeededCafeId(data.cafeId)
        setSeededDisplayName(data.cafeDisplayName ?? selectedCafe.name)
        setCategoryId(data.categoryId)
        setBsState(bs)
        if (bs.done) {
          setFinalRank(1)
          setPhase('done')
        } else {
          setPhase('faceoff')
          toast.success('Visit logged! Quick ranking…')
        }
      } else {
        toast.success(`${selectedCafe.name} logged!`)
        onClose()
        router.push('/')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log visit.')
    } finally {
      setSaving(false)
    }
  }

  // ── Faceoff pick ───────────────────────────────────────────────────────────
  async function handlePick(newCafeWon: boolean) {
    if (!seededCafeId || !categoryId || !bsState || faceoffLoading) return
    const opponent = getCurrentOpponent(bsState)
    if (!opponent) return

    setFaceoffLoading(true)
    try {
      const winnerId = newCafeWon ? seededCafeId : opponent.cafeId
      const res = await fetch('/api/faceoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          cafeAId: seededCafeId,
          cafeBId: opponent.cafeId,
          winnerCafeId: winnerId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save face-off.')

      const nextBS = advanceBS(bsState, newCafeWon)
      setBsState(nextBS)

      if (nextBS.done) {
        setFinalRank(nextBS.insertionRank)
        setPhase('done')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save face-off.')
    } finally {
      setFaceoffLoading(false)
    }
  }

  function handleDone() {
    onClose()
    router.push('/')
  }

  const currentOpponent = bsState ? getCurrentOpponent(bsState) : null
  const maxSteps = bsState?.maxSteps ?? 1
  const currentStep = bsState?.step ?? 1
  const progressPct = maxSteps > 0 ? Math.min(((currentStep - 1) / maxSteps) * 100, 100) : 0
  const showSearch = !prefillCafe && !selectedCafe

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1c1b19] sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* ── PHASE: FORM ──────────────────────────────────────────────────── */}
        {phase === 'form' && (
          <div className="p-6 sm:p-7">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Log a visit</h2>
                {selectedCafe && (
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)] truncate max-w-xs">
                    {selectedCafe.name}
                    {selectedCafe.city ? ` · ${selectedCafe.city}` : ''}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="shrink-0 rounded-full p-2 hover:bg-white/10 transition" aria-label="Close">
                <X size={16} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Search (only if no prefill) */}
            {showSearch && (
              <div className="mb-4">
                <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-text-faint)]">
                  Search café
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {searching
                    ? <Loader2 size={15} className="shrink-0 animate-spin text-[var(--color-text-muted)]" />
                    : <Search size={15} className="shrink-0 text-[var(--color-text-muted)]" />
                  }
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search cafés by name or area…"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-text-faint)]"
                  />
                </div>
                {results.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
                    {results.map((cafe, i) => (
                      <button
                        key={cafe.id ?? cafe.osm_place_id ?? `${cafe.name}-${i}`}
                        onClick={() => { setSelectedCafe(cafe); setQuery(cafe.name) }}
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.05]"
                      >
                        <Monogram name={cafe.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{cafe.name}</p>
                          {cafe.city && (
                            <p className="truncate text-xs text-[var(--color-text-faint)]">{cafe.city}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fields (shown once cafe is selected) */}
            {selectedCafe && (
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--color-text-faint)]">
                    <CalendarDays size={11} /> Date visited
                  </label>
                  <input
                    type="date"
                    value={visitedAt}
                    onChange={(e) => setVisitedAt(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-accent)]/40 focus:ring-2 focus:ring-[var(--color-accent)]/10 transition"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--color-text-faint)]">
                    Notes <span className="normal-case text-[var(--color-text-faint)]/50">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you try? How was the vibe?"
                    rows={2}
                    maxLength={280}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)]/40 focus:ring-2 focus:ring-[var(--color-accent)]/10 transition"
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--color-text-faint)]">
                    Photos <span className="normal-case text-[var(--color-text-faint)]/50">(up to 3)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:bg-white/10"
                    >
                      <Camera size={15} />
                      {imageFiles.length > 0 ? `${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''} selected` : 'Add photos'}
                    </button>
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="mt-1 w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-[#111315] transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> Logging…</>
                    : 'Log visit & rank it →'
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PHASE: FACEOFF ───────────────────────────────────────────────── */}
        {phase === 'faceoff' && currentOpponent && (
          <div className="p-6 sm:p-7">
            {/* Progress */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-[var(--color-text-faint)]">
                  Quick ranking · {currentStep} of {maxSteps}
                </p>
                <button
                  onClick={() => { setPhase('done'); setFinalRank(null) }}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-faint)] transition hover:text-[var(--color-text-muted)]"
                >
                  <SkipForward size={12} /> Skip
                </button>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <p className="mb-5 text-center text-sm text-[var(--color-text-muted)]">
              Which do you prefer?
            </p>

            {/* Battle cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* New cafe */}
              <button
                onClick={() => handlePick(true)}
                disabled={faceoffLoading}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 text-lg font-bold text-[var(--color-accent)]">
                  {(seededDisplayName ?? '?')[0].toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {seededDisplayName}
                </p>
                <span className="text-xs text-[var(--color-text-faint)]">New visit</span>
              </button>

              {/* Opponent */}
              <button
                onClick={() => handlePick(false)}
                disabled={faceoffLoading}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white">
                  {currentOpponent.displayName[0].toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {currentOpponent.displayName}
                </p>
                <span className="text-xs text-[var(--color-text-faint)]">#{currentOpponent.rank} on shelf</span>
              </button>
            </div>

            {faceoffLoading && (
              <div className="mt-4 flex justify-center">
                <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>
        )}

        {/* ── PHASE: DONE ──────────────────────────────────────────────────── */}
        {phase === 'done' && (
          <div className="p-6 sm:p-7 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/15">
                {finalRank !== null
                  ? <Trophy size={28} className="text-[var(--color-accent)]" />
                  : <CheckCircle2 size={28} className="text-[var(--color-success)]" />
                }
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white">
              {finalRank !== null
                ? finalRank === 1
                  ? '🏆 New #1 on your shelf!'
                  : `Ranked #${finalRank} on your shelf`
                : 'Visit logged!'
              }
            </h3>
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
              {seededDisplayName ?? selectedCafe?.name ?? 'This café'} has been added to your shelf.
            </p>
            <button
              onClick={handleDone}
              className="mt-6 w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-[#111315] transition hover:opacity-90"
            >
              Go home →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
