import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) redirect('/setup')

  const orgId = membership.organization_id

  const [orgResult, conversationsResult, leadsResult, bookingsResult, actionsResult] = await Promise.all([
    supabase.from('organizations').select('name, plan').eq('id', orgId).single(),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase
      .from('actions')
      .select('id, action_type, status, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(8)
  ])

  const metrics = [
    ['Conversations', String(conversationsResult.count || 0)],
    ['Leads', String(leadsResult.count || 0)],
    ['Bookings', String(bookingsResult.count || 0)],
    ['AI actions', String(actionsResult.data?.length || 0)]
  ]

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
        <div className="eyebrow">{orgResult.data?.name || 'Workspace'} · {membership.role}</div>
        <h2>Operations overview</h2>
        <p className="muted">Live data from your CONVOOPS workspace. Plan: {orgResult.data?.plan || 'launch'}.</p>

        <div className="grid" style={{ marginTop: 20 }}>
          {metrics.map(([key, value]) => (
            <div className="card" key={key}>
              <div className="label">{key}</div>
              <div className="metric">{value}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Recent AI actions</div>
          {actionsResult.data?.length ? (
            <table className="table">
              <thead>
                <tr><th>Action</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody>
                {actionsResult.data.map((action) => (
                  <tr key={action.id}>
                    <td>{action.action_type.replaceAll('_', ' ')}</td>
                    <td className={action.status === 'completed' ? 'status' : ''}>{action.status}</td>
                    <td>{new Date(action.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No AI actions yet. Connect WhatsApp and send the first test message.</p>
          )}
        </div>
      </main>
    </div>
  )
}
