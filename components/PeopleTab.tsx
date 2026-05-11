"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Users, MapPin, Sparkles, X } from 'lucide-react'
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
  avatar_url: string | null
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

function UserCard({ user }: { user: UserHit }) {
  const initials = getInitials(user.full_name, user.username)
  const displayName = user.full_name || user.username || 'Pulse user'
  const handle = user.username ? `@${user.username}` : null
  const emoji = LEVEL_EMOJI[user.level] ?? '☕'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'var(--color-surface-offset)',
      borderRadius: 12,
    }}>
      <Link href={`/profile/${user.id}`} style={{ flexShrink: 0 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(245,197,66,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'var(--color-accent, #f5c542)',
          border: '1.5px solid rgba(245,197,66,0.2)', overflow: 'hidden',
        }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt={displayName} width={42} height={42} style={{ objectFit: 'cover' }} />
            : initials}
        </div>
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Link href={`/profile/${user.id}`} style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Link>
          <span style={{ fontSize: 12 }}>{emoji}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {handle && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{handle}</span>}
          {user.city && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--color-text-faint)' }}>
              <MapPin size={9} /> {user.city}
            </span>
          )}
        </div>
        {user.bio && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.bio}
          </p>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <FollowButton userId={user.id} initialFollowing={user.isFollowing} compact />
      </div>
    </div>
  )
}

export function PeopleTab() {
  const [mode, setMode] = useState<Mode>('suggested')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [myCity, setMyCity] = useState<string | null>(null)
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

  useEffect(() => {
    if (mode !== 'search') fetchUsers(mode, '')
  }, [mode, fetchUsers])

  useEffect(() => {
    if (mode !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setUsers([]); return }
    debounceRef.current = setTimeout(() => fetchUsers('search', query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, mode, fetchUsers])

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by name or @username"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setMode('search') }}
          style={{
            width: '100%', padding: '10px 36px 10px 36px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 11, fontSize: 14, color: 'var(--color-text)', outline: 'none',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setMode('suggested') }} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Mode pills */}
      {mode !== 'search' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([
            { key: 'suggested' as Mode, label: 'For You', icon: Sparkles },
            { key: 'city' as Mode,      label: myCity ?? 'Your City', icon: MapPin },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: mode === key ? 'var(--color-accent, #f5c542)' : 'var(--color-surface)',
                color: mode === key ? '#111' : 'var(--color-text-muted)',
                border: `1px solid ${mode === key ? 'transparent' : 'var(--color-border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map((n) => (
            <div key={n} style={{ height: 66, borderRadius: 12, background: 'var(--color-surface)', overflow: 'hidden', position: 'relative' }}>
              <div className="skeleton-shimmer" style={{ position: 'absolute', inset: 0 }} />
            </div>
          ))}
        </div>
      ) : users.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'suggested' && (
            <p style={{ fontSize: 10, color: 'var(--color-text-faint)', marginBottom: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Based on your taste
            </p>
          )}
          {mode === 'city' && myCity && (
            <p style={{ fontSize: 10, color: 'var(--color-text-faint)', marginBottom: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Rankers in {myCity}
            </p>
          )}
          {users.map((u) => <UserCard key={u.id} user={u} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0 24px', color: 'var(--color-text-muted)' }}>
          <Users size={34} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          {mode === 'search' && query.length >= 2 ? (
            <>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>No results for &ldquo;{query}&rdquo;</p>
              <p style={{ fontSize: 12 }}>Try a different name or @username.</p>
            </>
          ) : mode === 'city' ? (
            <>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>No one in your city yet</p>
              <p style={{ fontSize: 12 }}>Be the first to rank here.</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>Rank more to get matches</p>
              <p style={{ fontSize: 12, maxWidth: '24ch', margin: '0 auto' }}>We&apos;ll match you with people who love the same spots.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
