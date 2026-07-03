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
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) setCart(JSON.parse(stored))

    async function loadResto() {
      const { data } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (data) {
        setRestaurant(data)

        // Récupérer les horaires du jour
        const todayIndex = (new Date().getDay() + 6) % 7 // 0=lundi
        const { data: daySchedule } = await supabase
          .from('restaurant_schedule')
          .select('*')
          .eq('restaurant_id', data.id)
          .eq('day_of_week', todayIndex)
          .single()

        // Vérifier les fermetures exceptionnelles
        const today = new Date().toISOString().split('T')[0]
        const { data: closure } = await supabase
          .from('restaurant_closures')
          .select('id')
          .eq('restaurant_id', data.id)
          .eq('closed_date', today)
          .single()

        if (closure || daySchedule?.is_closed) {
          setPickupSlots([])
          return
        }

        const now = new Date()
        const minTime = new Date(now.getTime() + 30 * 60000)
        const duration = daySchedule?.slot_duration || 15
        const slots: string[] = []

        function addSlots(openStr: string, closeStr: string) {
          const [oh, om] = openStr.split(':').map(Number)
          const [ch, cm] = closeStr.split(':').map(Number)
          const cur = new Date()
          cur.setHours(oh, om, 0, 0)
          const closing = new Date()
          closing.setHours(ch, cm, 0, 0)
          while (cur <= closing) {
            if (cur > minTime) slots.push(new Date(cur).toISOString())
            cur.setMinutes(cur.getMinutes() + duration)
          }
        }

        const open1 = daySchedule?.opening_time_1?.slice(0, 5) || '11:00'
        const close1 = daySchedule?.closing_time_1?.slice(0, 5) || '15:00'
        addSlots(open1, close1)

        if (daySchedule?.opening_time_2 && daySchedule?.closing_time_2) {
          addSlots(daySchedule.opening_time_2.slice(0, 5), daySchedule.closing_time_2.slice(0, 5))
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

    const orderNumber = generateOrderNumber()

    const items = cart.map((i: any) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      price: i.product.price + (i.extraPrice || 0),
      options: i.selectedOptions ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ') : '',
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
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) { setError('Erreur : ' + (json.error || 'réessayez.')); setLoading(false); return }
    const order = json.order

    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: form.email,
          customerName: `${form.firstName} ${form.lastName}`,
          restaurantEmail: restaurant.email,
          restaurantName: restaurant.name,
          orderNumber,
          items: cart.map((i: any) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
          total: total.toFixed(2),
          pickupTime,
        }),
      })
    } catch (_) {}

    localStorage.removeItem(`cart_${slug}`)
    setSuccess(orderNumber)
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-white mb-2">Commande confirmée !</h1>
        <p style={{ color: '#94a3b8' }} className="text-sm mb-4">Votre commande a bien été reçue.</p>
        <div className="rounded-xl p-4 mb-6" style={{ background: '#0f172a' }}>
          <p className="text-xs mb-1" style={{ color: '#64748b' }}>Numéro de commande</p>
          <p className="text-xl font-bold" style={{ color: '#3b82f6' }}>{success}</p>
        </div>
        <button
          onClick={() => router.push(`/restaurant/${slug}`)}
          className="w-full py-3 rounded-xl font-semibold"
          style={{ background: '#3b82f6', color: 'white' }}
        >
          Retour au menu
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => router.back()} style={{ color: '#64748b' }}>← Retour</button>
        <h1 className="font-bold text-white">Finaliser la commande</h1>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        {/* Récap panier */}
        <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-3">Votre panier</h2>
          <div className="space-y-2">
            {cart.map((i: any, idx: number) => {
              const optionLabels = i.selectedOptions
                ? Object.values(i.selectedOptions).flat().map((o: any) => o.name).join(', ')
                : ''
              const unitPrice = i.product.price + (i.extraPrice || 0)
              return (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: '#cbd5e1' }}>{i.product.name} × {i.quantity}</span>
                    <span className="font-medium text-white">{(unitPrice * i.quantity).toFixed(2)}€</span>
                  </div>
                  {optionLabels && <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{optionLabels}</p>}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between font-bold text-white mt-3 pt-3" style={{ borderTop: '1px solid #334155' }}>
            <span>Total</span>
            <span style={{ color: '#3b82f6' }}>{total.toFixed(2)}€</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Infos client */}
          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-3">Vos informations</h2>
            <div className="space-y-3">
              {[
                { key: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Jean' },
                { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Dupont' },
                { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '06 00 00 00 00' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'jean@email.com' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Heure de retrait */}
          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-3">Heure de retrait</h2>
            {pickupSlots.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#f87171' }}>
                Le restaurant est fermé aujourd'hui — aucune commande possible.
              </p>
            ) : (
            <div className="grid grid-cols-3 gap-2">
              {pickupSlots.map(slot => {
                const date = new Date(slot)
                const label = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPickupTime(slot)}
                    className="py-3 rounded-xl text-sm font-semibold transition"
                    style={{
                      background: pickupTime === slot ? '#3b82f6' : '#0f172a',
                      color: pickupTime === slot ? 'white' : '#94a3b8',
                      border: '1px solid',
                      borderColor: pickupTime === slot ? '#3b82f6' : '#334155',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            )}
          </div>

          {/* Paiement */}
          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-3">Paiement</h2>
            <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
              <span style={{ fontSize: 24 }}>💵</span>
              <div>
                <p className="font-semibold text-white text-sm">Paiement sur place</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Règlement à la caisse lors du retrait de votre commande</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-4 text-sm" style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            {loading ? 'Envoi en cours...' : `Confirmer la commande · ${total.toFixed(2)}€`}
          </button>
        </form>
      </main>
    </div>
  )
}
