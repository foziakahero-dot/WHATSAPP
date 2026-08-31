import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requirePlatformAdmin(nextPath = '/admin/overview') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const safeNext = nextPath.startsWith('/admin/') ? nextPath : '/admin/overview'
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext)}`)
  const { data: admin } = await supabase.from('platform_admins').select('role,active').eq('user_id', user.id).eq('active', true).maybeSingle()
  if (!admin) redirect('/app/overview?error=platform_admin_required')
  return { user, role: admin.role as string }
}
