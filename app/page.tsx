import Link from 'next/link'

export default function Home() {
  return <main>
    <section className="hero">
      <div className="eyebrow">Conversational Operations</div>
      <h1>Talk. Act. Done.</h1>
      <p className="sub">CONVOOPS gives businesses an AI employee inside WhatsApp that answers, qualifies, books, follows up and hands off to humans when needed.</p>
      <Link className="cta" href="/dashboard">Open MVP dashboard →</Link>
    </section>
  </main>
}
