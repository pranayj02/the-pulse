import { Compass, MapPin, Navigation, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'

const activeCategory = {
  slug: 'coffee',
  name: 'Coffee',
}

const discoverBrands: Brand[] = SEED_COFFEE_BRANDS.slice(6, 10).map((brand, index) => ({
  id: `discover-brand-${index + 1}`,
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

const cafePins = [
  { name: 'Bandra West', top: '22%', left: '28%' },
  { name: 'Lower Parel', top: '38%', left: '46%' },
  { name: 'Powai', top: '20%', left: '68%' },
  { name: 'Fort', top: '62%', left: '35%' },
]

export default function DiscoverPage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="discover" />

      <div className="container space-y-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="card-strong p-6 md:p-8">
            <div className="pill mb-4">
              <Compass size={14} />
              <span>Discovery · {activeCategory.name}</span>
            </div>

            <h1 className="section-title text-white">
              Find what your {activeCategory.name.toLowerCase()} shelf suggests next
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Discovery combines brand similarity, social proof, and map activity to surface the
              next item or place worth trying inside your active category.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Recommended next</p>
                <p className="mt-2 text-lg font-semibold text-white">Corridor Seven</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Why this fits</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  People who rank Blue Tokai highly also rank it highly
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">City map</p>
                <h2 className="heading-md mt-2 text-white">
                  Mumbai discovery layer
                </h2>
              </div>
              <Navigation className="text-accent" size={18} />
            </div>

            <div className="map-grid">
              {cafePins.map((pin) => (
                <div
                  key={pin.name}
                  className="map-pin"
                  style={{ top: pin.top, left: pin.left }}
                  title={pin.name}
                />
              ))}

              <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-[#11141a]/90 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Live map layer</p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-muted">
                  This placeholder becomes your real discovery map once we connect places data and
                  category-aware venue filters.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                Recommended for you
              </p>
              <h2 className="heading-md mt-2 text-white">
                Based on your {activeCategory.name.toLowerCase()} shelf
              </h2>
            </div>
            <Sparkles size={18} className="text-accent" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {discoverBrands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} compact />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Hot zone', value: 'Bandra West' },
            { label: 'Most saved café', value: 'Subko' },
            { label: 'Weekend discovery trend', value: 'Single origin pour-overs' },
          ].map((item) => (
            <div key={item.label} className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-accent" />
                <p className="text-sm text-muted">{item.label}</p>
              </div>
              <p className="text-lg font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
