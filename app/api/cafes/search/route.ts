import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const supabase = await createSupabaseServerClient()

  const query = supabase
    .from('cafes')
    .select('id, name, city, address:addr')
    .eq('is_active' as never, true)
    .limit(8)

  if (q.length > 0) {
    query.ilike('name', `%${q}%`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cafes: data ?? [] })
}
