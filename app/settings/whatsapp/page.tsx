'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WhatsAppSettingsPage() {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push('/login')
        return
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!membership) {
        router.push('/setup')
        return
      }

      setOrganizationId(membership.organization_id)

      const { data: channel } = await supabase
        .from('channels')
        .select('phone_number_id, display_phone_number, status')
        .eq('organization_id', membership.organization_id)
        .eq('provider', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (channel) {
        setPhoneNumberId(channel.phone_number_id || '')
        setDisplayPhoneNumber(channel.display_phone_number || '')
        setStatus(channel.status)
      }
    })()
  }, [router])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!organizationId) return

    setLoading(true)
    setStatus('')
    const supabase = createClient()

    const { error } = await supabase
      .from('channels')
      .upsert(
        {
          organization_id: organizationId,
          provider: 'whatsapp',
          phone_number_id: phoneNumberId.trim(),
          display_phone_number: displayPhoneNumber.trim() || null,
          status: 'active',
          metadata: { configured_from: 'dashboard' }
        },
        { onConflict: 'provider,phone_number_id' }
      )

    if (error) {
      setStatus(error.message)
      setLoading(false)
      return
    }

    const { error: agentError } = await supabase
      .from('agents')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('status', 'draft')

    if (agentError) setStatus(agentError.message)
    else setStatus('active')

    setLoading(false)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">CONVO<span>OPS</span></div>
        <nav className="nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/inbox">Inbox</Link>
          <Link href="/onboarding">AI Agent</Link>
          <Link href="/settings/whatsapp">WhatsApp</Link>
        </nav>
      </aside>
      <main>
        <div className="eyebrow">Channel setup</div>
        <h2>Connect WhatsApp Business</h2>
        <p className="muted">Register the Phone Number ID from Meta. Tokens and app secrets stay server-side and are never stored in this form.</p>

        <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 16, maxWidth: 680, marginTop: 20 }}>
          <label>
            <div className="label">WhatsApp Phone Number ID</div>
            <input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} required style={{ width: '100%', padding: 12 }} placeholder="Meta Phone Number ID" />
          </label>

          <label>
            <div className="label">Display phone number</div>
            <input value={displayPhoneNumber} onChange={(e) => setDisplayPhoneNumber(e.target.value)} style={{ width: '100%', padding: 12 }} placeholder="+47 …" />
          </label>

          <button className="button" type="submit" disabled={loading || !organizationId}>
            {loading ? 'Saving…' : 'Save WhatsApp channel'}
          </button>

          {status ? (
            <p className={status === 'active' ? 'status' : 'muted'}>
              {status === 'active' ? 'WhatsApp channel registered and Maya activated. Server credentials are the final connection step.' : status}
            </p>
          ) : null}
        </form>

        <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
          <div className="label">Webhook path</div>
          <code>/api/webhooks/whatsapp</code>
          <p className="muted" style={{ marginBottom: 0 }}>Use your deployed CONVOOPS domain plus this path in Meta Webhooks.</p>
        </div>
      </main>
    </div>
  )
}
