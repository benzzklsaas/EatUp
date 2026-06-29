'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex justify-center mb-4">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={100} height={100} className="rounded-full" />
        </div>
        <p className="text-center mb-8 text-sm" style={{ color: '#94a3b8' }}>Connectez-vous à votre restaurant</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold transition disabled:opacity-50"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#64748b' }}>
          Pas encore de compte ?{' '}
          <Link href="/auth/register" className="font-medium" style={{ color: '#60a5fa' }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
