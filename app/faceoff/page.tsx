import { ArrowLeftRight, Flame, RotateCcw, Zap } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'

function toBrand(index: number): Brand {
  const brand = SEED_COFFEE_BRANDS[index]

  return {
    id: `brand-${index + 1}`,
    category_id: 'coffee',
    name: brand.name,
    slug: brand.name.toLowerCase().replace(/\s+/g, '-'),
    logo_url: null,
    tagline: brand.tagline,
    description: null,
    price_range: brand.price_range as Brand['price_range'],
    origin_city: brand.origin_city,
    origin_country: 'India',
    website_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

export default function FaceoffPage() {
  const brandA = toBrand(0)
  const brandB = toBrand(1)

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="pill mb-4">
                <Zap size={14} />
                <span>Core loop · Face-off engine</span>
              </div>

              <h1 className="section-title text-white">Which one wins for you?</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Tap one brand. That single decision updates your shelf, improves recommendations,
                and moves your leaderboard standing.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="pill">
                <span>Round</span>
                <strong className="text-white">12 / 20</strong>
              </div>
              <div className="pill">
                <Flame size={14} />
                <span>+2 XP per pick</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <button className="text-left transition hover:-translate-y-1">
              <BrandCard brand={brandA} />
            </button>

            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
                <ArrowLeftRight size={18} />
              </div>
            </div>

            <button className="text-left transition hover:-translate-y-1">
              <BrandCard brand={brandB} />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button className="cta-secondary">
              <RotateCcw size={16} />
              <span>Skip this pair</span>
            </button>

            <Link href="/shelf" className="cta-primary">
              <span>See updated shelf</span>
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">Why this works</p>
            <h2 className="heading-md mt-2 text-white">Binary choice beats star ratings</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Asking users to choose between two brands produces clearer preference signals than
              asking them to assign abstract numbers. It also makes the app feel more like a game.
            </p>
          </div>

          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">Session streak</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Today', value: '12 picks' },
                { label: 'Current streak', value: '4 days' },
                { label: 'Next badge', value: 'Power Brewer' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
