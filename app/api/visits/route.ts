import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { cafeId, note, visitedAt } = await request.json()

    if (!cafeId) {
      return NextResponse.json({ error: 'Cafe is required.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<Database>
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: visit, error } = await supabase
      .from('cafe_visits')
      .insert({
        user_id:    user.id,
        cafe_id:    cafeId,
        note:       note?.trim() || null,
        visited_at: visitedAt ?? new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch brands served at this cafe for post-visit faceoff
    const { data: cafeBrands } = await supabase
      .from('cafe_brands')
      .select('brand_id')
      .eq('cafe_id', cafeId)

    return NextResponse.json({
      success: true,
      visitId: visit.id,
      brandIds: cafeBrands?.map((b) => b.brand_id) ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
