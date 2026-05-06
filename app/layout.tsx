import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { BottomNav } from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Chun',
  description: 'Choose your taste. Build your shelf.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content" className="page-shell">
          {children}
        </main>
        <BottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--color-toast-bg)',
              color: 'var(--color-toast-text)',
              border: '1px solid var(--color-toast-border)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
