import Link from 'next/link'

export default function Inbox(){
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">CONVO<span>OPS</span></div>
      <nav className="nav">
        <Link href="/dashboard">Overview</Link>
        <Link href="/inbox">Inbox</Link>
        <Link href="/onboarding">AI Agent</Link>
      </nav>
    </aside>
    <main>
      <div className="eyebrow">Shared inbox</div>
      <h2>Customer conversations</h2>
      <div className="card">
        <strong>Maria Rodriguez</strong>
        <p className="label">WhatsApp · Spanish detected</p>
        <p>Can I book tomorrow at 14:00?</p>
        <p><strong>AI:</strong> Yes — I found an available slot. Shall I reserve it for you?</p>
      </div>
    </main>
  </div>
}
