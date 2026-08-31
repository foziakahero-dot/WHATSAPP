'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('Kontrollerer invitasjonen…')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setMessage('Invitasjonslenken er ugyldig eller utløpt. Be om en ny invitasjon.')
        return
      }
      setReady(true)
      setMessage('')
    })
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passordene er ikke like.')
      return
    }

    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.replace('/admin/overview')
    router.refresh()
  }

  return (
    <main style={{ maxWidth: 480, margin: '70px auto', padding: 24 }}>
      <div className="eyebrow">CONVOOPS SUPERADMIN</div>
      <h1>Velg passord</h1>
      <p className="muted">Fullfør eierkontoen før du åpner admin-panelet.</p>

      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        <label>
          <div className="label">Nytt passord</div>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
            disabled={!ready || loading}
            style={{ width: '100%', padding: 12 }}
          />
        </label>
        <label>
          <div className="label">Gjenta passord</div>
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
            disabled={!ready || loading}
            style={{ width: '100%', padding: 12 }}
          />
        </label>
        <button className="button" disabled={!ready || loading} type="submit">
          {loading ? 'Lagrer…' : 'Lagre passord og åpne admin'}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
    </main>
  )
}
