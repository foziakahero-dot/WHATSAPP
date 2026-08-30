import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Inbox() {
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

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, status, last_message_at, contact_id')
    .eq('organization_id', membership.organization_id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(30)

  const rows = await Promise.all(
    (conversations || []).map(async (conversation) => {
      const [{ data: contact }, { data: messages }] = await Promise.all([
        conversation.contact_id
          ? supabase.from('contacts').select('display_name, phone, language').eq('id', conversation.contact_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from('messages')
          .select('body, sender_type, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(2)
      ])

      return {
        ...conversation,
        contact,
        messages: messages || []
      }
    })
  )

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
        <div className="eyebrow">Shared inbox</div>
        <h2>Customer conversations</h2>
        <p className="muted">Live WhatsApp conversations appear here as soon as the webhook receives them.</p>

        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {rows.length ? rows.map((conversation) => {
            const latest = conversation.messages[0]
            return (
              <div className="card" key={conversation.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <strong>{conversation.contact?.display_name || conversation.contact?.phone || 'Unknown contact'}</strong>
                    <p className="label">
                      WhatsApp{conversation.contact?.language ? ` · ${conversation.contact.language}` : ''} · {conversation.status}
                    </p>
                  </div>
                  <div className="label">{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString() : ''}</div>
                </div>
                <p style={{ marginBottom: 0 }}>
                  {latest?.sender_type === 'ai' ? <strong>AI: </strong> : null}
                  {latest?.body || 'No text message'}
                </p>
              </div>
            )
          }) : (
            <div className="card">
              <strong>No conversations yet</strong>
              <p className="muted">Connect a WhatsApp Business number and send the first test message.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
