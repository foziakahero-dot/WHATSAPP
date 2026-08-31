'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('Kontrollerer invitasjonen…')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const completeInvite = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const errorDescription = hash.get('error_description')

      if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
        return
      }

      const supabase = createClient({ detectSessionInUrl: false })
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (error) {
          setMessage('Invitasjonslenken er ugyldig eller utløpt. Be om en ny invitasjon.')
          return
        }
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        setMessage('Invitasjonslenken er ugyldig eller utløpt. Be om en ny invitasjon.')
        return
      }

      setReady(true)
      setMessage('')
    }

    void completeInvite()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passordene er ikke like.')
      return
    }

    setLoading(true)
    setMessage('')
    const supabase = createClient({ detectSessionInUrl: false })
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
      <h1>Godta invitasjonen</h1>
      <p className="muted">Velg et sikkert passord for eierkontoen.</p>

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
