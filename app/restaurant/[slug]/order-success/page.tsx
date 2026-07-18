'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function OrderSuccessPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function notify() {
      if (!orderNumber) return
      const sessionId = searchParams.get('session_id')
      if (!sessionId) return
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber, sessionId }),
        })
      } catch (_) {}
    }
    notify()
    localStorage.removeItem(`cart_${slug}`)
  }, [orderNumber])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* Icône succès */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.3)' }}>
          ✅
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 10px' }}>Paiement confirmé !</h1>
        <p style={{ fontSize: 15, color: '#4b5563', margin: '0 0 32px', lineHeight: 1.6 }}>
          Votre commande a été reçue et payée avec succès.
        </p>

        {/* Numéro de commande */}
        <div style={{ borderRadius: 20, padding: '24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Numéro de commande</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#4ade80', letterSpacing: '-1px', margin: 0 }}>{orderNumber}</p>
        </div>

        <div style={{ borderRadius: 16, padding: '16px 20px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 32, textAlign: 'left' }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            📧 Un email de confirmation a été envoyé.<br />
            🛍️ Présentez ce numéro lors du retrait de votre commande.
          </p>
        </div>

        <button onClick={() => router.push(`/restaurant/${slug}`)} style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
          Retour au menu
        </button>
      </div>
    </div>
  )
}
