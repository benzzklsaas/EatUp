'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'launch' }),
    })
    const { url, error } = await res.json()
    if (error) { setLoading(false); return }
    window.location.href = url
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Image src="/LogoEatUp.PNG" alt="EatUp" width={64} height={64} style={{ borderRadius: '50%', margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-1px', margin: '0 0 8px' }}>Activez votre restaurant</h1>
        <p style={{ fontSize: 15, color: '#4b5563', margin: 0 }}>Commencez à recevoir des commandes dès aujourd'hui</p>
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          borderRadius: 24, padding: '40px 32px',
          background: 'linear-gradient(145deg, #0f172a, #111827)',
          border: '2px solid rgba(99,102,241,0.5)',
          boxShadow: '0 0 60px rgba(99,102,241,0.1)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '4px 20px', borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: 'white',
          }}>
            OFFRE DE LANCEMENT
          </div>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1 }}>19,99</span>
              <span style={{ fontSize: 20, color: '#6b7280' }}>€/mois</span>
            </div>
            <p style={{ fontSize: 14, color: '#818cf8', fontWeight: 600, margin: '0 0 4px' }}>pendant les 2 premiers mois</p>
            <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>puis 29,99€/mois · Sans engagement</p>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Menu en ligne illimité',
              'Commandes click & collect',
              'Paiement en ligne Stripe',
              'Dashboard & analytics',
              'Emails de confirmation automatiques',
              'Gestion des horaires & fermetures',
              'Support par email',
            ].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#9ca3af' }}>
                <span style={{ color: '#818cf8', fontSize: 16, fontWeight: 800 }}>✓</span> {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: 16,
              boxShadow: loading ? 'none' : '0 8px 30px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Redirection...' : 'Commencer pour 19,99€/mois →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#1f2937', marginTop: 16 }}>
            Résiliable à tout moment · Paiement sécurisé Stripe
          </p>
        </div>
      </div>

    </div>
  )
}
