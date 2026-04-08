import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/onboarding'
  const origin = requestUrl.origin

  if (!next.startsWith('/')) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth callback error:', error.message)
    return NextResponse.redirect(`${origin}/auth`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
