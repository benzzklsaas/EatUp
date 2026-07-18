'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as React.CSSProperties,
  card: { width: '100%', maxWidth: 420, borderRadius: 24, padding: '48px 40px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } as React.CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#78716C', marginBottom: 8 } as React.CSSProperties,
  input: { width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={56} height={56} style={{ borderRadius: '50%', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1208', letterSpacing: '-0.5px', margin: '0 0 8px' }}>Bon retour 👋</h1>
          <p style={{ fontSize: 14, color: '#78716C', margin: 0 }}>Connectez-vous à votre restaurant</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required style={S.input} />
          </div>
          <div>
            <label style={S.label}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={S.input} />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '14px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? '#D1C5BD' : '#f97316',
            color: 'white', fontWeight: 700, fontSize: 15,
            boxShadow: loading ? 'none' : '0 8px 30px rgba(249,115,22,0.3)',
          }}>
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#78716C' }}>
          Pas encore de compte ?{' '}
          <Link href="/auth/register" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
            Créer un restaurant
          </Link>
        </p>
      </div>
    </div>
  )
}
