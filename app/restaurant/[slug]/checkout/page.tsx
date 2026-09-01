'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getBrand, paletteVars, FONT } from '@/lib/brand'
import { brandCss } from '@/lib/brand-styles'

const price = (n: number) => Number(n).toFixed(2).replace('.', ',')

export default function CheckoutPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' })
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

        // De quoi proposer un complément pertinent au moment de valider
        const { data: extras } = await supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', data.id)
          .neq('is_online', false)
          .in('category', ['Boissons', 'Desserts', 'Accompagnements'])
        setSuggestions((extras || []).filter((e: any) => e.is_available !== false && !(Number(e.menu_extra_price) > 0)))

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

    // « Jean Dupont » → prénom / nom, tels que les attend la base.
    const parts = form.fullName.trim().split(/\s+/)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ')

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
          first_name: firstName,
          last_name: lastName,
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
          order: { restaurant_id: restaurant.id, order_number: orderNumber, first_name: firstName, last_name: lastName, phone: form.phone, email: form.email, total_price: total, pickup_time: pickupTime, payment_method: paymentMethod, payment_status: 'unpaid', status: 'pending' },
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
  const cssVars = paletteVars(p) as React.CSSProperties

  function updateCart(next: any[]) {
    setCart(next)
    localStorage.setItem(`cart_${slug}`, JSON.stringify(next))
  }
  function incLine(cartKey: string) {
    updateCart(cart.map((i: any) => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i))
  }
  function decLine(cartKey: string) {
    const line = cart.find((i: any) => i.cartKey === cartKey)
    if (!line) return
    if (line.quantity === 1) updateCart(cart.filter((i: any) => i.cartKey !== cartKey))
    else updateCart(cart.map((i: any) => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i))
  }
  function addSuggestion(product: any) {
    updateCart([...cart, {
      product, quantity: 1, selectedOptions: {}, optionGroups: [], extraPrice: 0,
      cartKey: product.id + '-' + Date.now(),
    }])
  }

  // On ne propose que ce qui n'est pas déjà dans le panier.
  const inCart = new Set(cart.map((i: any) => i.product.id))
  const offers = suggestions.filter((s: any) => !inCart.has(s.id)).slice(0, 6)

  const CSS = brandCss() + `
    .cn-co { max-width: 620px; margin: 0 auto; padding: 22px 16px 130px; }
    .cn-card { background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 12px; padding: 18px 16px; margin-bottom: 14px; }
    .cn-card__t { font-family: ${FONT.display}; font-weight: 700; font-size: 17px; margin: 0 0 14px; }

    .cn-ln { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-top: 1px solid var(--cn-line); }
    .cn-ln:first-of-type { border-top: none; padding-top: 0; }
    .cn-ln__b { flex: 1; min-width: 0; }
    .cn-ln__n { font-weight: 600; font-size: 15px; }
    .cn-ln__o { font-size: 13px; color: var(--cn-dim); margin: 3px 0 0; line-height: 1.45; }
    .cn-ln__p { font-family: ${FONT.mono}; font-size: 15px; flex-shrink: 0; text-align: right; min-width: 62px; }

    /* Les compléments : une rangée qui défile, une cible franche par carte */
    .cn-offers { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px 4px; }
    .cn-offers::-webkit-scrollbar { display: none; }
    .cn-offer {
      flex-shrink: 0; width: 132px; text-align: left; cursor: pointer;
      background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 10px;
      padding: 10px; font: inherit; color: inherit;
      transition: border-color .14s ease, transform .2s var(--e);
    }
    .cn-offer:hover { border-color: var(--cn-hot-ink); transform: translateY(-2px); }
    .cn-offer .cn-arch { width: 100%; height: 74px; margin-bottom: 8px; }
    .cn-offer img { width: 100%; height: 100%; object-fit: cover; }
    .cn-offer__n { font-size: 13px; font-weight: 600; line-height: 1.3; }
    .cn-offer__f { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
    .cn-offer__p { font-family: ${FONT.mono}; font-size: 13px; color: var(--cn-hot-ink); }
    .cn-offer__a { width: 26px; height: 26px; border-radius: 50%; background: var(--cn-hot-soft); color: var(--cn-hot-ink);
      display: flex; align-items: center; justify-content: center; font-size: 17px; line-height: 1; }

    .cn-err { background: var(--cn-hot-soft); color: var(--cn-hot-ink); padding: 12px 14px; border-radius: 10px; font-size: 14px; margin-bottom: 12px; }

    /* La validation reste sous le pouce, avec le total toujours visible */
    .cn-go {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
      background: color-mix(in srgb, var(--cn-bg) 94%, transparent); backdrop-filter: blur(12px);
      border-top: 1px solid var(--cn-line);
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    }
    .cn-go__in { max-width: 620px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
    .cn-go__sum { flex-shrink: 0; }
    .cn-go__k { font-size: 12px; color: var(--cn-dim); }
    .cn-go__v { font-family: ${FONT.mono}; font-size: 20px; }

    .cn-done { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
    .cn-done__num { font-family: ${FONT.mono}; font-size: clamp(26px, 8vw, 34px); margin: 8px 0 0; }
  `

  // ── La commande est passée ─────────────────────────────────────────────────
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
            <div className="cn-card" style={{ padding: '26px 20px' }}>
              <span className="cn-pill cn-pill--open"><span className="cn-pill__dot" />Commande envoyée</span>
              <p className="cn-eyebrow" style={{ margin: '20px 0 0' }}>Votre numéro</p>
              <p className="cn-done__num">{success.orderNumber}</p>

              <div className="cn-recap__row" style={{ marginTop: 22 }}>
                <span className="cn-recap__k">Retrait</span>
                <span className="cn-recap__dots" />
                <span className="cn-recap__v">{pickupLabel}</span>
              </div>
              <div className="cn-recap__row" style={{ marginBottom: 0 }}>
                <span className="cn-recap__k">À régler sur place</span>
                <span className="cn-recap__dots" />
                <span className="cn-recap__v">{price(total)}€</span>
              </div>

              <p style={{ fontSize: 14, color: p.dim, margin: '20px 0 0', lineHeight: 1.5 }}>
                Un email de confirmation vient de partir. Présentez votre numéro au comptoir.
              </p>
            </div>

            <button className="cn-btn cn-btn--block" onClick={() => router.push(`/suivi/${success.orderNumber}`)}>
              Suivre ma commande
            </button>
            <button className="cn-btn cn-btn--ghost cn-btn--block" style={{ marginTop: 10 }} onClick={() => router.push(`/restaurant/${slug}`)}>
              Retour à la carte
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Le bon de commande, en un seul écran ───────────────────────────────────
  return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh' }}>
      <style>{CSS}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: p.bg, borderBottom: `1px solid ${p.line}` }}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <button onClick={() => router.back()} aria-label="Retour" className="cn-btn cn-btn--ghost" style={{ minHeight: 38, padding: '8px 12px' }}>←</button>
          <span style={{ fontWeight: 600 }}>Ma commande</span>
          {restaurant && <span style={{ marginLeft: 'auto', fontSize: 13, color: p.dim }}>{restaurant.name}</span>}
        </div>
      </header>

      <main className="cn-co">

        {/* Le panier, modifiable ici même */}
        <div className="cn-card">
          <p className="cn-card__t">Votre commande</p>

          {cart.length === 0 && (
            <p style={{ color: p.dim, margin: 0 }}>
              Votre panier est vide. <button onClick={() => router.push(`/restaurant/${slug}`)} style={{ background: 'none', border: 'none', padding: 0, color: p.hotInk, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>Revenir à la carte</button>
            </p>
          )}

          {cart.map((i: any) => {
            const optionLabels = i.selectedOptions
              ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ')
              : ''
            const extras = [optionLabels, i.menuBoisson, i.menuAccomp].filter(Boolean).join(' · ')
            const unitPrice = i.product.price + (i.extraPrice || 0)
            return (
              <div key={i.cartKey} className="cn-ln">
                <span className="cn-step">
                  <button onClick={() => decLine(i.cartKey)} aria-label={`Retirer un ${i.product.name}`}>−</button>
                  <span className="cn-step__n">{i.quantity}</span>
                  <button onClick={() => incLine(i.cartKey)} aria-label={`Ajouter un ${i.product.name}`}>+</button>
                </span>
                <span className="cn-ln__b">
                  <span className="cn-ln__n" style={{ display: 'block' }}>{i.product.name}</span>
                  {extras && <span className="cn-ln__o" style={{ display: 'block' }}>{extras}</span>}
                </span>
                <span className="cn-ln__p">{price(unitPrice * i.quantity)}€</span>
              </div>
            )
          })}
        </div>

        {/* Le complément, proposé là où la décision se prend */}
        {offers.length > 0 && cart.length > 0 && (
          <div className="cn-card">
            <p className="cn-card__t">Avec ça ?</p>
            <div className="cn-offers">
              {offers.map((o: any) => (
                <button key={o.id} className="cn-offer" onClick={() => addSuggestion(o)}>
                  {o.image_url && <span className="cn-arch"><img src={o.image_url} alt="" /></span>}
                  <span className="cn-offer__n" style={{ display: 'block' }}>{o.name}</span>
                  <span className="cn-offer__f">
                    <span className="cn-offer__p">{price(o.price)}€</span>
                    <span className="cn-offer__a" aria-hidden="true">+</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} id="cn-order">
          {/* Trois champs, pas cinq */}
          <div className="cn-card">
            <p className="cn-card__t">Vos coordonnées</p>
            <label className="cn-field">
              <span className="cn-label">Nom</span>
              <input className="cn-input" type="text" autoComplete="name" placeholder="Jean Dupont"
                value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            </label>
            <label className="cn-field">
              <span className="cn-label">Email <span>— la confirmation part ici</span></span>
              <input className="cn-input" type="email" autoComplete="email" placeholder="jean@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="cn-field" style={{ marginBottom: 0 }}>
              <span className="cn-label">Téléphone <span>— facultatif</span></span>
              <input className="cn-input" type="tel" autoComplete="tel" placeholder="06 00 00 00 00"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </label>
          </div>

          {/* Quand */}
          <div className="cn-card">
            <p className="cn-card__t">Heure de retrait</p>
            {pickupSlots.length === 0 ? (
              <p style={{ color: p.hotInk, margin: 0 }}>Aucun créneau disponible sur les 7 prochains jours.</p>
            ) : (
              <>
                {(() => {
                  const slotDate = new Date(pickupSlots[0])
                  if (slotDate.toDateString() !== new Date().toDateString()) return (
                    <p style={{ fontSize: 13, color: p.hotInk, margin: '0 0 12px' }}>
                      Fermé aujourd&apos;hui — premiers créneaux le {slotDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.
                    </p>
                  )
                  return null
                })()}
                <div className="cn-slots">
                  {pickupSlots.map(slot => {
                    const label = new Date(slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
                    return (
                      <button key={slot} type="button" onClick={() => setPickupTime(slot)}
                        className={`cn-slot${pickupTime === slot ? ' cn-slot--on' : ''}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Le règlement */}
          <div className="cn-card" style={{ marginBottom: 0 }}>
            <p className="cn-card__t">Paiement</p>
            <div className="cn-note">
              <div>
                <p className="cn-note__t">Sur place, au comptoir</p>
                <p className="cn-note__d">Vous réglez au moment du retrait. Rien n&apos;est débité maintenant.</p>
              </div>
            </div>
          </div>

          {error && <div className="cn-err" style={{ marginTop: 14 }}>{error}</div>}
        </form>
      </main>

      <div className="cn-go">
        <div className="cn-go__in">
          <span className="cn-go__sum">
            <span className="cn-go__k" style={{ display: 'block' }}>Total</span>
            <span className="cn-go__v">{price(total)}€</span>
          </span>
          <button type="submit" form="cn-order" className="cn-btn" style={{ flex: 1 }}
            disabled={loading || pickupSlots.length === 0 || cart.length === 0}>
            {loading ? 'Envoi…' : 'Confirmer la commande'}
          </button>
        </div>
      </div>
    </div>
  )
}
