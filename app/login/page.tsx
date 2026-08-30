'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setMessage(error.message)
      } else if (data.session) {
        router.push('/setup')
      } else {
        setMessage('Check your email to confirm your account, then continue.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 480, margin: '70px auto', padding: 24 }}>
      <div className="eyebrow">CONVOOPS</div>
      <h1>{mode === 'signup' ? 'Create your workspace' : 'Welcome back'}</h1>
      <p className="muted">Your AI employee starts with WhatsApp and grows with your business.</p>

      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        <label>
          <div className="label">Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: 12 }} />
        </label>
        <label>
          <div className="label">Password</div>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required style={{ width: '100%', padding: 12 }} />
        </label>
        <button className="button" disabled={loading} type="submit">
          {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>

      <button
        onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        style={{ marginTop: 16, background: 'transparent', border: 0, cursor: 'pointer' }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}
      </button>
    </main>
  )
}
