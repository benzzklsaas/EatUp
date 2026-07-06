'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

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
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) setCart(JSON.parse(stored))

    async function loadResto() {
      const { data } = await supabase.from('restaurants').select('id, name, slug, email').eq('slug', slug).single()
      if (data) {
        setRestaurant(data)

        // Récupérer tous les horaires
        const { data: allSchedules } = await supabase
          .from('restaurant_schedule')
          .select('*')
          .eq('restaurant_id', data.id)
          .order('day_of_week')

        const now = new Date()
        const minTime = new Date(now.getTime() + 30 * 60000)
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

          const duration = daySchedule.slot_duration || 5

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

  if (success) {
    const pickupDate = new Date(success.pickupTime)
    const isToday = pickupDate.toDateString() === new Date().toDateString()
    const pickupLabel = isToday
      ? `Aujourd'hui à ${pickupDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : pickupDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#080c14', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 400, borderRadius: 24, padding: '40px 32px', textAlign: 'center', background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Commande confirmée !</h1>
          <p style={{ color: '#4b5563', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>Un email de confirmation vous a été envoyé.</p>

          <div style={{ borderRadius: 16, padding: '20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Retrait prévu</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>{pickupLabel}</p>
          </div>

          <div style={{ borderRadius: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: '#374151', margin: '0 0 4px' }}>Numéro de commande</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', margin: 0 }}>{success.orderNumber}</p>
          </div>

          <button
            onClick={() => router.push(`/restaurant/${slug}`)}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15 }}
          >
            Retour au menu
          </button>
        </div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 12, padding: '12px 14px', fontSize: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const sectionStyle: React.CSSProperties = {
    borderRadius: 20, padding: '20px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 7,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 40 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.back()} style={{ color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Finaliser la commande</p>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Récap panier */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 14px' }}>Votre panier</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cart.map((i: any, idx: number) => {
              const optionLabels = i.selectedOptions
                ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ')
                : ''
              const unitPrice = i.product.price + (i.extraPrice || 0)
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: '#d1d5db' }}>{i.product.name} × {i.quantity}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{(unitPrice * i.quantity).toFixed(2)}€</span>
                  </div>
                  {optionLabels && <p style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{optionLabels}</p>}
                  {i.menuBoisson && <p style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>🥤 {i.menuBoisson}</p>}
                  {i.menuAccomp && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>🍟 {i.menuAccomp}</p>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'white', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 16 }}>
            <span>Total</span>
            <span style={{ color: '#818cf8' }}>{total.toFixed(2)}€</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Infos client */}
          <div style={sectionStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 14px' }}>Vos informations</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Prénom *</label>
                  <input type="text" placeholder="Jean" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input type="text" placeholder="Dupont" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email * <span style={{ fontSize: 11, color: '#374151', fontWeight: 400 }}>(confirmation envoyée ici)</span></label>
                <input type="email" placeholder="jean@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone <span style={{ fontSize: 11, color: '#374151', fontWeight: 400 }}>(optionnel)</span></label>
                <input type="tel" placeholder="06 00 00 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Heure de retrait */}
          <div style={sectionStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 14px' }}>Heure de retrait</p>
            {pickupSlots.length === 0 ? (
              <p style={{ fontSize: 13, color: '#f87171', textAlign: 'center', padding: '16px 0' }}>Aucun créneau disponible pour les 7 prochains jours.</p>
            ) : (
              <>
                {(() => {
                  const slotDate = new Date(pickupSlots[0])
                  const isToday = slotDate.toDateString() === new Date().toDateString()
                  if (!isToday) return (
                    <p style={{ fontSize: 12, color: '#d97706', marginBottom: 12, fontWeight: 600 }}>
                      🌙 Restaurant fermé aujourd'hui — créneaux disponibles le {slotDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  )
                  return null
                })()}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {pickupSlots.map(slot => {
                    const label = new Date(slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    const selected = pickupTime === slot
                    return (
                      <button key={slot} type="button" onClick={() => setPickupTime(slot)} style={{
                        padding: '12px 8px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        background: selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.03)',
                        color: selected ? 'white' : '#6b7280',
                        border: selected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: selected ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                      }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Paiement */}
          <div style={sectionStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Paiement</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>💵</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>Paiement sur place</p>
                <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>Règlement à la caisse lors du retrait</p>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ borderRadius: 12, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pickupSlots.length === 0}
            style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              cursor: loading || pickupSlots.length === 0 ? 'default' : 'pointer',
              background: loading || pickupSlots.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: loading || pickupSlots.length === 0 ? '#374151' : 'white',
              fontWeight: 800, fontSize: 16, transition: 'all 0.2s',
              boxShadow: loading || pickupSlots.length === 0 ? 'none' : '0 8px 32px rgba(99,102,241,0.35)',
            }}
          >
            {loading ? 'Envoi en cours…' : `Confirmer · ${total.toFixed(2)}€`}
          </button>
        </form>
      </main>
    </div>
  )
}
