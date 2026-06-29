'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(plan: 'launch' | 'standard') {
    setLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url, error } = await res.json()
    if (error) { setLoading(null); return }
    window.location.href = url
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0f172a' }}>
      <div className="mb-8 text-center">
        <Image src="/LogoEatUp.PNG" alt="EatUp" width={80} height={80} className="rounded-full mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">Choisissez votre offre</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Activez votre restaurant sur EatUp</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Offre lancement */}
        <div className="rounded-2xl p-6 relative" style={{ background: '#1e293b', border: '2px solid #3b82f6' }}>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#3b82f6', color: 'white' }}>
            OFFRE DE LANCEMENT
          </span>
          <h2 className="font-bold text-white text-lg mt-2">EatUp Starter</h2>
          <div className="my-4">
            <span className="text-4xl font-bold text-white">19,99€</span>
            <span style={{ color: '#64748b' }}>/mois</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm" style={{ color: '#94a3b8' }}>
            {['Menu en ligne illimité', 'Commandes click & collect', 'Dashboard analytics', 'Gestion clients', 'Support par email'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span style={{ color: '#3b82f6' }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('launch')}
            disabled={loading !== null}
            className="w-full py-3 rounded-xl font-bold transition disabled:opacity-50"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            {loading === 'launch' ? 'Redirection...' : 'Commencer pour 19,99€/mois'}
          </button>
        </div>

        {/* Offre standard */}
        <div className="rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white text-lg mt-2">EatUp Pro</h2>
          <div className="my-4">
            <span className="text-4xl font-bold text-white">29,99€</span>
            <span style={{ color: '#64748b' }}>/mois</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm" style={{ color: '#94a3b8' }}>
            {['Tout EatUp Starter', 'Paiement en ligne Stripe', 'Emails automatiques', 'Analytics avancés', 'Support prioritaire'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span style={{ color: '#10b981' }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('standard')}
            disabled={loading !== null}
            className="w-full py-3 rounded-xl font-bold transition disabled:opacity-50"
            style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}
          >
            {loading === 'standard' ? 'Redirection...' : 'Passer à Pro — 29,99€/mois'}
          </button>
        </div>
      </div>

      <button onClick={() => router.push('/dashboard')} className="mt-8 text-sm" style={{ color: '#475569' }}>
        Retour au dashboard
      </button>
    </div>
  )
}
