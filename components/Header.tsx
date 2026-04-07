'use client'

import Link from 'next/link'
import { Bell, Compass, Home, Trophy, User2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type HeaderProps = {
  active?: 'home' | 'discover' | 'leaderboard' | 'profile'
}

const navItems = [
  { key: 'home', label: 'Home', href: '/', icon: Home },
  { key: 'discover', label: 'Discover', href: '/discover', icon: Compass },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { key: 'profile', label: 'Profile', href: '/profile', icon: User2 },
] as const

export function Header({ active = 'home' }: HeaderProps) {
  return (
    <>
      <header className="container mb-6">
        <div className="card flex items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black">
              <span className="font-display text-lg font-semibold">P</span>
            </div>
            <div>
              <p className="font-display text-xl leading-none text-white">The Pulse</p>
              <p className="text-sm text-muted">Taste, ranked.</p>
            </div>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <div className="pill">
              <span>Category</span>
              <strong className="text-white">Coffee</strong>
            </div>

            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                PJ
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">Pranay</p>
                <p className="text-xs text-muted">Level: Brew</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-20px)] max-w-md -translate-x-1/2 md:hidden">
        <div className="card-strong grid grid-cols-4 px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.key

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition',
                  isActive
                    ? 'bg-accent text-black'
                    : 'text-muted hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
