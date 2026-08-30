'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const slug = useMemo(() => customSlug || slugify(name), [customSlug, name])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      router.push('/login')
      return
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (membershipError || !membership) {
      setMessage(membershipError?.message || 'Your workspace is still being provisioned. Try again.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        name: name.trim(),
        slug,
        updated_at: new Date().toISOString()
      })
      .eq('id', membership.organization_id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main style={{ maxWidth: 620, margin: '60px auto', padding: 24 }}>
      <div className="eyebrow">Workspace setup</div>
      <h1>Tell CONVOOPS about your business</h1>
      <p className="muted">Your private workspace and first AI employee are already provisioned. Add your business identity to continue.</p>

      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <label>
          <div className="label">Business name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} style={{ width: '100%', padding: 12 }} placeholder="Example: Oslo Auto Service" />
        </label>

        <label>
          <div className="label">Workspace ID</div>
          <input value={slug} onChange={(e) => setCustomSlug(slugify(e.target.value))} required minLength={3} style={{ width: '100%', padding: 12 }} />
        </label>

        <div className="card" style={{ padding: 14 }}>
          <div className="label">Your first AI employee</div>
          <strong>Maya · AI Receptionist</strong>
          <p className="muted" style={{ marginBottom: 0 }}>Answers questions, captures leads and hands off when authority or information is missing.</p>
        </div>

        <button className="button" disabled={loading} type="submit">
          {loading ? 'Saving workspace…' : 'Continue to dashboard'}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
    </main>
  )
}
