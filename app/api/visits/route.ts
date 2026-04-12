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
  note?: string | null
  visitedAt?: string | null
}

type BrandRow = {
  id: string
  name: string
  slug: string | null
}

type CafeRow = {
  id: string
  name: string
  city: string | null
  address: string | null
  osm_place_id: string | null
  primary_brand_id: string | null
  brand_match_status: 'matched' | 'pending' | 'unmatched' | null
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

function normalizeForMatch(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[|,()\-]/g, ' ')
    .replace(/\b(coffee|cafe|café|roasters|roastery|espresso|bar|outlet|store)\b/g, ' ')
    .replace(
      /\b(fort|worli|bandra|nariman point|kala ghoda|churchgate|andheri|juhu|powai|colaba)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreBrandMatch(cafeName: string, brand: BrandRow) {
  const cafeNorm = normalizeForMatch(cafeName)
  const brandNorm = normalizeForMatch(brand.name)
  const slugNorm = normalizeForMatch(brand.slug)

  if (!cafeNorm || (!brandNorm && !slugNorm)) return 0

  if (cafeNorm === brandNorm || (slugNorm && cafeNorm === slugNorm)) return 1
  if (brandNorm && cafeNorm.startsWith(brandNorm)) return 0.96
  if (brandNorm && cafeNorm.includes(brandNorm)) return 0.92
  if (slugNorm && cafeNorm.includes(slugNorm)) return 0.9

  return 0
}

async function findBestBrandMatch(
  supabase: SupabaseClient<Database>,
  cafeName: string
): Promise<{ brandId: string | null; status: 'matched' | 'pending' | 'unmatched' }> {
  const brandsRes = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('is_active', true)

  if (brandsRes.error) {
    throw new Error(brandsRes.error.message)
  }

  const brands = (brandsRes.data ?? []) as BrandRow[]
  let best: { brandId: string | null; score: number } = { brandId: null, score: 0 }

  for (const brand of brands) {
    const score = scoreBrandMatch(cafeName, brand)
    if (score > best.score) {
      best = { brandId: brand.id, score }
    }
  }

  if (best.brandId && best.score >= 0.95) {
    return { brandId: best.brandId, status: 'matched' }
  }

  if (best.brandId && best.score >= 0.9) {
    return { brandId: best.brandId, status: 'pending' }
  }

  return { brandId: null, status: 'unmatched' }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisitRequestBody
    const { cafeId, cafe, note, visitedAt } = body

    if (!cafeId && !cafe?.id && !cafe?.name) {
      return NextResponse.json({ error: 'Cafe is required.' }, { status: 400 })
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
    let resolvedCafe: CafeRow | null = null

    if (!resolvedCafeId && cafe?.osm_place_id) {
      const existingCafeRes = await supabase
        .from('cafes')
        .select('id, name, city, address, osm_place_id, primary_brand_id, brand_match_status')
        .eq('osm_place_id', cafe.osm_place_id)
        .maybeSingle()

      if (existingCafeRes.error) {
        return NextResponse.json({ error: existingCafeRes.error.message }, { status: 500 })
      }

      if (existingCafeRes.data) {
        resolvedCafe = existingCafeRes.data as CafeRow
        resolvedCafeId = resolvedCafe.id
      }
    }

    if (resolvedCafeId && !resolvedCafe) {
      const cafeRes = await supabase
        .from('cafes')
        .select('id, name, city, address, osm_place_id, primary_brand_id, brand_match_status')
        .eq('id', resolvedCafeId)
        .maybeSingle()

      if (cafeRes.error) {
        return NextResponse.json({ error: cafeRes.error.message }, { status: 500 })
      }

      resolvedCafe = (cafeRes.data as CafeRow | null) ?? null
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

      const match = await findBestBrandMatch(supabase, name)

      const insertCafeRes = await supabase
        .from('cafes')
        .insert({
          name,
          city,
          address,
          lat,
          lng,
          osm_place_id: normalizeText(cafe?.osm_place_id),
          primary_brand_id: match.brandId,
          brand_match_status: match.status,
        })
        .select('id, name, city, address, osm_place_id, primary_brand_id, brand_match_status')
        .single()

      if (insertCafeRes.error) {
        return NextResponse.json({ error: insertCafeRes.error.message }, { status: 500 })
      }

      resolvedCafe = insertCafeRes.data as CafeRow
      resolvedCafeId = resolvedCafe.id

      if (match.brandId) {
        const insertCafeBrandRes = await supabase
          .from('cafe_brands')
          .upsert(
            [{ cafe_id: resolvedCafeId, brand_id: match.brandId }],
            { onConflict: 'cafe_id,brand_id' }
          )

        if (insertCafeBrandRes.error) {
          return NextResponse.json({ error: insertCafeBrandRes.error.message }, { status: 500 })
        }
      }
    }

    if (!resolvedCafeId || !resolvedCafe) {
      return NextResponse.json({ error: 'Could not resolve café.' }, { status: 500 })
    }

    if (!resolvedCafe.primary_brand_id && resolvedCafe.name) {
      const match = await findBestBrandMatch(supabase, resolvedCafe.name)

      if (match.brandId || match.status !== resolvedCafe.brand_match_status) {
        const updateCafeRes = await supabase
          .from('cafes')
          .update({
            primary_brand_id: match.brandId,
            brand_match_status: match.status,
          })
          .eq('id', resolvedCafeId)
          .select('id, name, city, address, osm_place_id, primary_brand_id, brand_match_status')
          .single()

        if (updateCafeRes.error) {
          return NextResponse.json({ error: updateCafeRes.error.message }, { status: 500 })
        }

        resolvedCafe = updateCafeRes.data as CafeRow

        if (match.brandId) {
          const upsertCafeBrandRes = await supabase
            .from('cafe_brands')
            .upsert(
              [{ cafe_id: resolvedCafeId, brand_id: match.brandId }],
              { onConflict: 'cafe_id,brand_id' }
            )

          if (upsertCafeBrandRes.error) {
            return NextResponse.json({ error: upsertCafeBrandRes.error.message }, { status: 500 })
          }
        }
      }
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
      return NextResponse.json({ error: visitInsertRes.error.message }, { status: 500 })
    }

    const finalCafeBrandsRes = await supabase
      .from('cafe_brands')
      .select('brand_id')
      .eq('cafe_id', resolvedCafeId)

    if (finalCafeBrandsRes.error) {
      return NextResponse.json({ error: finalCafeBrandsRes.error.message }, { status: 500 })
    }

    const finalBrandIds = (finalCafeBrandsRes.data ?? []).map((row) => row.brand_id)

    // ── Seed shelf + build face-off queue ─────────────────────────────────────
    // If the café matched to a brand, seed it on the shelf at default Elo score
    // and return all other ranked brands so the client can run face-offs against them.
    const seededBrandId = resolvedCafe.primary_brand_id ?? null
    let faceoffCategoryId: string | null = null
    let shelfBrands: Array<{ brandId: string; score: number }> = []

    if (seededBrandId) {
      // Demo-layer: coffee is the only live category right now.
      // When multi-category ships, pass categorySlug in the request body instead.
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'coffee')
        .maybeSingle()

      if (category) {
        faceoffCategoryId = category.id

        // Upsert with ignoreDuplicates: true so we never overwrite an existing
        // score if the user has already ranked this brand through a prior visit.
        await supabase
          .from('shelf_items')
          .upsert(
            [{
              user_id: user.id,
              brand_id: seededBrandId,
              category_id: faceoffCategoryId,
              rank: 999,
              score: 1200,
            }],
            { onConflict: 'user_id,brand_id,category_id', ignoreDuplicates: true }
          )

        // Fetch every other brand already on the shelf, ordered by score descending
        // so the face-off carousel starts with the strongest opponents first.
        const { data: existingShelf } = await supabase
          .from('shelf_items')
          .select('brand_id, score')
          .eq('user_id', user.id)
          .eq('category_id', faceoffCategoryId)
          .neq('brand_id', seededBrandId)
          .order('score', { ascending: false })

        shelfBrands = (existingShelf ?? []).map((row) => ({
          brandId: row.brand_id,
          score: row.score,
        }))
      }
    }
    // ── End shelf seed ────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      visitId: visitInsertRes.data.id,
      cafeId: resolvedCafeId,
      primaryBrandId: resolvedCafe.primary_brand_id,
      brandMatchStatus: resolvedCafe.brand_match_status ?? 'unmatched',
      brandIds: finalBrandIds,
      // Consumed by LogVisitModal to trigger the post-visit face-off carousel
      seededBrandId,
      categoryId: faceoffCategoryId,
      shelfBrands,
    })
  } catch (error) {
    console.error('POST /api/visits failed:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
