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
    city?: string
    town?: string
    village?: string
    suburb?: string
    state_district?: string
    state?: string
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, '').trim()
}

function dedupeCafeResults(items: CafeSearchResult[]) {
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

function mapDbCafe(cafe: Database['public']['Tables']['cafes']['Row']): CafeSearchResult {
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

    const supabase =
      (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let userCity: string | null = null

    if (user?.id) {
      const profileRes = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .maybeSingle()

      if (profileRes.error) {
        return NextResponse.json({ error: profileRes.error.message }, { status: 500 })
      }

      userCity = profileRes.data?.city ?? null
    }

    let dbResults: CafeSearchResult[] = []

    if (q.length === 0) {
      if (userCity) {
        const cityRes = await supabase
          .from('cafes')
          .select('id, osm_place_id, name, city, address, lat, lng')
          .eq('city', userCity)
          .order('name', { ascending: true })
          .limit(12)

        if (cityRes.error) {
          return NextResponse.json({ error: cityRes.error.message }, { status: 500 })
        }

        dbResults = (cityRes.data ?? []).map(mapDbCafe)
      } else {
        const defaultRes = await supabase
          .from('cafes')
          .select('id, osm_place_id, name, city, address, lat, lng')
          .order('name', { ascending: true })
          .limit(12)

        if (defaultRes.error) {
          return NextResponse.json({ error: defaultRes.error.message }, { status: 500 })
        }

        dbResults = (defaultRes.data ?? []).map(mapDbCafe)
      }

      return NextResponse.json({ cafes: dedupeCafeResults(dbResults) })
    }

    const dbQueries: Array<PromiseLike<{
      data: Database['public']['Tables']['cafes']['Row'][] | null
      error: { message: string } | null
    }>> = []

    if (userCity) {
      dbQueries.push(
        supabase
          .from('cafes')
          .select('id, osm_place_id, name, city, address, lat, lng')
          .eq('city', userCity)
          .or(`name.ilike.%${q}%,address.ilike.%${q}%`)
          .order('name', { ascending: true })
          .limit(8)
      )
    }

    dbQueries.push(
      supabase
        .from('cafes')
        .select('id, osm_place_id, name, city, address, lat, lng')
        .or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`)
        .order('name', { ascending: true })
        .limit(8)
    )

    const dbResponses = await Promise.all(dbQueries)

    for (const res of dbResponses) {
      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 500 })
      }
    }

    dbResults = dedupeCafeResults(
      dbResponses.flatMap((res) => (res.data ?? []).map(mapDbCafe))
    )

    // Protect the public Nominatim endpoint:
    // - don't search it for very short queries
    // - don't call it if DB already has enough results
    if (q.length < 3 || dbResults.length >= 6) {
      return NextResponse.json({ cafes: dbResults.slice(0, 12) })
    }

    const nominatimQuery = userCity ? `${rawQ} cafe ${userCity}` : `${rawQ} cafe`
    let nominatimResults: CafeSearchResult[] = []

    try {
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
      nominatimUrl.searchParams.set('q', nominatimQuery)
      nominatimUrl.searchParams.set('format', 'jsonv2')
      nominatimUrl.searchParams.set('addressdetails', '1')
      nominatimUrl.searchParams.set('limit', '6')

      const userAgent =
        process.env.NOMINATIM_USER_AGENT ||
        'Chun/1.0 (pranayjainsecond@gmail.com)'

      const nominatimRes = await fetch(nominatimUrl.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
        cache: 'no-store',
      })

      if (nominatimRes.ok) {
        const places = (await nominatimRes.json()) as NominatimPlace[]

        nominatimResults = places.map((place) => ({
          id: null,
          osm_place_id: String(place.place_id),
          name: place.display_name.split(',')[0]?.trim() || 'Unknown Cafe',
          city: extractCity(place),
          address: place.display_name,
          lat: Number(place.lat),
          lng: Number(place.lon),
          source: 'nominatim',
        }))
      }
    } catch (error) {
      console.error('Nominatim lookup failed:', error)
    }

    const cafes = dedupeCafeResults([...dbResults, ...nominatimResults]).slice(0, 12)

    return NextResponse.json({ cafes })
  } catch (error) {
    console.error('GET /api/cafes/search failed:', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
