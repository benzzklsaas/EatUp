'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getBrand, FONT, perforation } from '@/lib/brand'
import { brandCss } from '@/lib/brand-styles'

const price = (n: number) => Number(n).toFixed(2).replace('.', ',')

export default function CheckoutPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [cart, setCart] = useState<any[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [pickupTime, setPickupTime] = useState('')
  const [pickupSlots, setPickupSlots] = useState<string[]>([])
  const [paymentMethod] = useState<'cash'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string; pickupTime: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResto() {
      const { data } = await supabase.from('restaurants').select('id, name, slug, email').eq('slug', slug).single()
      if (data) {
        setRestaurant(data)

        // Valider le panier : ne garder que les produits qui existent vraiment
        const stored = localStorage.getItem(`cart_${slug}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          const ids = [...new Set(parsed.map((i: any) => i.product.id))]
          if (ids.length > 0) {
            const { data: validProducts } = await supabase.from('products').select('id').in('id', ids).eq('restaurant_id', data.id)
            const validIds = new Set((validProducts || []).map((p: any) => p.id))
            const cleaned = parsed.filter((i: any) => validIds.has(i.product.id))
            setCart(cleaned)
          }
        }

        // Récupérer tous les horaires
        const { data: allSchedules } = await supabase
          .from('restaurant_schedule')
          .select('*')
          .eq('restaurant_id', data.id)
          .order('day_of_week')

        const now = new Date()
        // Arrondir à la prochaine dizaine (ex: 13:03 → 13:10)
        const minTime = new Date(now)
        const mins = minTime.getMinutes()
        const nextTen = Math.ceil((mins + 1) / 10) * 10
        minTime.setMinutes(nextTen, 0, 0)
        if (nextTen >= 60) { minTime.setHours(minTime.getHours() + 1); minTime.setMinutes(nextTen - 60, 0, 0) }
        const slots: string[] = []

        // Chercher les créneaux sur les 7 prochains jours
        for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
          const targetDate = new Date(now)
          targetDate.setDate(now.getDate() + dayOffset)
          const dayIndex = (targetDate.getDay() + 6) % 7

          const daySchedule = allSchedules?.find((s: any) => s.day_of_week === dayIndex)
          if (!daySchedule || daySchedule.is_closed) continue

          // Vérifier fermeture exceptionnelle
          const dateStr = targetDate.toISOString().split('T')[0]
          const { data: closure } = await supabase
            .from('restaurant_closures')
            .select('id')
            .eq('restaurant_id', data.id)
            .eq('closed_date', dateStr)
            .single()
          if (closure) continue

          const duration = daySchedule.slot_duration || 10

          function addSlots(openStr: string, closeStr: string) {
            const [oh, om] = openStr.split(':').map(Number)
            const [ch, cm] = closeStr.split(':').map(Number)
            const cur = new Date(targetDate)
            cur.setHours(oh, om, 0, 0)
            const closing = new Date(targetDate)
            closing.setHours(ch, cm, 0, 0)
            while (cur <= closing) {
              if (cur > minTime) slots.push(new Date(cur).toISOString())
              cur.setMinutes(cur.getMinutes() + duration)
            }
          }

          if (daySchedule.opening_time_1 && daySchedule.closing_time_1)
            addSlots(daySchedule.opening_time_1.slice(0, 5), daySchedule.closing_time_1.slice(0, 5))
          if (daySchedule.opening_time_2 && daySchedule.closing_time_2)
            addSlots(daySchedule.opening_time_2.slice(0, 5), daySchedule.closing_time_2.slice(0, 5))

          // Dès qu'on a des créneaux on s'arrête (on ne charge qu'un jour à la fois)
          if (slots.length > 0) break
        }

        if (slots.length > 0) {
          setPickupSlots(slots)
          setPickupTime(slots[0])
        }
      }
    }
    loadResto()
  }, [slug])

  const total = cart.reduce((sum: number, i: any) => sum + (i.product.price + (i.extraPrice || 0)) * i.quantity, 0)

  function generateOrderNumber() {
    return 'EAT-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!restaurant) { setError('Restaurant introuvable — rechargez la page.'); return }
    if (cart.length === 0) { setError('Votre panier est vide — retournez au menu.'); return }
    setLoading(true)

    let orderNumber = generateOrderNumber()

    const items = cart.map((i: any) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      price: i.product.price + (i.extraPrice || 0),
      options: [i.selectedOptions ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ') : '', i.menuBoisson ? `🥤 ${i.menuBoisson}` : '', i.menuAccomp ? `🍟 ${i.menuAccomp}` : ''].filter(Boolean).join(', '),
    }))

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: {
          restaurant_id: restaurant.id,
          order_number: orderNumber,
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          email: form.email,
          total_price: total,
          pickup_time: pickupTime,
          payment_method: paymentMethod,
          payment_status: 'unpaid',
          status: 'pending',
        },
        items,
        emailData: {
          customerEmail: form.email,
          restaurantEmail: restaurant.email,
          restaurantName: restaurant.name,
        },
      }),
    })

    let json = await res.json()
    // Retry si collision sur order_number (très rare)
    if (!res.ok && json.error?.includes('duplicate')) {
      orderNumber = generateOrderNumber()
      const retry = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: { restaurant_id: restaurant.id, order_number: orderNumber, first_name: form.firstName, last_name: form.lastName, phone: form.phone, email: form.email, total_price: total, pickup_time: pickupTime, payment_method: paymentMethod, payment_status: 'unpaid', status: 'pending' },
          items,
          emailData: { customerEmail: form.email, restaurantEmail: restaurant.email, restaurantName: restaurant.name },
        }),
      })
      json = await retry.json()
    }
    if (json.error) { setError('Erreur : ' + json.error); setLoading(false); return }

    localStorage.removeItem(`cart_${slug}`)
    setSuccess({ orderNumber, pickupTime })
    setLoading(false)
  }


  const brand = getBrand(slug, restaurant?.name || '')
  const p = brand.palette
  const cssVars = {
    '--cn-ink': p.ink, '--cn-char': p.char, '--cn-char-up': p.charUp, '--cn-line': p.line,
    '--cn-dough': p.dough, '--cn-dough-dim': p.doughDim, '--cn-paper': p.paper,
    '--cn-paper-ink': p.paperInk, '--cn-hot': p.hot, '--cn-accent': p.accent,
    '--cn-accent-ink': p.accentInk, '--cn-fresh': p.fresh,
  } as React.CSSProperties

  // Le bon de commande : une seule feuille de papier, dentelée en haut et en bas.
  const CSS = brandCss() + `
    .cn-cmd { max-width: 560px; margin: 0 auto; padding: 20px 12px 44px; }
    .cn-sheetpaper {
      position: relative; background: var(--cn-paper); color: var(--cn-paper-ink);
      padding: 30px 20px 28px; margin-bottom: 20px;
    }
    .cn-sheetpaper__top, .cn-sheetpaper__bot { position: absolute; left: 0; right: 0; height: 12px; }
    .cn-sheetpaper__top { top: 0; }
    .cn-sheetpaper__bot { bottom: 0; }
    .cn-kicker { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; opacity: .55; margin: 0 0 7px; }
    /* Un chapeau suivi d'un champ a besoin de respirer, pas d'une ligne de ticket */
    .cn-kicker + .cn-duo, .cn-kicker + .cn-field, .cn-kicker + .cn-slots { margin-top: 16px; }

    .cn-line { display: flex; align-items: baseline; gap: 8px; margin-bottom: 11px; }
    .cn-line__n { font-family: ${FONT.mono}; font-size: 11px; opacity: .5; flex-shrink: 0; }
    .cn-line__name { font-family: ${FONT.editorial}; font-size: 15.5px; }
    .cn-line__dots { flex: 1; border-bottom: 1px dotted rgba(0,0,0,.3); transform: translateY(-3px); min-width: 12px; }
    .cn-line__p { font-family: ${FONT.mono}; font-size: 13px; flex-shrink: 0; }
    .cn-line__opt { font-family: ${FONT.mono}; font-size: 10px; letter-spacing: .04em; opacity: .55; margin: -6px 0 11px 22px; }
    .cn-total {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 2px solid var(--cn-paper-ink); margin-top: 18px; padding-top: 13px;
    }
    .cn-total__k { font-family: ${FONT.mono}; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; }
    .cn-total__v { font-family: ${FONT.display}; font-size: 30px; }

    .cn-field { margin-bottom: 17px; }
    .cn-label { display: block; font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .18em; text-transform: uppercase; opacity: .6; margin-bottom: 4px; }
    .cn-input {
      width: 100%; background: transparent; border: none;
      border-bottom: 1.5px solid rgba(0,0,0,.28); padding: 8px 2px;
      font-family: ${FONT.editorial}; font-size: 16px; color: var(--cn-paper-ink);
      outline: none; border-radius: 0;
    }
    .cn-input::placeholder { color: rgba(0,0,0,.42); }
    .cn-input:focus { border-bottom-color: var(--cn-hot); border-bottom-width: 2px; }
    .cn-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    .cn-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
    .cn-slot {
      padding: 12px 4px; cursor: pointer; border: 1px solid rgba(0,0,0,.22); border-radius: 2px;
      background: transparent; color: var(--cn-paper-ink);
      font-family: ${FONT.mono}; font-size: 13px; letter-spacing: .04em;
      transition: background .12s ease, color .12s ease;
    }
    .cn-slot:hover { border-color: var(--cn-paper-ink); }
    .cn-slot--on { background: var(--cn-paper-ink); color: var(--cn-paper); border-color: var(--cn-paper-ink); }

    .cn-pay { display: flex; align-items: center; gap: 14px; }
    .cn-err {
      background: var(--cn-hot); color: var(--cn-paper); padding: 12px 15px; margin-bottom: 12px;
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .04em; line-height: 1.5;
    }

    /* La confirmation : le ticket qu'on tend au comptoir */
    .cn-done { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 14px; }
    .cn-done__num { font-family: ${FONT.display}; font-size: clamp(30px, 10vw, 52px); letter-spacing: -.01em; margin: 6px 0 0; }
    .cn-done__when { border: 1.5px solid rgba(0,0,0,.2); padding: 14px 16px; margin-top: 22px; }
  `

  // ── Le ticket de confirmation ─────────────────────────────────────────────
  if (success) {
    const pickupDate = new Date(success.pickupTime)
    const isToday = pickupDate.toDateString() === new Date().toDateString()
    const pickupLabel = isToday
      ? `Aujourd'hui à ${pickupDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`
      : pickupDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

    return (
      <div className="cn" style={cssVars}>
        <style>{CSS}</style>
        <div className="cn-done">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div className="cn-sheetpaper" style={{ padding: '34px 22px 32px' }}>
              <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />

              <p className="cn-kicker">Commande enregistrée</p>
              <p className="cn-display cn-done__num">{success.orderNumber}</p>

              <div className="cn-done__when">
                <p className="cn-kicker" style={{ margin: 0 }}>Retrait prévu</p>
                <p className="cn-ed" style={{ fontSize: 19, margin: '5px 0 0', fontStyle: 'italic' }}>{pickupLabel}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22, gap: 12 }}>
                <p className="cn-ed" style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, opacity: .7, maxWidth: '18ch' }}>
                  Un email de confirmation vient de partir.
                </p>
                <span className="cn-stamp" style={{ color: p.hot, flexShrink: 0 }}>À régler sur place</span>
              </div>

              <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
            </div>

            <button className="cn-confirm" style={{ marginTop: 0 }} onClick={() => router.push(`/suivi/${success.orderNumber}`)}>
              <span>Suivre ma commande</span>
              <span>→</span>
            </button>
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

  // ── Le bon de commande ────────────────────────────────────────────────────
  return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh' }}>
      <style>{CSS}</style>

      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: `1px solid ${p.line}`, position: 'sticky', top: 0, zIndex: 50, background: p.char }}>
        <button onClick={() => router.back()} aria-label="Retour" style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.dough, fontSize: 17, lineHeight: 1, padding: 0 }}>←</button>
        <span className="cn-mono" style={{ fontSize: 10, color: p.dough }}>Bon de commande</span>
        {restaurant && <span className="cn-mono" style={{ fontSize: 10, color: p.doughDim, marginLeft: 'auto' }}>{restaurant.name}</span>}
      </header>

      <main className="cn-cmd">

        {/* Le récapitulatif, en lignes de ticket */}
        <div className="cn-sheetpaper">
          <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />
          <p className="cn-kicker">Votre commande</p>

          {cart.length === 0 && (
            <p className="cn-ed" style={{ fontStyle: 'italic', opacity: .6, margin: '10px 0 0' }}>Votre panier est vide.</p>
          )}

          {cart.map((i: any, idx: number) => {
            const optionLabels = i.selectedOptions
              ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ')
              : ''
            const unitPrice = i.product.price + (i.extraPrice || 0)
            const extras = [optionLabels, i.menuBoisson, i.menuAccomp].filter(Boolean).join(' · ')
            return (
              <div key={idx}>
                <div className="cn-line">
                  <span className="cn-line__n">{i.quantity}×</span>
                  <span className="cn-line__name">{i.product.name}</span>
                  <span className="cn-line__dots" />
                  <span className="cn-line__p">{price(unitPrice * i.quantity)}€</span>
                </div>
                {extras && <p className="cn-line__opt">{extras}</p>}
              </div>
            )
          })}

          <div className="cn-total">
            <span className="cn-total__k">Total</span>
            <span className="cn-total__v">{price(total)}€</span>
          </div>
          <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
        </div>

        <form onSubmit={handleSubmit}>

          {/* Qui vient chercher */}
          <div className="cn-sheetpaper">
            <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />
            <p className="cn-kicker">Qui vient chercher</p>

            <div className="cn-duo">
              <div className="cn-field">
                <label className="cn-label" htmlFor="cn-fn">Prénom *</label>
                <input id="cn-fn" className="cn-input" type="text" placeholder="Jean" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="cn-field">
                <label className="cn-label" htmlFor="cn-ln">Nom *</label>
                <input id="cn-ln" className="cn-input" type="text" placeholder="Dupont" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="cn-field">
              <label className="cn-label" htmlFor="cn-em">Email * — la confirmation part ici</label>
              <input id="cn-em" className="cn-input" type="email" placeholder="jean@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="cn-field" style={{ marginBottom: 4 }}>
              <label className="cn-label" htmlFor="cn-ph">Téléphone — facultatif</label>
              <input id="cn-ph" className="cn-input" type="tel" placeholder="06 00 00 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
          </div>

          {/* Quand */}
          <div className="cn-sheetpaper">
            <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />
            <p className="cn-kicker">Heure de retrait</p>

            {pickupSlots.length === 0 ? (
              <p className="cn-ed" style={{ fontStyle: 'italic', color: p.hot, margin: '12px 0 4px', fontSize: 14.5 }}>
                Aucun créneau disponible sur les 7 prochains jours.
              </p>
            ) : (
              <>
                {(() => {
                  const slotDate = new Date(pickupSlots[0])
                  const isToday = slotDate.toDateString() === new Date().toDateString()
                  if (!isToday) return (
                    <p className="cn-mono" style={{ fontSize: 9.5, color: p.hot, margin: '0 0 12px', lineHeight: 1.6 }}>
                      Fermé aujourd&apos;hui — créneaux du {slotDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  )
                  return null
                })()}
                <div className="cn-slots">
                  {pickupSlots.map(slot => {
                    const label = new Date(slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
                    const selected = pickupTime === slot
                    return (
                      <button key={slot} type="button" onClick={() => setPickupTime(slot)} className={`cn-slot${selected ? ' cn-slot--on' : ''}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
          </div>

          {/* Comment on règle */}
          <div className="cn-sheetpaper">
            <span className="cn-sheetpaper__top" style={perforation(p.ink, 'top')} />
            <p className="cn-kicker">Paiement</p>
            <div className="cn-pay">
              <span className="cn-stamp" style={{ color: p.hot, flexShrink: 0 }}>Sur place</span>
              <p className="cn-ed" style={{ fontSize: 14, lineHeight: 1.5, margin: 0, opacity: .75 }}>
                Vous réglez au comptoir au moment du retrait.
              </p>
            </div>
            <span className="cn-sheetpaper__bot" style={perforation(p.ink, 'bottom')} />
          </div>

          {error && <div className="cn-err">{error}</div>}

          <button type="submit" className="cn-confirm" disabled={loading || pickupSlots.length === 0} style={{ marginTop: 0 }}>
            <span>{loading ? 'Envoi en cours…' : 'Envoyer la commande'}</span>
            <b>{price(total)}€</b>
          </button>
        </form>
      </main>
    </div>
  )
}
