import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { geocodeCafe } from '@/lib/geocode'

// POST /api/admin/geocode-backfill
// Finds all cafes with missing lat/lng and geocodes them via Nominatim.
// Respects OSM rate limit: 1 req/s with a small jitter.
// Returns a summary of what was fixed.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find all cafes missing coordinates
  const { data: cafes, error } = await (supabase as any)
    .from('cafes')
    .select('id, name, city, address')
    .or('lat.is.null,lng.is.null')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (cafes ?? []) as { id: string; name: string; city: string | null; address: string | null }[]

  let fixed = 0
  let failed = 0
  const failedNames: string[] = []

  for (const cafe of rows) {
    const result = await geocodeCafe(cafe.name, cafe.city, cafe.address)

    if (result) {
      const { error: updateErr } = await (supabase as any)
        .from('cafes')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', cafe.id)

      if (!updateErr) {
        fixed++
      } else {
        failed++
        failedNames.push(cafe.name)
      }
    } else {
      failed++
      failedNames.push(cafe.name)
    }

    // Respect Nominatim rate limit: 1 req/s
    await sleep(1100)
  }

  return NextResponse.json({
    total: rows.length,
    fixed,
    failed,
    failedNames,
  })
}
