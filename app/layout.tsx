import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'The Pulse',
  description: 'Rank your favourite brands, build your shelf, and discover your taste graph.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          onFocus={(e) => {
            e.currentTarget.style.left = '16px'
            e.currentTarget.style.top = '16px'
            e.currentTarget.style.width = 'auto'
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.padding = '10px 14px'
            e.currentTarget.style.background = '#f5c542'
            e.currentTarget.style.color = '#111315'
            e.currentTarget.style.borderRadius = '999px'
            e.currentTarget.style.zIndex = '9999'
          }}
          onBlur={(e) => {
            e.currentTarget.style.left = '-9999px'
            e.currentTarget.style.width = '1px'
            e.currentTarget.style.height = '1px'
            e.currentTarget.style.padding = '0'
          }}
        >
          Skip to content
        </a>

        {children}

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
