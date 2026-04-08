import { Compass, MapPin, Navigation, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { SEED_COFFEE_BRANDS } from '@/lib/constants'
import type { Brand } from '@/lib/types'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
})

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

const places = [
  { id: '1', name: 'Blue Tokai – Bandra', lat: 19.0596, lng: 72.8295 },
  { id: '2', name: 'Subko – Lower Parel', lat: 18.9988, lng: 72.8258 },
  { id: '3', name: 'Third Wave – Powai', lat: 19.1176, lng: 72.906 },
  { id: '4', name: 'Kala Ghoda Café – Fort', lat: 18.9338, lng: 72.8354 },
]

export default function DiscoverPage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="discover" />

      <div className="container space-y-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          
          {/* LEFT SIDE */}
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

          {/* RIGHT SIDE (MAP) */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  City map
                </p>
                <h2 className="heading-md mt-2 text-white">
                  Mumbai discovery layer
                </h2>
              </div>
              <Navigation className="text-accent" size={18} />
            </div>

            <div className="relative h-[400px] w-full overflow-hidden rounded-2xl">
              <Map places={places} />

              <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-[#11141a]/90 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Live map layer</p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-muted">
                  Explore cafés aligned with your taste profile.
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* RECOMMENDED BRANDS */}
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

        {/* STATS */}
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
