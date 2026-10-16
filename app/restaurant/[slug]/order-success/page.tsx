'use client'

import Link from 'next/link'
import { Suspense, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ReceiptIcon } from '@/components/eatup/icons'

// Retour de Stripe Checkout (flux de paiement en ligne, non activé dans le checkout actuel).
// Cette page n'affirme pas que le paiement a réussi : l'état réel (orders.payment_status,
// mis à jour par le webhook Stripe) est affiché sur la page de suivi.

function OrderSuccess() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (orderNumber && sessionId) {
      // La route vérifie elle-même auprès de Stripe que la session est payée avant d'envoyer les emails.
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, sessionId }),
      }).catch(() => {})
    }
    try {
      window.localStorage.removeItem(`cart_${slug}`)
      window.localStorage.removeItem(`eatup_cart_v2_${slug}`)
    } catch { /* stockage indisponible */ }
  }, [orderNumber, searchParams, slug])

  return (
    <div className="eu-app grid place-items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full bg-brand text-brand-ink" style={{ animation: 'eu-pop-in .5s var(--eu-ease-spring) both' }}>
          <ReceiptIcon size={34} />
        </span>
        <h1 className="mt-6 font-display text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Commande enregistrée</h1>
        <p className="mt-2 text-[15px] text-muted">Nous vérifions la confirmation de paiement. Le statut à jour est visible sur la page de suivi.</p>
        {orderNumber && (
          <p className="eu-num mt-6 rounded-2xl bg-white px-5 py-3 font-mono text-[22px] font-bold tracking-[0.06em] shadow-[var(--eu-shadow-card)]">{orderNumber}</p>
        )}
        <div className="mt-7 flex w-full flex-col gap-2">
          {orderNumber && (
            <Link href={`/suivi/${encodeURIComponent(orderNumber)}`} className="eu-press flex h-12 items-center justify-center rounded-2xl bg-brand text-[15px] font-semibold text-brand-ink">
              Suivre ma commande
            </Link>
          )}
          <Link href={`/restaurant/${slug}`} className="eu-press flex h-12 items-center justify-center rounded-2xl text-[15px] font-semibold">
            Retour à la carte
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="eu-app" />}>
      <OrderSuccess />
    </Suspense>
  )
}
