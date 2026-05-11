"use client"
import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareProfileButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/profile/${userId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Pulse profile', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User dismissed or browser blocked — silently fail
    }
  }

  return (
    <button className="cta-secondary" onClick={handleShare}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      <span>{copied ? 'Copied!' : 'Share profile'}</span>
    </button>
  )
}
