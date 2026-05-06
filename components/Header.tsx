'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'

type HeaderProps = {
  title?: string
  showBack?: boolean
  action?: React.ReactNode
}

export function Header({ title, action }: HeaderProps) {
  return (
    <header className="top-bar">
      {/* Logo / title */}
      <div className="flex-1 min-w-0">
        {title ? (
          <p className="page-title truncate">{title}</p>
        ) : (
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'var(--color-accent)' }}
            >
              <span className="font-display text-sm font-bold" style={{ color: '#111315' }}>C</span>
            </div>
            <span className="font-display text-lg font-semibold" style={{ letterSpacing: '-0.2px' }}>
              Chun
            </span>
          </Link>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {action}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full transition"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>
      </div>
    </header>
  )
}
