'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const slug = restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      await supabase.from('restaurants').insert({
        name: restaurantName,
        email,
        owner_id: data.user.id,
        slug,
      })
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex justify-center mb-4">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={100} height={100} className="rounded-full" />
        </div>
        <p className="text-center mb-8 text-sm" style={{ color: '#94a3b8' }}>Créez votre compte restaurant</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Nom du restaurant</label>
            <input
              type="text"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              placeholder="Mon Restaurant"
              required
            />
          </div>

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
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#64748b' }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="font-medium" style={{ color: '#60a5fa' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
