// lib/geocode.ts
// Shared utility to geocode a cafe by name + city using Nominatim.
// Rate-limited to 1 req/s as per OSM policy.

type GeoResult = {
  lat: number
  lng: number
  address: string | null
} | null

export async function geocodeCafe(
  name: string,
  city: string | null,
  address: string | null
): Promise<GeoResult> {
  const query = [name, address, city].filter(Boolean).join(', ')
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&addressdetails=1`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Chun-App/1.0 (contact@chun.app)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const results = await res.json() as Array<{
      lat: string; lon: string;
      address?: { road?: string; suburb?: string; city?: string; town?: string; village?: string }
    }>

    if (!results.length) {
      // Fallback: try just name + city without address
      if (address) return geocodeCafe(name, city, null)
      return null
    }

    const best = results[0]
    const lat = parseFloat(best.lat)
    const lng = parseFloat(best.lon)
    if (!isFinite(lat) || !isFinite(lng)) return null

    const a = best.address
    const shortAddress = [
      a?.road ?? a?.suburb,
      a?.city ?? a?.town ?? a?.village ?? city,
    ].filter(Boolean).join(', ') || null

    return { lat, lng, address: shortAddress }
  } catch {
    return null
  }
}
