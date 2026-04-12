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
  CheckCircle2,
  AlertCircle,
  Trophy,
  SkipForward,
} from 'lucide-react'
import toast from 'react-hot-toast'

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

type ShelfBrand = {
  brandId: string
  score: number
  brandName: string
}

type Phase = 'form' | 'faceoff' | 'done'

export function LogVisitModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCafeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState<SearchCafeResult | null>(null)
  const [note, setNote] = useState('')
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  // ── Face-off carousel state ────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form')
  const [seededBrandId, setSeededBrandId] = useState<string | null>(null)
  const [seededBrandName, setSeededBrandName] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [faceoffQueue, setFaceoffQueue] = useState<ShelfBrand[]>([])
  const [faceoffIndex, setFaceoffIndex] = useState(0)
  const [faceoffLoading, setFaceoffLoading] = useState(false)
  const [finalRank, setFinalRank] = useState<number | null>(null)

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Keyboard close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Initial café list ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function loadInitialResults() {
      try {
        const res = await fetch('/api/cafes/search?q=')
        if (!res.ok) throw new Error('Could not load cafes')
        const data = await res.json()
        if (!mounted) return
        setResults(data.cafes ?? [])
      } catch (error) {
        console.error('Failed to load visit modal data:', error)
        if (mounted) setResults([])
      }
    }

    loadInitialResults()
    return () => { mounted = false }
  }, [])

  // ── Search debounce ────────────────────────────────────────────────────────
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

  // ── Submit visit ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedCafe) {
      toast.error('Please select a café.')
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
          note,
          visitedAt,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not log visit.')
      }

      // If the café matched a brand and we have shelf brands to compare against,
      // 
