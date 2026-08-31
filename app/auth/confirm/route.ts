import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const emailOtpTypes: EmailOtpType[] = ['email', 'email_change', 'invite', 'magiclink', 'recovery', 'signup']

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
  const requestedNext = request.nextUrl.searchParams.get('next') || '/auth/set-password'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/auth/set-password'

  if (tokenHash && type && emailOtpTypes.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/login?error=invalid_or_expired_link', request.url))
}
