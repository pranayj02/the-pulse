'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Compass, MapPin, Navigation, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { BrandCard } from '@/components/BrandCard'
import { LogVisitModal } from '@/components/LogVisitModal'
import { createClient } from '@/lib/supabase'
import type { Brand } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const activeCategory = { name: 'Coffee' }

type MapPlace = {
  id: string
  name: string
  lat: number
  lng: number
  city?: string | null
  address?: string | null
}

// Takes the first segment of a potentially long address string so that OSM
// full display_names like "Chapel Road, Ranwar Village Square, H/W Ward..."
// render as just "Chapel Road" in the list.
function shortAddress(city: string | null, address: string | null): string {
  const neighbourhood = address?.split(',')[0]?.trim() ?? null
  return [city, neighbourhood].filter(Boolean).join(' · ')
}

export default function DiscoverPage() {
  const supabase = useMemo(() => createClient(), [])
  const [showVisitModal, setShowVisitModal] = useState(false)

  const [city, setCity] = useState('Your city')
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [discoverBrands, setDiscoverBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadDiscover() {
      try {
        setLoading(true)
        setLoadError(null)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        let userCity: string | null = null

        if (user?.id) {
          const profileRes = await supabase
            .from('profiles')
            .select('city')
            .eq('id', user.id)
            .maybeSingle()

          if (profileRes.error) throw profileRes.error

          const profileData = profileRes.data as { city: string | null } | null
          userCity = profileData ? profileData.city : null
        }

        let cafesQuery = supabase
          .from('cafes')
          .select('id, name, lat, lng, city, address')
          .order('name', { ascending: true })
          .limit(100)

        if (userCity) {
          cafesQuery = cafesQuery.eq('city', userCity)
        }

        const [cafesRes, brandsRes] = await Promise.all([
          cafesQuery,
          supabase
            .from('brands')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true })
            .limit(4),
        ])

        if (cafesRes.error) throw cafesRes.error
        if (brandsRes.error) throw brandsRes.error
        if (!mounted) return

        type CafeRow = {
          id: string
          name: string
          lat: number | null
          lng: number | null
          city: string | null
          address: string | null
        }

        const cafeRows = (cafesRes.data ?? []) as CafeRow[]

        const mappedPlaces: MapPlace[] = cafeRows
          .filter(
            (cafe): cafe is CafeRow & { lat: number; lng: number } =>
              typeof cafe.lat === 'number' &&
              Number.isFinite(cafe.lat) &&
              typeof cafe.lng === 'number' &&
              Number.isFinite(cafe.lng)
          )
          .map((cafe) => ({
            id: cafe.id,
            name: cafe.name,
            lat: cafe.lat,
            lng: cafe.lng,
            city: cafe.city ?? null,
            address: cafe.address ?? null,
          }))

        setPlaces(mappedPlaces)
        setCity(userCity || mappedPlaces[0]?.city || 'Your city')
        setDiscoverBrands((brandsRes.data ?? []) as Brand[])
      } catch (error) {
        console.error('Failed to load discover page data:', error)
        if (mounted) {
          setLoadError('Could not load live discovery data right now.')
          setPlaces([])
          setDiscoverBrands([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDiscover()

    return () => {
      mounted = false
    }
  }, [supabase])

  const nearbyPlaces = places.slice(0, 8)

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header active="discover" />

      <div className="container space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {loadError}
          </div>
        )}

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
              Discovery becomes more useful once your city graph is live. Use the
              map to find cafés, log visits, and push more real-world taste data
              back into Chun.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">City coverage</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {loading ? 'Loading…' : `${places.length} cafés in ${city}`}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">Map status</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {loading
                    ? 'Syncing live data'
                    : places.length > 0
                      ? 'Live from database'
                      : 'No cafés loaded yet'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-faint">
                Nearby cafés
              </p>

              <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-muted">
                    Loading cafés...
                  </div>
                ) : nearbyPlaces.length > 0 ? (
                  nearbyPlaces.map((place) => (
                    <div
                      key={place.id}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
                    >
                      <MapPin size={14} className="shrink-0 text-accent" />

                      {/* min-w-0 + overflow-hidden on this wrapper is what
                          allows truncate to work on the children */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-white">
                          {place.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {shortAddress(place.city, place.address)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowVisitModal(true)}
                        className="pill shrink-0 text-xs transition hover:border-accent/40 hover:text-white"
                      >
                        Log visit
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-muted">
                    No cafés found for this city yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-faint">
                  City map
                </p>
                <h2 className="heading-md mt-2 text-white">
                  {city} discovery layer
                </h2>
              </div>
              <Navigation className="text-accent" size={18} />
            </div>

            <div className="relative h-[400px] w-full overflow-hidden rounded-2xl">
              <Map places={places} />

              <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-[#11141a]/90 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Live map layer</p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-muted">
                  {loading
                    ? 'Loading city cafés...'
                    : places.length > 0
                      ? `Showing ${places.length} cafés currently available in ${city}.`
                      : 'No cafés available on the map yet.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVisitModal(true)}
              className="cta-primary mt-4 w-full"
            >
              <MapPin size={16} />
              <span>Log a visit</span>
            </button>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-faint">
                Recommended for you
              </p>
              <h2 className="heading-md mt-2 text-white">
                Coffee brands to explore
              </h2>
            </div>
            <Sparkles size={18} className="text-accent" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {discoverBrands.length > 0 ? (
              discoverBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} compact />
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                <p className="text-sm text-muted">
                  {loading
                    ? 'Loading brand suggestions...'
                    : 'No active brands available right now.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Cafés on map',
              value: loading ? '—' : String(places.length),
            },
            {
              label: 'Brands in rotation',
              value: loading ? '—' : String(discoverBrands.length),
            },
            {
              label: 'City scope',
              value: loading ? '—' : city,
            },
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

      {showVisitModal && (
        <LogVisitModal onClose={() => setShowVisitModal(false)} />
      )}
    </main>
  )
}
