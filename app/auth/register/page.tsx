'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [form, setForm] = useState({
    restaurantName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const slug = form.restaurantName
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const { error: restoError } = await supabase.from('restaurants').insert({
        name: form.restaurantName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        description: form.description,
        owner_id: data.user.id,
        slug,
      })

      if (restoError) {
        setError('Erreur création restaurant : ' + restoError.message)
        setLoading(false)
        return
      }
    }

    router.push('/subscribe')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-lg rounded-2xl p-8" style={{ background: '#1e293b', border: '1px solid #334155' }}>

        <div className="flex justify-center mb-3">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={64} height={64} className="rounded-full" />
        </div>
        <h1 className="text-center text-xl font-bold text-white mb-1">Créez votre restaurant</h1>
        <p className="text-center text-sm mb-8" style={{ color: '#64748b' }}>Rejoignez EatUp et commencez à recevoir des commandes</p>

        <form onSubmit={handleRegister} className="space-y-4">

          {/* Infos restaurant */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Votre restaurant</p>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Nom du restaurant *</label>
              <input
                type="text"
                value={form.restaurantName}
                onChange={e => update('restaurantName', e.target.value)}
                placeholder="Crousty Naan"
                required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="13 rue Jean Mermoz, Bordeaux"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="05 56 00 00 00"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Description courte</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Cuisine indienne, spécialités tandoor..."
                rows={2}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>
          </div>

          {/* Compte */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Votre compte</p>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition disabled:opacity-50"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            {loading ? 'Création...' : 'Créer mon restaurant →'}
          </button>

          <p className="text-center text-xs" style={{ color: '#475569' }}>
            Après inscription, vous choisirez votre offre d'abonnement.
          </p>
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
