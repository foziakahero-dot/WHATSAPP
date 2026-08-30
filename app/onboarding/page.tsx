import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Onboarding() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) redirect('/setup')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, role, status, instructions, permissions')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const permissions = (agent?.permissions || {}) as Record<string, boolean>

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">CONVO<span>OPS</span></div>
        <nav className="nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/inbox">Inbox</Link>
          <Link href="/onboarding">AI Agent</Link>
          <Link href="/setup">Workspace</Link>
        </nav>
      </aside>
      <main>
        <div className="eyebrow">Agent setup</div>
        <h2>Meet your AI employee</h2>

        {agent ? (
          <div className="card" style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <p style={{ marginTop: 0 }}><strong>{agent.name}</strong> · {agent.role}</p>
                <p className="muted">{agent.instructions}</p>
              </div>
              <div className={agent.status === 'active' ? 'status' : 'label'}>{agent.status}</div>
            </div>

            <p className="label">Permissions</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {Object.entries(permissions).map(([key, enabled]) => (
                <div className="card" key={key} style={{ padding: 12 }}>
                  <strong>{enabled ? '✓' : '—'} {key.replaceAll('_', ' ')}</strong>
                </div>
              ))}
            </div>

            <p className="muted" style={{ marginBottom: 0, marginTop: 18 }}>
              Maya stays in draft mode until a WhatsApp channel and business knowledge are configured.
            </p>
          </div>
        ) : (
          <div className="card">No AI employee has been provisioned for this workspace.</div>
        )}
      </main>
    </div>
  )
}
