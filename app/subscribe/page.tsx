'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubscribe() {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'launch' }),
      })
      const data = await res.json()
      if (data.error || !data.url) {
        setErr(data.error || 'Erreur inattendue, réessayez.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setErr('Erreur réseau, réessayez.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Image src="/LogoEatUp.PNG" alt="EatUp" width={64} height={64} style={{ borderRadius: '50%', margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1A1208', letterSpacing: '-1px', margin: '0 0 8px' }}>Activez votre restaurant</h1>
        <p style={{ fontSize: 15, color: '#78716C', margin: 0 }}>Commencez à recevoir des commandes dès aujourd'hui</p>
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          borderRadius: 24, padding: '40px 32px',
          background: 'white',
          border: '2px solid #f97316',
          boxShadow: '0 0 0 8px rgba(249,115,22,0.06), 0 20px 60px rgba(249,115,22,0.1)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: '#f97316', padding: '4px 20px', borderRadius: 100,
            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: 'white',
          }}>
            SANS ENGAGEMENT
          </div>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 64, fontWeight: 900, color: '#1A1208', letterSpacing: '-2px', lineHeight: 1 }}>29,99</span>
              <span style={{ fontSize: 20, color: '#A8A29E' }}>€/mois</span>
            </div>
            <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>Sans engagement · Résiliable à tout moment</p>
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
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#44403C' }}>
                <span style={{ color: '#f97316', fontSize: 16, fontWeight: 800 }}>✓</span> {f}
              </li>
            ))}
          </ul>

          {err && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? '#D1C5BD' : '#f97316',
              color: 'white', fontWeight: 700, fontSize: 16,
              boxShadow: loading ? 'none' : '0 8px 30px rgba(249,115,22,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Redirection...' : 'Commencer maintenant →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#A8A29E', marginTop: 16 }}>
            Résiliable à tout moment · Paiement sécurisé Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
