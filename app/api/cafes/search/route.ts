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

function dedupeCafeResults(items: CafeSearchResult[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key =
      item.osm_place_id
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''

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

      userCity = profileRes.data?.city ?? null
    }

    let dbQuery = supabase
      .from('cafes')
      .select('id, osm_place_id, name, city, address, lat, lng')
      .limit(q.length > 0 ? 8 : 12)

    if (q.length > 0) {
      dbQuery = dbQuery.or(
        `name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`
      )
    }

    if (userCity) {
      dbQuery = dbQuery.order('name', { ascending: true })
    }

    const { data: dbCafes, error: dbError } = await dbQuery

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const normalizedDbResults: CafeSearchResult[] = (dbCafes ?? []).map((cafe) => ({
      id: cafe.id,
      osm_place_id: cafe.osm_place_id ?? null,
      name: cafe.name,
      city: cafe.city ?? null,
      address: cafe.address ?? null,
      lat: cafe.lat ?? null,
      lng: cafe.lng ?? null,
      source: 'db',
    }))

    if (q.length < 2) {
      return NextResponse.json({
        cafes: dedupeCafeResults(normalizedDbResults),
      })
    }

    const nominatimQuery = userCity ? `${q} cafe ${userCity}` : `${q} cafe`

    let nominatimResults: CafeSearchResult[] = []

    try {
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
      nominatimUrl.searchParams.set('q', nominatimQuery)
      nominatimUrl.searchParams.set('format', 'jsonv2')
      nominatimUrl.searchParams.set('addressdetails', '1')
      nominatimUrl.searchParams.set('limit', '8')

      const nominatimRes = await fetch(nominatimUrl.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Chun/1.0',
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

    const cafes = dedupeCafeResults([
      ...normalizedDbResults,
      ...nominatimResults,
    ]).slice(0, 12)

    return NextResponse.json({ cafes })
  } catch (error) {
    console.error('GET /api/cafes/search failed:', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
