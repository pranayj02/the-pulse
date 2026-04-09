import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // FIX: Mapping 'text' to the 'ink' variables in your CSS
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface-soft)',
        border: 'var(--color-ink)', // High contrast borders
        
        // TYPOGRAPHY FIX
        // This ensures text-text or text-muted uses the dark slate 'ink'
        text: 'var(--color-ink)', 
        muted: 'var(--color-ink-muted)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',

        // THE PULSE SPECTRUM
        electric: 'var(--color-pulse-electric)',
        hot: 'var(--color-pulse-hot)',
        cyan: 'var(--color-pulse-cyan)',
        lime: 'var(--color-pulse-lime)',
        blue: 'var(--color-pulse-blue)',
        accent: 'var(--color-pulse-hot)', // Infrared fallback
      },
      fontFamily: {
        // Updated to match your Fontshare imports
        clash: ['Clash Display', 'system-ui', 'sans-serif'],
        satoshi: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '30px',
        lg: '22px',
        md: '16px',
        card: '22px',
        pill: '999px',
      },
      boxShadow: {
        // Hard tactile shadows for the "Notion" look
        pop: '0 8px 0 0 #0f172a',
        flat: '0 4px 0 0 rgba(15, 23, 42, 0.08)',
        card: '0 8px 0 0 #0f172a',
        lift: '0 20px 40px -12px rgba(15, 23, 42, 0.12)',
      },
      animation: {
        'stripe-flow': 'stripe-flow 1.5s linear infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        'stripe-flow': {
          'from': { backgroundPosition: '0 0' },
          'to': { backgroundPosition: '48px 0' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
