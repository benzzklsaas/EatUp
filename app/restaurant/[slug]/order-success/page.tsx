'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getBrand, paletteVars, FONT } from '@/lib/brand'
import { brandCss } from '@/lib/brand-styles'

export default function OrderSuccessPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const router = useRouter()

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

  const brand = getBrand(slug)
  const p = brand.palette
  const cssVars = paletteVars(p) as React.CSSProperties

  const CSS = brandCss() + `
    .cn-done { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
    .cn-card { background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 12px; padding: 26px 20px; }
    .cn-done__num { font-family: ${FONT.mono}; font-size: clamp(26px, 8vw, 34px); margin: 8px 0 0; }
  `

  return (
    <div className="cn" style={cssVars}>
      <style>{CSS}</style>
      <div className="cn-done">
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="cn-card">
            <span className="cn-pill cn-pill--open"><span className="cn-pill__dot" />Paiement confirmé</span>

            <p className="cn-eyebrow" style={{ margin: '20px 0 0' }}>Votre numéro</p>
            <p className="cn-done__num">{orderNumber}</p>

            <p style={{ fontSize: 15, color: p.dim, margin: '20px 0 0', lineHeight: 1.55 }}>
              Votre commande est partie en cuisine. Un email de confirmation vient d&apos;arriver —
              présentez ce numéro au comptoir pour le retrait.
            </p>
          </div>

          {orderNumber && (
            <button className="cn-btn cn-btn--block" style={{ marginTop: 14 }} onClick={() => router.push(`/suivi/${orderNumber}`)}>
              Suivre ma commande
            </button>
          )}
          <button className="cn-btn cn-btn--ghost cn-btn--block" style={{ marginTop: 10 }} onClick={() => router.push(`/restaurant/${slug}`)}>
            Retour à la carte
          </button>
        </div>
      </div>
    </div>
  )
}
