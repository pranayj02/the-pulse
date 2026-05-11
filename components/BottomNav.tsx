'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, BookOpen, User2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { LogVisitModal } from '@/components/LogVisitModal'

const NAV = [
  { key: 'feed',     label: 'Feed',     href: '/',          icon: Home },
  { key: 'discover', label: 'Discover', href: '/discover',  icon: Compass },
  { key: 'shelf',    label: 'Shelf',    href: '/shelf',     icon: BookOpen },
  { key: 'profile',  label: 'Profile',  href: '/profile',   icon: User2 },
] as const

export function BottomNav() {
  const path = usePathname()
  const [logOpen, setLogOpen] = useState(false)

  function activeKey() {
    if (path === '/' || path === '') return 'feed'
    if (path.startsWith('/discover'))  return 'discover'
    if (path.startsWith('/shelf'))     return 'shelf'
    if (path.startsWith('/profile'))   return 'profile'
    return ''
  }

  const active = activeKey()

  // Split nav into 2 + FAB + 2
  const left  = NAV.slice(0, 2)
  const right = NAV.slice(2)

  return (
    <>
      <nav className="bottom-nav" aria-label="Main navigation">
        {/* Left 2 */}
        {left.map(({ key, label, href, icon: Icon }) => (
          <Link key={key} href={href} className={cn('bottom-nav-item', active === key && 'active')} aria-label={label}>
            <Icon size={22} strokeWidth={active === key ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        ))}

        {/* Centre FAB */}
        <div className="bottom-nav-fab">
          <button
            onClick={() => setLogOpen(true)}
            className="bottom-nav-fab-btn"
            aria-label="Log a visit"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right 2 */}
        {right.map(({ key, label, href, icon: Icon }) => (
          <Link key={key} href={href} className={cn('bottom-nav-item', active === key && 'active')} aria-label={label}>
            <Icon size={22} strokeWidth={active === key ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {logOpen && <LogVisitModal onClose={() => setLogOpen(false)} />}
    </>
  )
}
