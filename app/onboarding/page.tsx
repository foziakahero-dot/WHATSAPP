import Link from 'next/link'

export default function Onboarding(){
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
      <div className="eyebrow">Agent setup</div>
      <h2>Meet your AI employee</h2>
      <div className="card">
        <p><strong>Maya</strong> · Receptionist & Booking</p>
        <p className="label">Permissions</p>
        <p>✓ Answer questions<br/>✓ Qualify leads<br/>✓ Create bookings<br/>✓ Send follow-ups<br/>✓ Detect and speak customer language<br/>✓ Escalate to a human</p>
      </div>
    </main>
  </div>
}
