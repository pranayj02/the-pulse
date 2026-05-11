'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, Sparkles, Users, TrendingUp, RefreshCw, Coffee, UserSearch } from 'lucide-react'
import { Header } from '@/components/Header'
import Link from 'next/link'

type Rec = {
  cafeId: string
  name: string
  city: string | null
  address: string | null
  avgScore: number
  matchCount: number | null
  reason: string
  alreadyVisited?: boolean
}

type DiscoverResult = {
  tab: string
  recs: Rec[]
  hasTasteData: boolean
  city?: string | null
  empty?: string
}

const TABS = [
  { key: 'for-you',  label: 'For You',  icon: Sparkles },
  { key: 'friends',  label: 'Friends',  icon: Users },
  { key: 'city',     label: 'City',     icon: TrendingUp },
  { key: 'people',   label: 'People',   icon: UserSearch },
] as const

type TabKey = 'for-you' | 'friends' | 'city' | 'people'

function scoreToDisplay(score: number): string {
  const val = Math.max(1, Math.min(10, ((score - 800) / 800) * 9 + 1))
  return val.toFixed(1)
}

function EmptyState({ tab, empty }: { tab: TabKey; empty?: string }) {
  if (empty) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0 32px', color: 'var(--color-text-muted)' }}>
        <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>No friend activity yet</p>
        <p style={{ fontSize: 13, maxWidth: '26ch', margin: '0 auto 20px' }}>{empty}</p>
        <Link href="/people" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, background: 'var(--color-accent)', color: '#111315', fontSize: 14, fontWeight: 600 }}>
          Find people to follow
        </Link>
      </div>
    )
  }

  if (tab === 'for-you') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0 32px', color: 'var(--color-text-muted)' }}>
        <Coffee size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>No recommendations yet</p>
        <p style={{ fontSize: 13, maxWidth: '28ch', margin: '0 auto 20px' }}>
          Rank more cafés in face-offs to unlock taste-matched suggestions.
        </p>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, background: 'var(--color-accent)', color: '#111315', fontSize: 14, fontWeight: 600 }}>
          Go to Feed
        </Link>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
      <TrendingUp size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Nothing here yet</p>
      <p style={{ fontSize: 13 }}>Be the first to rank cafés in your city.</p>
    </div>
  )
}

export default function DiscoverPage() {
  const [tab, setTab] = useState<TabKey>('for-you')
  const [data, setData] = useState<Record<TabKey, DiscoverResult | null>>({ 'for-you': null, friends: null, city: null, people: null })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (t: TabKey) => {
    if (data[t] !== null) return // already loaded
    setLoading(true)
    try {
      const res = await fetch(`/api/discover?tab=${t}`)
      const json = await res.json()
      setData((prev) => ({ ...prev, [t]: json }))
    } catch {
      setData((prev) => ({ ...prev, [t]: { tab: t, recs: [], hasTasteData: false } }))
    } finally { setLoading(false) }
  }, [data])

  useEffect(() => { load(tab) }, [tab]) // eslint-disable-line

  const refresh = useCallback(() => {
    setData((prev) => ({ ...prev, [tab]: null }))
    setTimeout(() => load(tab), 50)
  }, [tab, load])

  const current = data[tab]
  const recs = current?.recs ?? []

  return (
    <>
      <Header
        title="Discover"
        action={
          <button
            onClick={refresh}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', transition: 'all 0.15s' }}
            aria-label="Refresh"
          >
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        }
      />

      <div className="screen" style={{ paddingTop: 16 }}>

        {/* Tabs */}
        <div className="pill-tabs mb-5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pill-tab${tab === key ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Taste intelligence banner (For You only) */}
        {tab === 'for-you' && current && !loading && (
          <div style={{
            marginBottom: 16, padding: '12px 14px', borderRadius: 12,
            background: current.hasTasteData
              ? 'rgba(245,197,66,0.08)'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${current.hasTasteData ? 'rgba(245,197,66,0.2)' : 'var(--color-border)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Sparkles size={16} style={{ flexShrink: 0, color: current.hasTasteData ? 'var(--color-accent)' : 'var(--color-text-faint)' }} />
            <p style={{ fontSize: 13, color: current.hasTasteData ? 'var(--color-text)' : 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {current.hasTasteData
                ? 'Based on your ELO rankings and people with similar taste'
                : 'Rank more cafés to unlock personalised suggestions'}
            </p>
          </div>
        )}

        {/* City header */}
        {tab === 'city' && current?.city && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{current.city}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginLeft: 2 }}>· community rankings</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none' }}>
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '35%' }} />
                </div>
                <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 999 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && recs.length === 0 && (
          <EmptyState tab={tab} empty={current?.empty} />
        )}

        {/* Recommendation list */}
        {!loading && recs.length > 0 && (
          <div className="card">
            {recs.map((rec, i) => {
              const score = scoreToDisplay(rec.avgScore)
              return (
                <div key={rec.cafeId} className="list-item" style={{ opacity: rec.alreadyVisited ? 0.55 : 1 }}>
                  <div className="list-item-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p className="list-item-name">{rec.name}</p>
                      {rec.alreadyVisited && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: 'var(--color-text-faint)', flexShrink: 0 }}>
                          Visited
                        </span>
                      )}
                    </div>
                    {(rec.city || rec.address) && (
                      <p className="list-item-meta" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={9} style={{ flexShrink: 0 }} />
                        {rec.address && !rec.address.toLowerCase().includes(rec.city?.toLowerCase() ?? '~~~')
                          ? `${rec.address}${rec.city ? `, ${rec.city}` : ''}`
                          : rec.city}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 3, fontWeight: 500 }}>
                      {rec.reason}
                    </p>
                  </div>
                  <div className="score-badge score-badge-gold">{score}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Attribution note */}
        {!loading && recs.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 16 }}>
            Scores are ELO-based · Updated after every face-off
          </p>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
