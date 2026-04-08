import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'The Pulse',
  description:
    'Rank your favourite brands, build your shelf, and discover your taste graph.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <main id="main-content">
          {children}
        </main>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#171a20',
              color: '#f3f4f6',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  )
}
