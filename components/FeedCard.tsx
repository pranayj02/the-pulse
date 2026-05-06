'use client'

import { useState, useCallback } from 'react'
import type { FeedItem, FeedComment } from '@/lib/feed'

type Props = {
  item: FeedItem
  isOwn?: boolean
  currentUserId?: string
}

function timeAgo(v: string) {
  const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function fmtDate(v?: string | null) {
  if (!v) return null
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(v))
}

function displayName(item: FeedItem) {
  return item.actor.full_name || item.actor.username || 'Someone'
}

function Monogram({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(245,197,66,0.15)',
        color: 'var(--color-accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export function FeedCard({ item }: Props) {
  const p = item.payload
  const [liked, setLiked] = useState(p.isLiked)
  const [likeCount, setLikeCount] = useState(p.likeCount)
  const [saved, setSaved] = useState(p.isSaved)
  const [commenting, setCommenting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleLike = useCallback(async () => {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      await fetch(`/api/feed/${item.id}/like`, {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    }
  }, [liked, item.id])

  const toggleSave = useCallback(async () => {
    const next = !saved
    setSaved(next)
    try {
      await fetch(`/api/feed/${item.id}/save`, {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch { setSaved(!next) }
  }, [saved, item.id])

  const submitComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/feed/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText.trim() }),
      })
      setCommentText('')
      setCommenting(false)
    } finally { setSubmitting(false) }
  }, [commentText, submitting, item.id])

  const cafeName = p.cafeName ?? 'Unknown Café'

  return (
    <div className="feed-card">
      {/* ── Card header: user + time ── */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Monogram name={displayName(item)} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
            {displayName(item)}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 1 }}>
            {timeAgo(item.ts)}
            {p.visitedAt && ` · visited ${fmtDate(p.visitedAt)}`}
          </p>
        </div>
        {p.shelfRank && (
          <div className="score-badge score-badge-gold">
            #{p.shelfRank}
          </div>
        )}
      </div>

      {/* ── Café row ── */}
      <div style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="list-item" style={{ padding: '10px 14px' }}>
          <div className="list-item-body">
            <p className="list-item-name">{cafeName}</p>
            {p.note && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo strip ── */}
      {p.photoUrls && p.photoUrls.length > 0 && (
        <div style={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
          {p.photoUrls.slice(0, 3).map((url, i) => (
            <div
              key={i}
              style={{
                flex: 1, aspectRatio: '1', background: 'var(--color-surface-2)',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={toggleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 999,
            background: liked ? 'rgba(251,113,133,0.12)' : 'transparent',
            color: liked ? '#fb7185' : 'var(--color-text-faint)',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount > 0 && likeCount}
        </button>

        <button
          onClick={() => setCommenting((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 999,
            color: 'var(--color-text-faint)',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}
          aria-label="Comment"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {p.commentCount > 0 && p.commentCount}
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={toggleSave}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 999,
            color: saved ? 'var(--color-accent)' : 'var(--color-text-faint)',
            transition: 'all 0.15s',
          }}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* ── Comment input ── */}
      {commenting && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 14px', display: 'flex', gap: 8 }}>
          <input
            autoFocus
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
            placeholder="Add a comment…"
            style={{
              flex: 1, background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 999, padding: '8px 14px',
              fontSize: 13, color: 'var(--color-text)', outline: 'none',
            }}
          />
          <button
            onClick={submitComment}
            disabled={!commentText.trim() || submitting}
            style={{
              padding: '8px 14px', borderRadius: 999,
              background: 'var(--color-accent)', color: '#111315',
              fontSize: 13, fontWeight: 600,
              opacity: !commentText.trim() || submitting ? 0.4 : 1,
            }}
          >
            Post
          </button>
        </div>
      )}
    </div>
  )
}
