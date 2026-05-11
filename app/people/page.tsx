"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Users, MapPin, Sparkles, X, UserCheck } from 'lucide-react'
import { Header } from '@/components/Header'
import { FollowButton } from '@/components/FollowButton'
import Link from 'next/link'

type UserHit = {
  id: string
  username: string | null
  full_name: string | null
  city: string | null
  xp: number
  level: string
  bio: string | null
  isFollowing: boolean
}

type Mode = 'suggested' | 'city' | 'search'

const LEVEL_EMOJI: Record<string, string> = {
  sip: '☕', brew: '🫖', roast: '🔥', master_roaster: '👑', legend: '⚡',
}

function getInitials(name: string | null, username: string | null) {
  const src = name || username || '?'
  return src.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function UserCard({ user, onFollowChange }: { user: UserHit; onFollowChange: (id: string, following: boolean) => void }) {
  const initials = getInitials(user.full_name, user.username)
  const displayName = user.full_name || user.username || 'Pulse user'
  const handle = user.username ? `@${user.username}` : null
  const emoji = LEVEL_EMOJI[user.level] ?? '☕'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: 'var(--color-surface)',
      borderRadius: 14,
      border: '1px solid var(--color-border)',
    }}>
      {/* Avatar */}
      <Link href={`/profile/${user.id}`} style={{ flexShrink: 0 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: 'rgba(245,197,66,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: 'var(--color-accent, #f5c542)',
          border: '1.5px solid rgba(245,197,66,0.25)',
        }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : initials}
        </div>
      </Link>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href={`/profile/${user.id}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Link>
          <span style={{ fontSize: 13 }}>{emoji}</span>
        </div>
        {handle && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{handle}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {user.city && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-faint)' }}>
              <MapPin size={10} /> {user.city}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{user.xp} XP</span>
        </div>
        {user.bio && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '28ch' }}>
            {user.bio}
          </p>
        )}
      </div>

      {/* Follow button */}
      <div style={{ flexShrink: 0 }}>
        <FollowButton
          userId={user.id}
          initialFollowing={user.isFollowing}
          compact
        />
      </div>
    </div>
  )
}

export default function PeoplePage() {
  const [mode, setMode] = useState<Mode>('suggested')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [myCity, setMyCity] = useState<string | null>(null)
  const [followState, setFollowState] = useState<Record<string, boolean>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async (m: Mode, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mode: m })
      if (q) params.set('q', q)
      const res = await fetch(`/api/users/search?${params}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      if (data.myCity) setMyCity(data.myCity)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount and mode change
  useEffect(() => {
    if (mode !== 'search') {
      fetchUsers(mode, '')
    }
  }, [mode, fetchUsers])

  // Debounced search
  useEffect(() => {
    if (mode !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setUsers([]); return }
    debounceRef.current = setTimeout(() => fetchUsers('search', query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, mode, fetchUsers])

  function handleFollowChange(id: string, following: boolean) {
    setFollowState((prev) => ({ ...prev, [id]: following }))
  }

  const displayUsers = users.map((u) => ({
    ...u,
    isFollowing: followState[u.id] !== undefined ? followState[u.id] : u.isFollowing,
  }))

  return (
    <>
      <Header title="People" />
      <div className="screen" style={{ paddingTop: 16, paddingBottom: 100 }}>

        {/* Search bar */}
        <div style={{
          position: 'relative', marginBottom: 16,
        }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name or @username"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setMode('search') }}
            style={{
              width: '100%', padding: '11px 40px 11px 38px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 12, fontSize: 14, color: 'var(--color-text)', outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setMode('suggested') }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mode tabs — only show when not searching */}
        {mode !== 'search' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {([
              { key: 'suggested', label: 'For You', icon: Sparkles },
              { key: 'city',      label: myCity ?? 'Your City', icon: MapPin },
            ] as { key: Mode; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: mode === key ? 'var(--color-accent, #f5c542)' : 'var(--color-surface)',
                  color: mode === key ? '#111' : 'var(--color-text-muted)',
                  border: `1px solid ${mode === key ? 'transparent' : 'var(--color-border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map((n) => (
              <div key={n} style={{ height: 74, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, var(--color-surface-offset) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        ) : displayUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'suggested' && (
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 4, letterSpacing: '0.04em' }}>
                Based on your taste
              </p>
            )}
            {mode === 'city' && myCity && (
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 4, letterSpacing: '0.04em' }}>
                Rankers in {myCity}
              </p>
            )}
            {displayUsers.map((u) => (
              <UserCard key={u.id} user={u} onFollowChange={handleFollowChange} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0 32px', color: 'var(--color-text-muted)' }}>
            <Users size={38} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
            {mode === 'search' && query.length >= 2 ? (
              <>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 6 }}>No results for "{query}"</p>
                <p style={{ fontSize: 13 }}>Try a different name or username.</p>
              </>
            ) : mode === 'city' ? (
              <>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 6 }}>No one in your city yet</p>
                <p style={{ fontSize: 13, maxWidth: '26ch', margin: '0 auto' }}>Invite friends to start building your local circle.</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 6 }}>Rank more cafés to get suggestions</p>
                <p style={{ fontSize: 13, maxWidth: '26ch', margin: '0 auto' }}>We'll match you with people who love the same spots.</p>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  )
}
