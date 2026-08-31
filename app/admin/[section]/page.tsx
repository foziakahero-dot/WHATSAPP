import { notFound } from 'next/navigation'
import { AdminHeader, AdminShell } from '@/components/admin-shell'
import { EmptyState } from '@/components/app-shell'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const sections = ['overview','organizations','users','pilots','subscriptions','plans','revenue','ai-employees','ai-usage','actions','integrations','whatsapp','system-health','incidents','security','audit-logs','feature-flags','support','settings'] as const
type Section = typeof sections[number]

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section: raw } = await params
  if (!sections.includes(raw as Section)) notFound()
  const section=raw as Section
  const admin=await requirePlatformAdmin(`/admin/${section}`)
  return <AdminShell active={section} role={admin.role}>{section==='overview'?<Overview/>:section==='integrations'?<Integrations/>:<Placeholder section={section}/>}</AdminShell>
}

function getServiceClient() { try { return createAdminClient() } catch { return null } }

async function Overview() {
  const db=getServiceClient()
  if(!db) return <MissingConfiguration/>
  const [orgs,channels,conversations,actions,audits]=await Promise.all([
    db.from('organizations').select('*',{count:'exact',head:true}), db.from('channels').select('*',{count:'exact',head:true}),
    db.from('conversations').select('*',{count:'exact',head:true}), db.from('actions').select('*',{count:'exact',head:true}),
    db.from('platform_audit_logs').select('id,action,target_type,target_id,created_at').order('created_at',{ascending:false}).limit(8)
  ])
  const metrics=[['Organizations',orgs.count||0],['Connected channels',channels.count||0],['Conversations',conversations.count||0],['Platform actions',actions.count||0]]
  return <><AdminHeader eyebrow="Platform control" title="Superadmin overview" description="Operational control across every CONVOOPS workspace." action={<span className="live-pill">● Systems monitored</span>}/><section className="metric-grid">{metrics.map(([label,value])=><article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>Live platform data</small></article>)}</section><section className="admin-overview-grid"><article className="panel"><div className="panel-heading"><span className="eyebrow">Governance</span><h2>Recent admin activity</h2></div>{audits.data?.length?<div className="data-list">{audits.data.map(item=><div className="data-row" key={item.id}><span className="icon-box">≡</span><div><strong>{item.action.replaceAll('_',' ')}</strong><small>{item.target_type}{item.target_id?` · ${item.target_id}`:''}</small></div><time>{new Date(item.created_at).toLocaleString()}</time></div>)}</div>:<EmptyState title="No admin activity yet" text="Administrative changes will be recorded here."/>}</article><article className="panel admin-health-card"><span className="eyebrow">System posture</span><h2>Ready for controlled rollout</h2><p>Authentication, RLS and audit foundations are active. Provider credentials and monitoring must be completed before production traffic.</p><a className="primary-button" href="/admin/integrations">Review integrations</a></article></section></>
}

async function Integrations() {
  const db=getServiceClient()
  if(!db) return <MissingConfiguration/>
  const [{data:integrations},{data:channels}]=await Promise.all([db.from('platform_integrations').select('provider,display_name,category,status,environment,last_checked_at,error_message').order('category'),db.from('channels').select('provider,status')])
  const fallback=[['supabase','Supabase','core'],['vercel','Vercel','core'],['whatsapp','WhatsApp Business','channel'],['ai_gateway','Vercel AI Gateway','ai'],['google_calendar','Google Calendar','calendar'],['stripe','Stripe','payments'],['hubspot','HubSpot','crm'],['shopify','Shopify','commerce'],['webhooks','API & Webhooks','developer']].map(([provider,display_name,category])=>({provider,display_name,category,status:'not_configured',environment:'production',last_checked_at:null,error_message:null}))
  const rows=integrations?.length?integrations:fallback
  const counts={healthy:rows.filter(x=>x.status==='healthy').length,degraded:rows.filter(x=>x.status==='degraded'||x.status==='outage').length,pending:rows.filter(x=>x.status==='not_configured').length,connections:(channels||[]).filter(x=>x.status==='active').length}
  return <><AdminHeader eyebrow="Infrastructure" title="Integrations" description="Monitor provider health, workspace connections and production readiness." action={<button className="secondary-button">Run health checks</button>}/><section className="metric-grid"><article className="metric-card"><span>Healthy providers</span><strong>{counts.healthy}</strong><small>Operational</small></article><article className="metric-card"><span>Degraded or down</span><strong>{counts.degraded}</strong><small>Needs attention</small></article><article className="metric-card"><span>Not configured</span><strong>{counts.pending}</strong><small>Before launch</small></article><article className="metric-card"><span>Active connections</span><strong>{counts.connections}</strong><small>Across workspaces</small></article></section><section className="admin-integration-grid">{rows.map(item=>{const connected=(channels||[]).filter(c=>c.provider===item.provider&&c.status==='active').length;return <article className="panel admin-integration-card" key={item.provider}><header><span className="integration-logo">{item.display_name.slice(0,1)}</span><div><h3>{item.display_name}</h3><small>{item.category} · {item.environment}</small></div><span className={`integration-status ${item.status}`}>{item.status.replace('_',' ')}</span></header><div className="integration-meta"><span><b>{connected}</b> workspace connections</span><span><b>{item.last_checked_at?new Date(item.last_checked_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</b> last check</span></div>{item.error_message&&<p className="integration-error">{item.error_message}</p>}<button className="secondary-button">View configuration</button></article>})}</section></>
}

function MissingConfiguration(){return <><AdminHeader eyebrow="Configuration required" title="Connect server credentials" description="The superadmin UI is protected, but cross-workspace data requires the Supabase secret key on the server."/><article className="panel admin-callout"><span className="icon-box">◆</span><div><h2>SUPABASE_SECRET_KEY is missing</h2><p>Add it to the local or Vercel server environment. Never expose this value as a NEXT_PUBLIC variable.</p></div></article></>}

function Placeholder({section}:{section:Section}){const title=section.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');return <><AdminHeader eyebrow="Superadmin" title={title} description="This Figma Make admin module is registered in the production navigation."/><article className="panel"><EmptyState title={`${title} is staged`} text="Route protection and layout are ready. Data operations will be connected in the next implementation slice."/></article></>}
