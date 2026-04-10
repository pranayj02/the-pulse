import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

type VisitRequestBody = {
  cafeId?: string | null
  cafe?: {
    id?: string | null
    osm_place_id?: string | null
    name?: string | null
    city?: string | null
    address?: string | null
    lat?: number | null
    lng?: number | null
  } | null
  brandIds?: string[]
  note?: string | null
  visitedAt?: string | null
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeVisitedAt(value: string | null | undefined) {
  if (!value) return new Date().toISOString()

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`).toISOString()
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()

  return parsed.toISOString()
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisitRequestBody
    const { cafeId, cafe, brandIds = [], note, visitedAt } = body

    const normalizedBrandIds = Array.from(
      new Set((brandIds ?? []).filter(Boolean))
    )

    if (!cafeId && !cafe?.id && !cafe?.name) {
      return NextResponse.json(
        { error: 'Cafe is required.' },
        { status: 400 }
      )
    }

    const supabase =
      (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let resolvedCafeId = cafeId || cafe?.id || null

    if (!resolvedCafeId && cafe?.osm_place_id) {
      const existingCafeRes = await supabase
        .from('cafes')
        .select('id')
        .eq('osm_place_id', cafe.osm_place_id)
        .maybeSingle()

      if (existingCafeRes.error) {
        return NextResponse.json(
          { error: existingCafeRes.error.message },
          { status: 500 }
        )
      }

      if (existingCafeRes.data?.id) {
        resolvedCafeId = existingCafeRes.data.id
      }
    }

    if (!resolvedCafeId) {
      const name = normalizeText(cafe?.name)
      const city = normalizeText(cafe?.city)
      const address = normalizeText(cafe?.address)
      const lat = cafe?.lat
      const lng = cafe?.lng

      if (!name || !city || !address || !isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        return NextResponse.json(
          {
            error:
              'Selected café is missing required location details. Please choose a result from search.',
          },
          { status: 400 }
        )
      }

      const insertCafeRes = await supabase
        .from('cafes')
        .insert({
          name,
          city,
          address,
          lat,
          lng,
          osm_place_id: normalizeText(cafe?.osm_place_id),
        })
        .select('id')
        .single()

      if (insertCafeRes.error) {
        return NextResponse.json(
          { error: insertCafeRes.error.message },
          { status: 500 }
        )
      }

      resolvedCafeId = insertCafeRes.data.id
    }

    const visitInsertRes = await supabase
      .from('cafe_visits')
      .insert({
        user_id: user.id,
        cafe_id: resolvedCafeId,
        note: normalizeText(note),
        visited_at: normalizeVisitedAt(visitedAt),
      })
      .select('id')
      .single()

    if (visitInsertRes.error) {
      return NextResponse.json(
        { error: visitInsertRes.error.message },
        { status: 500 }
      )
    }

    if (normalizedBrandIds.length > 0) {
      const existingCafeBrandsRes = await supabase
        .from('cafe_brands')
        .select('brand_id')
        .eq('cafe_id', resolvedCafeId)

      if (existingCafeBrandsRes.error) {
        return NextResponse.json(
          { error: existingCafeBrandsRes.error.message },
          { status: 500 }
        )
      }

      const existingBrandIds = new Set(
        (existingCafeBrandsRes.data ?? []).map((row) => row.brand_id)
      )

      const rowsToInsert = normalizedBrandIds
        .filter((brandId) => !existingBrandIds.has(brandId))
        .map((brandId) => ({
          cafe_id: resolvedCafeId,
          brand_id: brandId,
        }))

      if (rowsToInsert.length > 0) {
        const insertCafeBrandsRes = await supabase
          .from('cafe_brands')
          .insert(rowsToInsert)

        if (insertCafeBrandsRes.error) {
          return NextResponse.json(
            { error: insertCafeBrandsRes.error.message },
            { status: 500 }
          )
        }
      }
    }

    const finalCafeBrandsRes = await supabase
      .from('cafe_brands')
      .select('brand_id')
      .eq('cafe_id', resolvedCafeId)

    if (finalCafeBrandsRes.error) {
      return NextResponse.json(
        { error: finalCafeBrandsRes.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      visitId: visitInsertRes.data.id,
      cafeId: resolvedCafeId,
      brandIds: (finalCafeBrandsRes.data ?? []).map((row) => row.brand_id),
    })
  } catch (error) {
    console.error('POST /api/visits failed:', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
