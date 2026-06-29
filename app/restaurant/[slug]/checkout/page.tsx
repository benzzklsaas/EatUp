'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [cart, setCart] = useState<any[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [pickupTime, setPickupTime] = useState('')
  const [pickupSlots, setPickupSlots] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) setCart(JSON.parse(stored))

    async function loadResto() {
      const { data } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (data) setRestaurant(data)
    }
    loadResto()

    // Générer les créneaux : de maintenant + 30min, toutes les 15min, pour 3h
    const slots: string[] = []
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    now.setSeconds(0, 0)
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15
    now.setMinutes(roundedMinutes)
    for (let i = 0; i < 12; i++) {
      const slot = new Date(now.getTime() + i * 15 * 60000)
      slots.push(slot.toISOString())
    }
    setPickupSlots(slots)
    setPickupTime(slots[0])
  }, [slug])

  const total = cart.reduce((sum: number, i: any) => sum + i.product.price * i.quantity, 0)

  function generateOrderNumber() {
    return 'EAT-' + Date.now().toString().slice(-6)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!restaurant) { setError('Restaurant introuvable — rechargez la page.'); return }
    if (cart.length === 0) { setError('Votre panier est vide — retournez au menu.'); return }
    setLoading(true)

    const orderNumber = generateOrderNumber()

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
          payment_status: paymentMethod === 'cash' ? 'unpaid' : 'paid',
          status: 'pending',
        },
        items: cart.map((i: any) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
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
            {cart.map((i: any) => (
              <div key={i.product.id} className="flex justify-between text-sm">
                <span style={{ color: '#cbd5e1' }}>{i.product.name} × {i.quantity}</span>
                <span className="font-medium text-white">{(i.product.price * i.quantity).toFixed(2)}€</span>
              </div>
            ))}
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
          </div>

          {/* Paiement */}
          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-3">Mode de paiement</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'cash', label: '💵 Payer en caisse' },
                { value: 'online', label: '💳 Payer en ligne' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value as 'cash' | 'online')}
                  className="py-3 rounded-xl text-sm font-medium transition"
                  style={{
                    background: paymentMethod === opt.value ? '#1d4ed8' : '#0f172a',
                    color: paymentMethod === opt.value ? 'white' : '#94a3b8',
                    border: '1px solid',
                    borderColor: paymentMethod === opt.value ? '#3b82f6' : '#334155',
                  }}
                >
                  {opt.label}
                </button>
              ))}
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
