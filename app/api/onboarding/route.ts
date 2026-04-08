import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type OnboardingPayload = {
  categorySlug: string
  selectedBrandIds: string[]
  city?: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingPayload
    const { categorySlug, selectedBrandIds, city } = body

    if (!categorySlug || !Array.isArray(selectedBrandIds) || selectedBrandIds.length < 5) {
      return NextResponse.json(
        { error: 'Please choose a category and at least 5 brands.' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<Database>

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('slug', categorySlug)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        city: city ?? null,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const shelfRows = selectedBrandIds.map((brandId, index) => ({
      user_id: user.id,
      brand_id: brandId,
      category_id: category.id,
      rank: index + 1,
      score: 1200,
      quick_review: null,
      tried_at: new Date().toISOString(),
    }))

    const { error: shelfError } = await supabase
      .from('shelf_items')
      .upsert(shelfRows, {
        onConflict: 'user_id,brand_id,category_id',
      })

    if (shelfError) {
      return NextResponse.json({ error: shelfError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      category: category.slug,
      saved: selectedBrandIds.length,
    })
  } catch (error) {
    console.error('Onboarding API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong while saving onboarding.' },
      { status: 500 }
    )
  }
}
