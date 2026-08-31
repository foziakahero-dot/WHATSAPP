import Link from 'next/link'

const groups = [
  ['Platform', [['Overview','overview','⌂'],['Organizations','organizations','▦'],['Users','users','♙'],['Pilots','pilots','◇']]],
  ['Revenue', [['Subscriptions','subscriptions','◫'],['Plans','plans','▤'],['Revenue','revenue','↗']]],
  ['AI operations', [['AI Employees','ai-employees','✦'],['AI Usage','ai-usage','◎'],['Actions','actions','⌁']]],
  ['Infrastructure', [['Integrations','integrations','⊕'],['WhatsApp','whatsapp','◉'],['System Health','system-health','●'],['Incidents','incidents','△']]],
  ['Governance', [['Security','security','◆'],['Audit Logs','audit-logs','≡'],['Feature Flags','feature-flags','⚑'],['Support','support','?'],['Platform Settings','settings','⚙']]]
] as const

export function AdminShell({ active, role, children }: { active: string; role: string; children: React.ReactNode }) {
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><Link href="/admin/overview" className="brand">CONVO<span>OPS</span></Link><span>SUPERADMIN</span></div><nav>{groups.map(([label,items])=><div className="admin-nav-group" key={label}><div>{label}</div>{items.map(([name,slug,icon])=><Link className={active===slug?'active':''} href={`/admin/${slug}`} key={slug}><span>{icon}</span>{name}</Link>)}</div>)}</nav><div className="admin-identity"><span className="avatar small">U</span><div><strong>Platform admin</strong><small>{role}</small></div></div></aside><main className="admin-main">{children}</main></div>
}

export function AdminHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header admin-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</header>
}
