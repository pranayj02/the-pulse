import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type CafeSearchResult = {
  id: string | null
  osm_place_id: string | null
  name: string
  city: string | null
  address: string | null
  lat: number | null
  lng: number | null
  source: 'db' | 'nominatim'
}

type NominatimPlace = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    state_district?: string
    state?: string
  }
}

type CafeRowForSearch = Pick<
  Database['public']['Tables']['cafes']['Row'],
  'id' | 'osm_place_id' | 'name' | 'city' | 'address' | 'lat' | 'lng'
>

// City → approximate bounding box for Nominatim viewbox bias
const CITY_VIEWBOX: Record<string, string> = {
  mumbai:    '72.77,18.87,72.99,19.27',
  delhi:     '76.84,28.40,77.35,28.88',
  bangalore: '77.46,12.83,77.78,13.14',
  bengaluru: '77.46,12.83,77.78,13.14',
  chennai:   '80.17,12.90,80.30,13.15',
  hyderabad: '78.33,17.29,78.58,17.52',
  pune:      '73.77,18.44,73.96,18.61',
  kolkata:   '88.27,22.47,88.43,22.63',
  goa:       '73.78,15.28,74.12,15.56',
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function escapeIlike(value: string) {
  return value.replace(/[%_]/g, '').trim()
}

function buildShortAddress(place: NominatimPlace): string | null {
  const neighbourhood =
    place.address?.suburb ||
    place.address?.neighbourhood ||
    place.address?.road ||
    null
  const city =
    place.address?.city ||
    place.address?.town ||
    place.address?.village ||
    place.address?.state_district ||
    null
  const parts = [neighbourhood, city].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return place.display_name.split(',')[1]?.trim() ?? null
}

function extractCity(place: NominatimPlace) {
  return (
    place.address?.city ||
    place.address?.town ||
    place.address?.village ||
    place.address?.suburb ||
    place.address?.state_district ||
    place.address?.state ||
    null
  )
}

function normalizeBrandName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(coffee|cafe|café|roasters|roastery|speciality|specialty|bakehouse|espresso|bar|outlet|store|and|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupe(items: CafeSearchResult[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.osm_place_id
      ? `osm:${item.osm_place_id}`
      : `txt:${normalizeText(item.name)}|${normalizeText(item.address)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mapDbCafe(cafe: CafeRowForSearch): CafeSearchResult {
  return {
    id: cafe.id,
    osm_place_id: cafe.osm_place_id ?? null,
    name: cafe.name,
    city: cafe.city ?? null,
    address: cafe.address ?? null,
    lat: cafe.lat ?? null,
    lng: cafe.lng ?? null,
    source: 'db',
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ = searchParams.get('q')?.trim() ?? ''
    const q = escapeIlike(rawQ)

    const supabase = (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>
    const { data: { user } } = await supabase.auth.getUser()

    let userCity: string | null = null
    if (user?.id) {
      const profileRes = await supabase
        .from('profiles').select('city').eq('id', user.id).maybeSingle()
      userCity = profileRes.data?.city ?? null
    }

    // ── Empty query: show cafes from user's city ──────────────────────────────
    if (q.length === 0) {
      const emptyRes = await supabase
        .from('cafes')
        .select('id, osm_place_id, name, city, address, lat, lng')
        .order('name', { ascending: true })
        .limit(15)
      return NextResponse.json({ cafes: dedupe((emptyRes.data ?? []).map(mapDbCafe)) })
    }

    // ── DB search: city-prioritised + global, no artificial cap ──────────────
    let cityDbResults: CafeSearchResult[] = []
    if (userCity) {
      const cityRes = await supabase
        .from('cafes')
        .select('id, osm_place_id, name, city, address, lat, lng')
        .ilike('name', `%${q}%`)
        .order('name', { ascending: true })
        .limit(15)
      cityDbResults = (cityRes.data ?? []).map(mapDbCafe)
    }

    // Global search — broader, includes address too
    const globalRes = await supabase
      .from('cafes')
      .select('id, osm_place_id, name, city, address, lat, lng')
      .or(`name.ilike.%${q}%,address.ilike.%${q}%`)
      .order('name', { ascending: true })
      .limit(15)

    const dbResults = dedupe([
      ...cityDbResults,
      ...(globalRes.data ?? []).map(mapDbCafe),
    ])

    // ── Nominatim: ALWAYS run for queries >= 2 chars ──────────────────────────
    // Do NOT append "cafe" — kills non-cafe places like Bombay Sweet Shop
    // Use countrycodes=in to bias India, viewbox for city precision
    let nominatimResults: CafeSearchResult[] = []

    if (rawQ.length >= 2) {
      try {
        const dbNormalizedNames = new Set(dbResults.map((r) => normalizeBrandName(r.name)))

        const nomUrl = new URL('https://nominatim.openstreetmap.org/search')
        // Search by name + city for precision, without type forcing
        const nomQuery = userCity ? `${rawQ}, ${userCity}` : rawQ
        nomUrl.searchParams.set('q', nomQuery)
        nomUrl.searchParams.set('format', 'jsonv2')
        nomUrl.searchParams.set('addressdetails', '1')
        nomUrl.searchParams.set('limit', '8')
        nomUrl.searchParams.set('countrycodes', 'in')

        // Add viewbox bias if we know the city
        const cityKey = normalizeText(userCity ?? '')
        const viewbox = CITY_VIEWBOX[cityKey]
        if (viewbox) {
          nomUrl.searchParams.set('viewbox', viewbox)
          nomUrl.searchParams.set('bounded', '0') // bias but don't restrict
        }

        const userAgent = process.env.NOMINATIM_USER_AGENT || 'Chun/1.0 (pranayjainsecond@gmail.com)'
        const nomRes = await fetch(nomUrl.toString(), {
          headers: { Accept: 'application/json', 'User-Agent': userAgent },
          signal: AbortSignal.timeout(5000),
        })

        if (nomRes.ok) {
          const places = (await nomRes.json()) as NominatimPlace[]
          nominatimResults = places
            .map((place) => ({
              id: null,
              osm_place_id: String(place.place_id),
              name: place.display_name.split(',')[0]?.trim() || 'Unknown',
              city: extractCity(place),
              address: buildShortAddress(place),
              lat: Number(place.lat),
              lng: Number(place.lon),
              source: 'nominatim' as const,
            }))
            .filter((r) => !dbNormalizedNames.has(normalizeBrandName(r.name)))
        }
      } catch (err) {
        console.error('Nominatim lookup failed:', err)
      }
    }

    const cafes = dedupe([...dbResults, ...nominatimResults]).slice(0, 15)
    return NextResponse.json({ cafes })

  } catch (error) {
    console.error('GET /api/cafes/search failed:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
