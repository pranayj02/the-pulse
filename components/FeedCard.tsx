'use client'

import { useState, useRef, useCallback } from 'react'
import type { FeedItem, FeedComment } from '@/lib/feed'

type Props = {
  item: FeedItem
  isOwn: boolean
  currentUserId: string
}

function displayName(item: FeedItem) {
  return item.actor.full_name || item.actor.username || 'Someone'
}

function fmtTimestamp(v: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v))
}

function fmtDate(v?: string | null) {
  if (!v) return null
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(v))
}

function timeAgo(v: string) {
  const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Icons ───────────────────────────────────────────────────────────────────
function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconComment() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' }) {
  const cls = size === 'sm'
    ? 'h-7 w-7 text-xs rounded-full'
    : 'h-11 w-11 text-sm rounded-2xl'
  return (
    <div className={`${cls} shrink-0 flex items-center justify-center overflow-hidden bg-white/10 font-semibold text-white`}>
      {url
        ? <img src={url} alt={name} className="h-full w-full object-cover" />
        : <span>{name.slice(0, 1).toUpperCase()}</span>
      }
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export function FeedCard({ item, isOwn, currentUserId }: Props) {
  const name = displayName(item)
  const photos = item.payload.photoUrls ?? []
  const visitDate = fmtDate(item.payload.visitedAt)

  // Social state
  const [liked, setLiked] = useState(item.payload.isLiked)
  const [likeCount, setLikeCount] = useState(item.payload.likeCount)
  const [likeLoading, setLikeLoading] = useState(false)

  const [saved, setSaved] = useState(item.payload.isSaved)
  const [saveLoading, setSaveLoading] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [commentCount, setCommentCount] = useState(item.payload.commentCount)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [copyToast, setCopyToast] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const loadComments = useCallback(async () => {
    if (commentsLoaded) return
    try {
      const res = await fetch(`/api/comments?visitId=${item.id}`)
      if (!res.ok) return
      const data = await res.json() as { comments: FeedComment[] }
      setComments(data.comments ?? [])
    } catch { /* silent */ } finally {
      setCommentsLoaded(true)
    }
  }, [commentsLoaded, item.id])

  const handleToggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next && !commentsLoaded) loadComments()
    if (next) setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    const prev = { liked, likeCount }
    setLiked(!liked)
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1)
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: item.id }),
      })
      if (res.ok) {
        const d = await res.json() as { liked: boolean; count: number }
        setLiked(d.liked); setLikeCount(d.count)
      } else { setLiked(prev.liked); setLikeCount(prev.likeCount) }
    } catch { setLiked(prev.liked); setLikeCount(prev.likeCount) }
    finally { setLikeLoading(false) }
  }

  const handleSave = async () => {
    if (saveLoading || !item.payload.cafeId) return
    setSaveLoading(true)
    const prev = saved
    setSaved(!saved)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId: item.payload.cafeId, visitId: item.id }),
      })
      if (res.ok) { const d = await res.json() as { saved: boolean }; setSaved(d.saved) }
      else setSaved(prev)
    } catch { setSaved(prev) }
    finally { setSaveLoading(false) }
  }

  const handleShare = async () => {
    const text = `${name} visited ${item.payload.cafeName ?? 'a café'} on Chun`
    try {
      if (navigator.share) { await navigator.share({ title: 'Chun', text }) }
      else {
        await navigator.clipboard.writeText(text)
        setCopyToast(true)
        setTimeout(() => setCopyToast(false), 2000)
      }
    } catch { /* dismissed */ }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: item.id, body: commentBody.trim() }),
      })
      if (res.ok) {
        const d = await res.json() as { comment: FeedComment }
        setComments((prev) => [...prev, d.comment])
        setCommentCount((n) => n + 1)
        setCommentBody('')
      }
    } catch { /* silent */ }
    finally { setCommentSubmitting(false) }
  }

  const handleDeleteComment = async (cid: string) => {
    try {
      await fetch(`/api/comments?id=${cid}`, { method: 'DELETE' })
      setComments((prev) => prev.filter((c) => c.id !== cid))
      setCommentCount((n) => Math.max(0, n - 1))
    } catch { /* silent */ }
  }

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-white/[0.035]">

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Avatar name={name} url={item.actor.avatar_url} />

          <div className="min-w-0 flex-1">
            {/* Name + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{isOwn ? 'You' : name}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px] text-[10px] uppercase tracking-[0.14em] text-faint">
                Visit
              </span>
              {item.payload.shelfRank != null && (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-[3px] text-[10px] font-semibold tracking-wide text-emerald-300">
                  #{item.payload.shelfRank} on {isOwn ? 'your' : 'their'} shelf
                </span>
              )}
            </div>

            {/* Main line */}
            <p className="mt-1.5 text-base font-semibold text-white">
              Visited {item.payload.cafeName ?? 'a café'}
            </p>

            {/* Meta */}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-faint">
              <span>{fmtTimestamp(item.ts)}</span>
              {visitDate && <span>· went {visitDate}</span>}
              {item.actor.city && <span>· {item.actor.city}</span>}
            </div>

            {/* Note */}
            {item.payload.note && (
              <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm italic leading-6 text-muted">
                &ldquo;{item.payload.note}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className={`mt-4 grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {photos.map((url, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img src={url} alt={`${item.payload.cafeName ?? 'Visit'} photo ${i + 1}`}
                  className="h-48 w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-t border-white/8 px-3 py-2.5">

        {/* Like */}
        <button onClick={handleLike} disabled={likeLoading} aria-label={liked ? 'Unlike' : 'Like'}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition active:scale-95
            ${liked ? 'bg-rose-500/15 text-rose-400' : 'text-faint hover:bg-white/8 hover:text-white'}`}>
          <IconHeart filled={liked} />
          {likeCount > 0 && <span className="tabular-nums text-xs">{likeCount}</span>}
        </button>

        {/* Comment */}
        <button onClick={handleToggleComments} aria-label="Comments"
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition active:scale-95
            ${showComments ? 'bg-white/10 text-white' : 'text-faint hover:bg-white/8 hover:text-white'}`}>
          <IconComment />
          {commentCount > 0 && <span className="tabular-nums text-xs">{commentCount}</span>}
        </button>

        {/* Save */}
        {item.payload.cafeId && (
          <button onClick={handleSave} disabled={saveLoading} aria-label={saved ? 'Unsave' : 'Save café'}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition active:scale-95
              ${saved ? 'text-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10' : 'text-faint hover:bg-white/8 hover:text-white'}`}>
            <IconBookmark filled={saved} />
            {saved && <span className="text-xs">Saved</span>}
          </button>
        )}

        {/* Share */}
        <div className="relative ml-auto">
          <button onClick={handleShare} aria-label="Share"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-faint transition hover:bg-white/8 hover:text-white active:scale-95">
            <IconShare />
          </button>
          {copyToast && (
            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-[var(--color-surface)] px-2.5 py-1 text-xs text-white shadow-lg">
              Copied!
            </span>
          )}
        </div>
      </div>

      {/* ── Comments drawer ──────────────────────────────────────────────── */}
      {showComments && (
        <div className="border-t border-white/8 px-5 pb-5 pt-4 space-y-4">

          {/* Comment list */}
          {!commentsLoaded ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="flex gap-2.5">
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/8" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-2.5 w-20 animate-pulse rounded bg-white/8" />
                    <div className="h-2.5 w-44 animate-pulse rounded bg-white/8" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-faint">No comments yet — be the first.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const cName = c.full_name || c.username || 'Someone'
                const isOwnComment = c.user_id === currentUserId
                return (
                  <div key={c.id} className="group flex items-start gap-2.5">
                    <Avatar name={cName} url={c.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white">{cName}</span>
                        <span className="text-[10px] text-faint">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-0.5 text-sm leading-5 text-muted">{c.body}</p>
                    </div>
                    {isOwnComment && (
                      <button onClick={() => handleDeleteComment(c.id)} aria-label="Delete comment"
                        className="shrink-0 rounded-lg p-1 text-faint opacity-0 transition hover:text-[var(--color-danger)] group-hover:opacity-100">
                        <IconX />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-faint
                focus:border-[color:var(--color-accent)]/50 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/12 transition"
            />
            <button type="submit" disabled={!commentBody.trim() || commentSubmitting}
              className="shrink-0 rounded-xl bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black transition
                disabled:opacity-40 hover:brightness-110 active:scale-95">
              {commentSubmitting ? '…' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
