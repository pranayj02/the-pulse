'use client'

import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import toast from 'react-hot-toast'

type AuthButtonProps = {
  mode?: 'signin' | 'signup'
}

export function AuthButton({ mode = 'signup' }: AuthButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)

      const supabase = createClient()

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        toast.error(error.message)
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGoogleAuth}
      disabled={loading}
      className="cta-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.2-5.8 6.8l6.1 5.2C35.2 39.8 44 33.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
      </svg>

      {loading
        ? 'Redirecting...'
        : mode === 'signin'
        ? 'Continue with Google'
        : 'Sign up with Google'}
    </button>
  )
}
