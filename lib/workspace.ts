import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: membership } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id).order('created_at').limit(1).maybeSingle()
  if (!membership) redirect('/setup')
  const { data: organization } = await supabase.from('organizations').select('name, plan').eq('id', membership.organization_id).single()
  return { supabase, user, orgId: membership.organization_id, role: membership.role, workspace: organization?.name || 'Workspace', plan: organization?.plan || 'launch' }
}
