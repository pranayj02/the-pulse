import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { geocodeCafe } from '@/lib/geocode'

export const runtime = 'edge'
export const maxDuration = 300 // 5 min max for edge functions

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find cafes with missing OR zero coordinates (0,0 = unset default)
  // Use two separate queries and merge to be safe
  const [nullRes, zeroRes] = await Promise.all([
    (supabase as any)
      .from('cafes')
      .select('id, name, city, address')
      .or('lat.is.null,lng.is.null'),
    (supabase as any)
      .from('cafes')
      .select('id, name, city, address')
      .or('lat.eq.0,lng.eq.0'),
  ])

  const nullRows = (nullRes.data ?? []) as { id: string; name: string; city: string | null; address: string | null }[]
  const zeroRows = (zeroRes.data ?? []) as { id: string; name: string; city: string | null; address: string | null }[]

  // Deduplicate by id
  const seen = new Set<string>()
  const rows: { id: string; name: string; city: string | null; address: string | null }[] = []
  for (const r of [...nullRows, ...zeroRows]) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      rows.push(r)
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ total: 0, fixed: 0, failed: 0, failedNames: [], message: 'All cafés already have coordinates' })
  }

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

    // Nominatim rate limit: 1 req/s
    await sleep(1100)
  }

  return NextResponse.json({ total: rows.length, fixed, failed, failedNames })
}
