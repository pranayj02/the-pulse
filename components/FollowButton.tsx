// components/FollowButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type FollowButtonProps = {
  userId: string
  initialFollowing: boolean
  compact?: boolean
}

export function FollowButton({
  userId,
  initialFollowing,
  compact = false,
}: FollowButtonProps) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  async function toggleFollow() {
    const next = !isFollowing
    setIsFollowing(next)

    startTransition(async () => {
      try {
        const res = await fetch(
          next ? '/api/follows' : `/api/follows?followingId=${userId}`,
          {
            method: next ? 'POST' : 'DELETE',
            headers: next ? { 'Content-Type': 'application/json' } : undefined,
            body: next ? JSON.stringify({ followingId: userId }) : undefined,
          }
        )

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Could not update follow state')
        }

        router.refresh()
      } catch (error) {
        setIsFollowing(!next)
        toast.error(error instanceof Error ? error.message : 'Could not update follow state')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={isPending}
      className={
        compact
          ? `rounded-full px-3 py-1.5 text-xs transition ${
              isFollowing ? 'cta-secondary' : 'cta-primary'
            }`
          : `rounded-full px-4 py-2 text-sm transition ${
              isFollowing ? 'cta-secondary' : 'cta-primary'
            }`
      }
    >
      {isPending ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
