import Link from 'next/link'

const groups = [
  ['Operations', [['Overview', '/app/overview', '⌂'], ['Inbox', '/app/inbox', '◎'], ['Leads', '/app/leads', '◇'], ['Bookings', '/app/bookings', '□']]],
  ['AI workforce', [['AI Employees', '/app/ai-employee', '✦'], ['Knowledge', '/app/knowledge', '≡'], ['Automations', '/app/automations', '⌁'], ['Owner Copilot', '/app/copilot', '✧']]],
  ['Connect', [['Integrations', '/app/integrations', '⊕']]],
  ['Insights', [['Analytics', '/app/analytics', '↗']]],
  ['Workspace', [['Team & Roles', '/app/team', '♙'], ['Billing & Usage', '/app/billing', '◫'], ['Settings', '/app/settings', '⚙']]]
] as const

export function AppShell({ active, workspace, role, children }: { active: string; workspace: string; role: string; children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link href="/app/overview" className="brand">CONVO<span>OPS</span></Link>
      <nav className="app-nav" aria-label="Workspace navigation">
        {groups.map(([label, links]) => <div className="nav-group" key={label}>
          <div className="nav-label">{label}</div>
          {links.map(([name, href, icon]) => <Link key={href} href={href} className={active === href.split('/').pop() ? 'active' : ''}>
            <span aria-hidden>{icon}</span><span>{name}</span>
          </Link>)}
        </div>)}
      </nav>
      <div className="workspace-card"><span className="plan-pill">Growth plan</span><strong>{workspace}</strong><small>Usman Ahmad · {role}</small></div>
    </aside>
    <main className="app-main">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {groups[0][1].slice(0, 4).map(([name, href, icon]) => <Link key={href} href={href} className={active === href.split('/').pop() ? 'active' : ''}><span>{icon}</span><small>{name}</small></Link>)}
      <Link href="/app/settings" className={active === 'settings' ? 'active' : ''}><span>⚙</span><small>More</small></Link>
    </nav>
  </div>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span>✦</span><h3>{title}</h3><p>{text}</p></div>
}
