import { Download, Share2, TrendingUp } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'

const activeCategory = {
  slug: 'coffee',
  name: 'Coffee',
}

const shelfBrands: Brand[] = SEED_COFFEE_BRANDS.slice(0, 6).map((brand, index) => ({
  id: `shelf-brand-${index + 1}`,
  category_id: activeCategory.slug,
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
}))

export default function ShelfPage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container space-y-6">
        <section className="card-strong p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                My shelf · {activeCategory.name}
              </p>
              <h1 className="section-title mt-2 text-white">
                Your {activeCategory.name} shelf
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Your shelf is a live ranking for the currently selected category. As you keep making
                face-off picks, this order updates and becomes a sharper model of your taste.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="cta-secondary">
                <Share2 size={16} />
                <span>Share shelf</span>
              </button>
              <button className="cta-primary">
                <Download size={16} />
                <span>Export card</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-faint">
              Shelf stats · {activeCategory.name}
            </p>

            <div className="mt-4 grid gap-3">
              {[
                { label: 'Items ranked', value: '9' },
                { label: 'Average shelf score', value: '1488' },
                { label: 'Top movement', value: 'Araku Coffee ↑2' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" />
                <p className="font-semibold text-white">Taste signal</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                In this category, your taste currently leans toward premium, identity-led brands
                with stronger recall and distinct positioning.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {shelfBrands.map((brand, index) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                rank={index + 1}
                score={1565 - index * 27}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
