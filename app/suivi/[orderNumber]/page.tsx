'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { getBrand, FONT, ARCH, perforation } from '@/lib/brand'
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
  const cssVars = {
    '--cn-ink': p.ink, '--cn-char': p.char, '--cn-char-up': p.charUp, '--cn-line': p.line,
    '--cn-dough': p.dough, '--cn-dough-dim': p.doughDim, '--cn-paper': p.paper,
    '--cn-paper-ink': p.paperInk, '--cn-hot': p.hot, '--cn-accent': p.accent,
    '--cn-accent-ink': p.accentInk, '--cn-fresh': p.fresh,
  } as React.CSSProperties

  const CSS = brandCss() + `
    .cn-track { max-width: 480px; margin: 0 auto; padding: 32px 18px 48px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }

    .cn-track__head { display: flex; align-items: center; gap: 12px; margin-bottom: 34px; }
    .cn-track__name { font-family: ${FONT.display}; font-size: 20px; text-transform: uppercase; }
    .cn-track__ref { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .16em; color: var(--cn-dough-dim); text-transform: uppercase; margin-left: auto; }

    /* L'état, dit en grand */
    .cn-state__k { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--cn-accent); margin: 0; }
    .cn-state__v { font-family: ${FONT.display}; font-size: clamp(46px, 15vw, 74px); text-transform: uppercase; line-height: .88; margin: 10px 0 0; }
    .cn-state__d { font-family: ${FONT.editorial}; font-style: italic; font-size: 17px; line-height: 1.45; color: var(--cn-dough-dim); margin: 14px 0 0; max-width: 24ch; }

    /* Les trois temps, marqués par des arches qui se remplissent */
    .cn-steps { margin: 36px 0 0; border-top: 1px solid var(--cn-line); }
    .cn-step-row { display: flex; align-items: center; gap: 14px; padding: 15px 0; border-bottom: 1px solid var(--cn-line); }
    .cn-mark { width: 20px; height: 26px; border-radius: ${ARCH}; flex-shrink: 0; border: 1px solid var(--cn-line); }
    .cn-mark--done { background: var(--cn-accent); border-color: var(--cn-accent); }
    .cn-mark--now { background: var(--cn-hot); border-color: var(--cn-hot); animation: cn-heat 1.6s ease-in-out infinite; }
    .cn-step-row__l { font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--cn-dough-dim); }
    .cn-step-row--on .cn-step-row__l { color: var(--cn-dough); }
    .cn-step-row__t { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .1em; color: var(--cn-dough-dim); margin-left: auto; }
    @keyframes cn-heat { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }

    /* Le ticket récapitulatif */
    .cn-recap { position: relative; background: var(--cn-paper); color: var(--cn-paper-ink); padding: 26px 20px; margin-top: 30px; }
    .cn-recap__top, .cn-recap__bot { position: absolute; left: 0; right: 0; height: 12px; }
    .cn-recap__top { top: 0; }
    .cn-recap__bot { bottom: 0; }
    .cn-recap__row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
    .cn-recap__k { font-family: ${FONT.mono}; font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; opacity: .55; }
    .cn-recap__dots { flex: 1; border-bottom: 1px dotted rgba(0,0,0,.3); transform: translateY(-3px); }
    .cn-recap__v { font-family: ${FONT.mono}; font-size: 12.5px; }

    @media (prefers-reduced-motion: reduce) { .cn-mark--now { animation: none } }
  `

  if (loading) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div className="cn-arch" style={{ width: 26, height: 34, background: p.hot, animation: 'cn-heat 1.3s ease-in-out infinite' }} />
      <style>{`@keyframes cn-heat{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  if (notFound) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p className="cn-display" style={{ fontSize: 44, margin: '0 0 12px', color: 'transparent', WebkitTextStroke: `1.5px ${p.line}` }}>Introuvable</p>
        <p className="cn-ed" style={{ fontStyle: 'italic', fontSize: 17, margin: 0, color: p.doughDim }}>Aucune commande ne porte ce numéro.</p>
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
            ? <img src={restaurant.logo_url} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            : <span className="cn-arch" style={{ width: 18, height: 24, background: p.accent, display: 'block' }} />
          }
          <span className="cn-track__name">{restaurant?.name}</span>
          <span className="cn-track__ref">{orderNumber}</span>
        </header>

        {/* L'état du moment */}
        {!isCompleted ? (
          <section>
            <p className="cn-state__k">{order.status === 'ready' ? 'À retirer maintenant' : 'En cours'}</p>
            <h1 className="cn-state__v">{STEPS[stepIndex]?.label}</h1>
            <p className="cn-state__d">{STEPS[stepIndex]?.desc}</p>
          </section>
        ) : (
          <section>
            <p className="cn-state__k" style={{ color: cancelled ? p.hot : p.fresh }}>{cancelled ? 'Annulée' : 'Terminée'}</p>
            <h1 className="cn-state__v">{cancelled ? 'Annulée' : 'Merci'}</h1>
            <p className="cn-state__d">
              {cancelled ? 'Contactez le restaurant pour en savoir plus.' : 'À très vite au comptoir.'}
            </p>
          </section>
        )}

        {/* Les trois temps */}
        {!isCompleted && (
          <div className="cn-steps">
            {STEPS.map((step, i) => {
              const done = i < stepIndex
              const now = i === stepIndex
              return (
                <div key={step.key} className={`cn-step-row${now ? ' cn-step-row--on' : ''}`}>
                  <span className={`cn-mark${done ? ' cn-mark--done' : now ? ' cn-mark--now' : ''}`} />
                  <span className="cn-step-row__l">{step.label}</span>
                  <span className="cn-step-row__t">{done ? 'fait' : now ? 'en cours' : '—'}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Le ticket */}
        <div className="cn-recap">
          <span className="cn-recap__top" style={perforation(p.ink, 'top')} />

          <div className="cn-recap__row">
            <span className="cn-recap__k">Retrait</span>
            <span className="cn-recap__dots" />
            <span className="cn-recap__v">{pickupLabel}</span>
          </div>
          <div className="cn-recap__row">
            <span className="cn-recap__k">Total</span>
            <span className="cn-recap__dots" />
            <span className="cn-recap__v">{price(order.total_price)}€</span>
          </div>
          <div className="cn-recap__row" style={{ marginBottom: 0 }}>
            <span className="cn-recap__k">Paiement</span>
            <span className="cn-recap__dots" />
            <span className="cn-recap__v">{order.payment_method === 'cash' ? 'Sur place' : 'Payé en ligne'}</span>
          </div>

          <span className="cn-recap__bot" style={perforation(p.ink, 'bottom')} />
        </div>

        <p className="cn-mono" style={{ fontSize: 8.5, letterSpacing: '.18em', color: p.doughDim, textAlign: 'center', marginTop: 26, opacity: .7 }}>
          Mise à jour en direct
        </p>
      </main>
    </div>
  )
}
