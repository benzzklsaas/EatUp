'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function OrderSuccessPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function markPaidAndNotify() {
      if (!orderNumber) return

      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('order_number', orderNumber)

      // Récupérer les infos de la commande pour l'email
      const { data: order } = await supabase
        .from('orders')
        .select('*, restaurants(name, email)')
        .eq('order_number', orderNumber)
        .single()

      if (order) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        try {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail: order.email,
              customerName: `${order.first_name} ${order.last_name}`,
              restaurantEmail: order.restaurants?.email,
              restaurantName: order.restaurants?.name,
              orderNumber: order.order_number,
              items: (items || []).map((i: any) => ({ name: i.product_name, quantity: i.quantity, price: i.price })),
              total: Number(order.total_price).toFixed(2),
              pickupTime: order.pickup_time,
            }),
          })
        } catch (_) {}
      }
    }
    markPaidAndNotify()
    localStorage.removeItem(`cart_${slug}`)
  }, [orderNumber])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Paiement confirmé !</h1>
        <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Votre commande a été payée avec succès.</p>
        <div className="rounded-xl p-4 mb-6" style={{ background: '#0f172a' }}>
          <p className="text-xs mb-1" style={{ color: '#64748b' }}>Numéro de commande</p>
          <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{orderNumber}</p>
        </div>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>Vous recevrez un email de confirmation. Présentez ce numéro lors du retrait.</p>
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
}
