'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getBrand, FONT, perforation } from '@/lib/brand'
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
  const cssVars = {
    '--cn-ink': p.ink, '--cn-char': p.char, '--cn-char-up': p.charUp, '--cn-line': p.line,
    '--cn-dough': p.dough, '--cn-dough-dim': p.doughDim, '--cn-paper': p.paper,
    '--cn-paper-ink': p.paperInk, '--cn-hot': p.hot, '--cn-accent': p.accent,
    '--cn-accent-ink': p.accentInk, '--cn-fresh': p.fresh,
  } as React.CSSProperties

  const CSS = brandCss() + `
    .cn-done { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 14px; }
    .cn-sheetpaper {
      position: relative; background: var(--cn-paper); color: var(--cn-paper-ink);
      padding: 34px 22px 34px;
    }
    .cn-sheetpaper__top, .cn-sheetpaper__bot { position: absolute; left: 0; right: 0; height: 12px; }
    .cn-sheetpaper__top { top: 0; }
    .cn-sheetpaper__bot { bottom: 0; }
    .cn-kicker { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; opacity: .55; margin: 0 0 7px; }
    .cn-done__num { font-family: ${FONT.display}; font-size: clamp(30px, 10vw, 52px); margin: 12px 0 0; }
  `

  return (
    <div className="cn" style={cssVars}>
      <style>{CSS}</style>
      <div className="cn-done">
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div className="cn-sheetpaper">
            <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <p className="cn-kicker" style={{ margin: 0 }}>Commande payée</p>
              <span className="cn-stamp" style={{ color: p.fresh, flexShrink: 0, marginTop: -4 }}>Réglé</span>
            </div>
            <p className="cn-display cn-done__num">{orderNumber}</p>

            <p className="cn-ed" style={{ fontSize: 15, lineHeight: 1.6, margin: '24px 0 0', opacity: .75 }}>
              Votre commande est partie en cuisine. Un email de confirmation vient d&apos;arriver dans votre boîte.
            </p>
            <p className="cn-mono" style={{ fontSize: 9.5, letterSpacing: '.14em', margin: '16px 0 0', opacity: .55, lineHeight: 1.8 }}>
              Présentez ce numéro au comptoir
            </p>

            <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
          </div>

          {orderNumber && (
            <button className="cn-confirm" style={{ marginTop: 14 }} onClick={() => router.push(`/suivi/${orderNumber}`)}>
              <span>Suivre ma commande</span>
              <span>→</span>
            </button>
          )}
          <button
            onClick={() => router.push(`/restaurant/${slug}`)}
            className="cn-mono"
            style={{ width: '100%', marginTop: 10, padding: '14px', background: 'transparent', border: `1px solid ${p.line}`, color: p.doughDim, fontSize: 10, cursor: 'pointer' }}
          >
            Retour à la carte
          </button>
        </div>
      </div>
    </div>
  )
}
