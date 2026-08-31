import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppShell, EmptyState, PageHeader } from '@/components/app-shell'
import { getWorkspace } from '@/lib/workspace'
import { releaseConversation, sendHumanReply, takeOverConversation } from '@/app/app/actions'

const sections = ['overview','inbox','leads','bookings','ai-employee','knowledge','automations','copilot','integrations','analytics','team','billing','settings'] as const
type Section = typeof sections[number]
const copy: Record<Exclude<Section,'overview'|'inbox'>, [string,string,string]> = {
  leads: ['Operations','Leads','Qualified opportunities captured from customer conversations.'], bookings: ['Operations','Bookings','Appointments created by Maya and your human team.'],
  'ai-employee': ['AI workforce','AI Employee','Configure, monitor and test your AI employee.'], knowledge: ['AI workforce','Knowledge','Approved sources Maya uses to answer customers accurately.'], automations: ['AI workforce','Automations','Turn conversation signals into reliable business workflows.'],
  copilot: ['Owner intelligence','Owner Copilot','Ask what happened today and what needs your attention.'], integrations: ['Connect','Integrations','Connect channels, calendars, payments, CRM and webhooks.'], analytics: ['Insights','Analytics','Understand conversations, outcomes and AI performance.'],
  team: ['Human workforce','Team & Roles','Control who may view, approve and act inside your workspace.'], billing: ['Workspace','Billing & Usage','Manage your plan, usage, invoices and payment method.'], settings: ['Workspace configuration','Settings','Configure localization, permissions, privacy and developer access.']
}

export default async function WorkspaceSection({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ conversation?: string }> }) {
  const { section: raw } = await params
  const query = await searchParams
  if (!sections.includes(raw as Section)) notFound()
  const section = raw as Section
  const ctx = await getWorkspace()
  return <AppShell active={section} workspace={ctx.workspace} role={ctx.role}>
    {section === 'overview' ? <Overview {...ctx} /> : section === 'inbox' ? <Inbox {...ctx} requestedConversationId={query.conversation} /> : <ProductSection section={section as Exclude<Section,'overview'|'inbox'>} plan={ctx.plan} />}
  </AppShell>
}

async function Overview({ supabase, orgId, workspace, role }: Awaited<ReturnType<typeof getWorkspace>>) {
  const [conversations, leads, bookings, actions] = await Promise.all([
    supabase.from('conversations').select('*',{count:'exact',head:true}).eq('organization_id',orgId), supabase.from('leads').select('*',{count:'exact',head:true}).eq('organization_id',orgId),
    supabase.from('bookings').select('*',{count:'exact',head:true}).eq('organization_id',orgId), supabase.from('actions').select('id,action_type,status,created_at').eq('organization_id',orgId).order('created_at',{ascending:false}).limit(6)
  ])
  const metrics = [['Conversations',conversations.count||0,'Live'],['Qualified leads',leads.count||0,'Captured'],['Bookings',bookings.count||0,'Created'],['AI actions',actions.data?.length||0,'Recent']]
  return <><PageHeader eyebrow={`${workspace} · ${role}`} title="Operations overview" description="One view of conversations, outcomes and your AI workforce." action={<span className="live-pill">● Maya active</span>} />
    <section className="metric-grid">{metrics.map(([label,value,note])=><article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="dashboard-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Recent activity</span><h2>AI actions</h2></div></div>{actions.data?.length ? <div className="data-list">{actions.data.map(a=><div className="data-row" key={a.id}><span className="icon-box">✦</span><div><strong>{a.action_type.replaceAll('_',' ')}</strong><small>{new Date(a.created_at).toLocaleString()}</small></div><span className={`status-pill ${a.status}`}>{a.status}</span></div>)}</div> : <EmptyState title="No AI actions yet" text="Connect WhatsApp and send the first test message." />}</article>
      <article className="panel maya-card"><span className="avatar">M</span><div><span className="live-pill">● Active</span><h2>Maya</h2><p>AI Receptionist</p></div><div className="mini-stats"><span><strong>82%</strong>AI resolution</span><span><strong>4.2s</strong>Reply time</span></div><a className="primary-button" href="/app/ai-employee">Configure Maya</a></article></section></>
}

async function Inbox({ supabase, orgId, requestedConversationId }: Awaited<ReturnType<typeof getWorkspace>> & { requestedConversationId?: string }) {
  const { data: conversations } = await supabase.from('conversations').select('id,status,last_message_at,contact_id').eq('organization_id',orgId).order('last_message_at',{ascending:false,nullsFirst:false}).limit(30)
  const rows = await Promise.all((conversations||[]).map(async c => { const [{data:contact},{data:messages}] = await Promise.all([c.contact_id ? supabase.from('contacts').select('display_name,phone,language').eq('id',c.contact_id).maybeSingle() : Promise.resolve({data:null}), supabase.from('messages').select('body,sender_type,created_at').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(1)]); return {...c,contact,messages:messages||[]} }))
  const activeId = rows.some(row => row.id === requestedConversationId) ? requestedConversationId : rows[0]?.id
  const activeRow = rows.find(row => row.id === activeId)
  const [{ data: activeConversation }, { data: activeMessages }] = activeId ? await Promise.all([
    supabase.from('conversations').select('id,status,assigned_user_id').eq('id',activeId).eq('organization_id',orgId).single(),
    supabase.from('messages').select('id,body,sender_type,created_at').eq('conversation_id',activeId).eq('organization_id',orgId).order('created_at',{ascending:false}).limit(50)
  ]) : [{ data: null }, { data: null }]
  const thread = [...(activeMessages || [])].reverse()
  return <><PageHeader eyebrow="Operations" title="Inbox" description="AI and human conversations in one shared workspace." action={<button className="secondary-button">Filters</button>} />
    <div className="inbox-layout"><section className="conversation-list"><div className="tabs"><button className="active">All <b>{rows.length}</b></button><button>Unread</button><button>Handoff</button></div>{rows.length ? rows.map(c=><Link href={`/app/inbox?conversation=${c.id}`} className={`conversation-row ${c.id===activeId?'selected':''}`} key={c.id}><span className="avatar small">{(c.contact?.display_name||'C').slice(0,1)}</span><div><strong>{c.contact?.display_name||c.contact?.phone||'Unknown contact'}</strong><p>{c.messages[0]?.body||'No text message'}</p><small>{c.contact?.language||'Auto'} · {c.status}</small></div><time>{c.last_message_at?new Date(c.last_message_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}</time></Link>) : <EmptyState title="No conversations yet" text="Messages will appear as soon as the WhatsApp webhook receives them." />}</section>
      <section className="panel conversation-detail">{activeConversation && activeRow ? <><header className="thread-header"><div><span className="avatar small">{(activeRow.contact?.display_name||'C').slice(0,1)}</span><div><strong>{activeRow.contact?.display_name||activeRow.contact?.phone||'Customer'}</strong><small>{activeRow.contact?.language||'Auto-detect'} · WhatsApp</small></div></div>{activeConversation.status === 'handoff' ? <form action={releaseConversation}><input type="hidden" name="conversationId" value={activeConversation.id}/><button className="secondary-button" type="submit">Release to Maya</button></form> : <form action={takeOverConversation}><input type="hidden" name="conversationId" value={activeConversation.id}/><button className="primary-button" type="submit">Take over</button></form>}</header>
        <div className="message-thread">{thread.map(message => <div className={`thread-message ${message.sender_type}`} key={message.id}><span>{message.sender_type === 'customer' ? activeRow.contact?.display_name || 'Customer' : message.sender_type === 'human' ? 'Human operator' : 'Maya'}</span><p>{message.body || 'Unsupported message'}</p><time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>
        <form action={sendHumanReply} className="reply-composer"><input type="hidden" name="conversationId" value={activeConversation.id}/><textarea name="body" required maxLength={4096} placeholder={activeConversation.status === 'handoff' ? 'Reply as a human operator…' : 'Take over before replying…'} disabled={activeConversation.status !== 'handoff'} /><button className="primary-button" type="submit" disabled={activeConversation.status !== 'handoff'}>Send</button></form>
      </> : <EmptyState title="Select a conversation" text="Read the thread, inspect AI confidence, or take over as a human." />}</section></div></>
}

function ProductSection({ section, plan }: { section: Exclude<Section,'overview'|'inbox'>; plan: string }) {
  const [eyebrow,title,description]=copy[section]
  const cards: Record<string,string[]> = { leads:['New','Qualified','Proposal sent','Won'], bookings:['Upcoming','AI-assisted','Completed','Cancelled'], 'ai-employee':['Instructions','Languages','Permissions','Test console'], knowledge:['Web pages','Documents','FAQs','Sync status'], automations:['Lead follow-up','Booking confirmation','Human handoff','Payment approval'], copilot:['Daily brief','Pipeline risks','Missed opportunities','Suggested actions'], integrations:['WhatsApp','Google Calendar','Stripe','API & Webhooks'], analytics:['AI resolution','Qualified leads','Bookings','Handoff reasons'], team:['Owner','Admin','Manager','Agent'], billing:['Current plan','Conversations','AI actions','Invoices'], settings:['General','Localization','AI & Permissions','Data & Privacy'] }
  return <><PageHeader eyebrow={eyebrow} title={title} description={description} action={<button className="primary-button">{section==='team'?'Invite member':section==='automations'?'Create automation':'Configure'}</button>} />
    {section==='ai-employee' && <article className="employee-hero panel"><span className="avatar">M</span><div><span className="live-pill">● Active</span><h2>Maya</h2><p>AI Receptionist · replies in the customer&apos;s language</p></div><div className="employee-score"><strong>82%</strong><span>AI resolution</span></div></article>}
    <section className="feature-grid">{cards[section].map((name,i)=><article className="panel feature-card" key={name}><span className="icon-box">{['✦','◎','◇','↗'][i]}</span><h3>{name}</h3><p>{i===0?`Ready on the ${plan} plan.`:'Prepared for live workspace data and permissions.'}</p><span className={i<2?'status-pill completed':'status-pill'}>{i<2?'Ready':'Configure'}</span></article>)}</section>
    <article className="panel roadmap-panel"><div><span className="eyebrow">Implementation status</span><h2>{title} workspace</h2><p>The page structure, navigation and responsive states are connected. The next layer is provider credentials and production data flows.</p></div><div className="progress"><span style={{width: section==='integrations'?'55%':'72%'}} /></div></article></>
}
