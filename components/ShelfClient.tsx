'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { List, Map, GripVertical, Check, RotateCcw } from 'lucide-react'

const ShelfMap = dynamic(() => import('./ShelfMap').then((m) => m.ShelfMap), { ssr: false })

export type ShelfItem = {
  id: string
  name: string
  meta: string | null
  rank: number
  score: number
  comparisons_count: number
  lat: number | null
  lng: number | null
}

function rankToScore(rank: number, total: number): string {
  if (total === 1) return '10.0'
  const val = 10 - ((rank - 1) / (total - 1)) * 9
  return val.toFixed(1)
}

function rankColor(rank: number): string {
  if (rank === 1) return '#f5c542'
  if (rank === 2) return '#cbd5e1'
  if (rank === 3) return '#cd7c3c'
  return 'var(--color-text-faint)'
}

export function ShelfClient({
  initialItems,
  categoryId,
}: {
  initialItems: ShelfItem[]
  categoryId: string
}) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [items, setItems] = useState(initialItems)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)

  // Drag state
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  // Touch drag state
  const touchStartY = useRef<number>(0)
  const touchItemIdx = useRef<number | null>(null)
  const touchOverIdx = useRef<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx
  }

  const handleDragEnter = (idx: number) => {
    dragOverIdx.current = idx
    if (dragIdx.current === null || dragIdx.current === idx) return
    const newItems = [...items]
    const [moved] = newItems.splice(dragIdx.current, 1)
    newItems.splice(idx, 0, moved)
    dragIdx.current = idx
    setItems(newItems.map((item, i) => ({ ...item, rank: i + 1 })))
    setDirty(true)
  }

  const handleDragEnd = () => {
    dragIdx.current = null
    dragOverIdx.current = null
  }

  // Touch drag
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    touchStartY.current = e.touches[0].clientY
    touchItemIdx.current = idx
  }

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const y = e.touches[0].clientY
    const el = document.elementFromPoint(e.touches[0].clientX, y)
    const row = el?.closest('[data-drag-idx]')
    if (!row) return
    const overIdx = parseInt((row as HTMLElement).dataset.dragIdx ?? '-1')
    if (overIdx === -1 || overIdx === touchItemIdx.current) return
    touchOverIdx.current = overIdx
    const fromIdx = touchItemIdx.current!
    if (fromIdx === overIdx) return
    const newItems = [...items]
    const [moved] = newItems.splice(fromIdx, 1)
    newItems.splice(overIdx, 0, moved)
    touchItemIdx.current = overIdx
    setItems(newItems.map((item, i) => ({ ...item, rank: i + 1 })))
    setDirty(true)
  }, [items])

  const handleTouchEnd = () => {
    touchItemIdx.current = null
    touchOverIdx.current = null
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/shelf/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: items.map((item) => item.id),
          categoryId,
        }),
      })
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // silent fail — UI still shows the new order
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setItems(initialItems)
    setDirty(false)
  }

  const total = items.length

  const mapPins = items
    .filter((item) => item.lat && item.lng)
    .map((item) => ({
      id: item.id,
      name: item.name,
      lat: item.lat!,
      lng: item.lng!,
      rank: item.rank,
      score: rankToScore(item.rank, total),
    }))

  return (
    <>
      {/* View toggle + save bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="pill-tabs" style={{ marginBottom: 0 }}>
          <button
            className={`pill-tab${view === 'list' ? ' active' : ''}`}
            onClick={() => setView('list')}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <List size={13} /> List
          </button>
          <button
            className={`pill-tab${view === 'map' ? ' active' : ''}`}
            onClick={() => setView('map')}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Map size={13} /> Map
          </button>
        </div>

        {dirty && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--color-accent)', color: '#111315', opacity: saving ? 0.7 : 1 }}
            >
              {saved ? <><Check size={12} /> Saved</> : saving ? 'Saving…' : 'Save order'}
            </button>
          </div>
        )}
      </div>

      {/* Reorder hint */}
      {view === 'list' && items.length > 1 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 10 }}>
          Drag <GripVertical size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> to reorder · ELO updates on save
        </p>
      )}

      {/* MAP VIEW */}
      {view === 'map' && (
        <div style={{ marginBottom: 16 }}>
          {mapPins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
              No location data for your cafés yet
            </div>
          ) : (
            <ShelfMap pins={mapPins} />
          )}
          {mapPins.length < total && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                {total - mapPins.length} café{total - mapPins.length > 1 ? 's' : ''} missing coordinates
              </p>
              <button
                onClick={async () => {
                  setBackfilling(true)
                  setBackfillMsg(null)
                  try {
                    const res = await fetch('/api/admin/geocode-backfill', { method: 'POST' })
                    const data = await res.json()
                    setBackfillMsg(`Fixed ${data.fixed} of ${data.total} cafés. Refresh to see updates.`)
                  } catch {
                    setBackfillMsg('Failed — try again')
                  } finally {
                    setBackfilling(false)
                  }
                }}
                disabled={backfilling}
                style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'rgba(245,197,66,0.12)', color: 'var(--color-accent)', border: '1px solid rgba(245,197,66,0.2)', whiteSpace: 'nowrap', opacity: backfilling ? 0.6 : 1 }}
              >
                {backfilling ? 'Fixing…' : 'Fix missing locations'}
              </button>
            </div>
          )}
          {backfillMsg && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'center' }}>{backfillMsg}</p>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="card">
          {items.map((item, idx) => {
            const score = rankToScore(item.rank, total)
            return (
              <div
                key={item.id}
                data-drag-idx={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onTouchStart={(e) => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="list-item"
                style={{ cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
              >
                {/* Drag handle */}
                <GripVertical
                  size={16}
                  style={{ color: 'var(--color-text-faint)', flexShrink: 0, marginRight: -4 }}
                />
                {/* Rank */}
                <span className="rank-num" style={{ color: rankColor(item.rank), minWidth: 20 }}>
                  {item.rank}
                </span>
                {/* Body */}
                <div className="list-item-body">
                  <p className="list-item-name">{item.name}</p>
                  {item.meta && <p className="list-item-meta">{item.meta}</p>}
                  <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                    {item.comparisons_count} match{item.comparisons_count !== 1 ? 'es' : ''}
                  </p>
                </div>
                {/* Score */}
                <div className="score-badge score-badge-gold">{score}</div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
