import Link from 'next/link'

const metrics = [
  ['Conversations','47'],
  ['Qualified leads','12'],
  ['Bookings','7'],
  ['AI resolved','82%']
]

export default function Dashboard(){
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
      <div className="eyebrow">Today</div>
      <h2>Operations overview</h2>
      <div className="grid">
        {metrics.map(([k,v]) => <div className="card" key={k}><div className="label">{k}</div><div className="metric">{v}</div></div>)}
      </div>
      <div className="card" style={{marginTop:16}}>
        <div className="label">Recent AI actions</div>
        <table className="table">
          <thead><tr><th>Customer</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Maria</td><td>Appointment booked</td><td className="status">Completed</td></tr>
            <tr><td>Daniel</td><td>Lead qualified</td><td className="status">Completed</td></tr>
            <tr><td>Sofia</td><td>Human handoff</td><td>Waiting</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
}
