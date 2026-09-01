'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { getBrand, paletteVars, FONT, ARCH } from '@/lib/brand'
import { brandCss } from '@/lib/brand-styles'

// Les trois temps de la commande, dits avec la voix de la maison.
const STEPS = [
  { key: 'pending',   label: 'Reçue',   desc: 'Le comptoir a votre bon de commande.' },
  { key: 'preparing', label: 'Au four', desc: 'Ça cuit. Encore quelques minutes.' },
  { key: 'ready',     label: 'Prête',   desc: 'Passez au comptoir, elle vous attend.' },
]

const price = (n: number) => Number(n).toFixed(2).replace('.', ',')

export default function SuiviPage() {
  const params = useParams()
  const orderNumber = Array.isArray(params.orderNumber) ? params.orderNumber[0] : params.orderNumber as string
  const supabase = createClient()

  const [order, setOrder] = useState<any>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from('orders').select('*, restaurants(*)').eq('order_number', orderNumber).single()
      if (!o) { setNotFound(true); setLoading(false); return }
      setOrder(o); setRestaurant(o.restaurants); setLoading(false)
      const channel = supabase.channel(`suivi-${o.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${o.id}` }, (payload) => {
          setOrder((prev: any) => ({ ...prev, ...payload.new }))
        }).subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    const cleanup = load()
    return () => { cleanup?.then(fn => fn?.()) }
  }, [orderNumber])

  const brand = getBrand(restaurant?.slug, restaurant?.name || '')
  const p = brand.palette
  const cssVars = paletteVars(p) as React.CSSProperties

  const CSS = brandCss() + `
    .cn-track { max-width: 480px; margin: 0 auto; padding: 28px 16px 48px; min-height: 100vh;
      display: flex; flex-direction: column; justify-content: center; }
    .cn-track__head { display: flex; align-items: center; gap: 11px; margin-bottom: 30px; }
    .cn-track__name { font-family: ${FONT.display}; font-weight: 700; font-size: 17px; }
    .cn-track__ref { font-family: ${FONT.mono}; font-size: 12px; color: var(--cn-dim); margin-left: auto; }

    .cn-state__v { font-family: ${FONT.display}; font-weight: 800; font-size: clamp(40px, 13vw, 62px);
      line-height: 1; letter-spacing: -.035em; margin: 12px 0 0; }
    .cn-state__d { font-size: 17px; line-height: 1.45; color: var(--cn-dim); margin: 12px 0 0; max-width: 26ch; }

    /* Les trois temps : des arches qui se remplissent, dans l'ordre */
    .cn-steps { margin: 32px 0 0; }
    .cn-step-row { display: flex; align-items: center; gap: 13px; padding: 14px 0; border-bottom: 1px solid var(--cn-line); }
    .cn-step-row:first-child { border-top: 1px solid var(--cn-line); }
    .cn-mark { width: 19px; height: 25px; border-radius: ${ARCH}; flex-shrink: 0;
      border: 1.5px solid var(--cn-line); background: transparent; }
    .cn-mark--done { background: var(--cn-fresh); border-color: var(--cn-fresh); }
    .cn-mark--now { background: var(--cn-hot); border-color: var(--cn-hot); animation: cn-heat 1.7s ease-in-out infinite; }
    .cn-step-row__l { font-size: 15px; color: var(--cn-dim); }
    .cn-step-row--on .cn-step-row__l { color: var(--cn-text); font-weight: 600; }
    .cn-step-row__t { font-family: ${FONT.mono}; font-size: 12px; color: var(--cn-dim); margin-left: auto; }
    @keyframes cn-heat { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }

    .cn-recap { background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 12px; padding: 18px 16px; margin-top: 26px; }
  `

  if (loading) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <style>{CSS}</style>
      <div className="cn-arch" style={{ width: 26, height: 34, background: p.hot, animation: 'cn-heat 1.4s ease-in-out infinite' }} />
    </div>
  )

  if (notFound) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p className="cn-display" style={{ fontSize: 30, margin: '0 0 8px' }}>Commande introuvable</p>
        <p style={{ color: p.dim, margin: 0 }}>Aucune commande ne porte ce numéro.</p>
      </div>
    </div>
  )

  const currentStep = STEPS.findIndex(s => s.key === order.status)
  const stepIndex = currentStep === -1 ? 0 : currentStep
  const isCompleted = order.status === 'completed' || order.status === 'cancelled'
  const tz = 'Europe/Paris'
  const pickupDate = new Date(order.pickup_time)
  const pickupTimeStr = pickupDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const todayStr = new Date().toLocaleDateString('fr-FR', { timeZone: tz })
  const pickupDayStr = pickupDate.toLocaleDateString('fr-FR', { timeZone: tz })
  const pickupLabel = todayStr === pickupDayStr
    ? `Aujourd'hui ${pickupTimeStr}`
    : pickupDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }) + ` ${pickupTimeStr}`

  const cancelled = order.status === 'cancelled'

  return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh' }}>
      <style>{CSS}</style>

      <main className="cn-track">
        <header className="cn-track__head">
          {restaurant?.logo_url
            ? <img src={restaurant.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            : <span className="cn-arch" style={{ width: 17, height: 23, background: p.hot, display: 'block' }} />
          }
          <span className="cn-track__name">{restaurant?.name}</span>
          <span className="cn-track__ref">{orderNumber}</span>
        </header>

        {!isCompleted ? (
          <section>
            <span className={`cn-pill ${order.status === 'ready' ? 'cn-pill--open' : ''}`}>
              <span className="cn-pill__dot" />
              {order.status === 'ready' ? 'À retirer maintenant' : 'En cours'}
            </span>
            <h1 className="cn-state__v">{STEPS[stepIndex]?.label}</h1>
            <p className="cn-state__d">{STEPS[stepIndex]?.desc}</p>
          </section>
        ) : (
          <section>
            <span className={`cn-pill ${cancelled ? 'cn-pill--shut' : 'cn-pill--open'}`}>
              <span className="cn-pill__dot" />{cancelled ? 'Annulée' : 'Terminée'}
            </span>
            <h1 className="cn-state__v">{cancelled ? 'Annulée' : 'Merci'}</h1>
            <p className="cn-state__d">
              {cancelled ? 'Contactez le restaurant pour en savoir plus.' : 'À très vite au comptoir.'}
            </p>
          </section>
        )}

        {!isCompleted && (
          <div className="cn-steps">
            {STEPS.map((step, i) => {
              const done = i < stepIndex
              const now = i === stepIndex
              return (
                <div key={step.key} className={`cn-step-row${now ? ' cn-step-row--on' : ''}`}>
                  <span className={`cn-mark${done ? ' cn-mark--done' : now ? ' cn-mark--now' : ''}`} />
                  <span className="cn-step-row__l">{step.label}</span>
                  <span className="cn-step-row__t">{done ? 'fait' : now ? 'en cours' : ''}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="cn-recap">
          <div className="cn-recap__row">
            <span className="cn-recap__k">Retrait</span><span className="cn-recap__dots" />
            <span className="cn-recap__v">{pickupLabel}</span>
          </div>
          <div className="cn-recap__row">
            <span className="cn-recap__k">Total</span><span className="cn-recap__dots" />
            <span className="cn-recap__v">{price(order.total_price)}€</span>
          </div>
          <div className="cn-recap__row" style={{ marginBottom: 0 }}>
            <span className="cn-recap__k">Paiement</span><span className="cn-recap__dots" />
            <span className="cn-recap__v">{order.payment_method === 'cash' ? 'Sur place' : 'Payé en ligne'}</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: p.dim, textAlign: 'center', marginTop: 22 }}>
          Cette page se met à jour toute seule.
        </p>
      </main>
    </div>
  )
}
