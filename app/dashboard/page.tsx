'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!resto) { router.push('/auth/register'); return }
      setRestaurant(resto)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setOrders(ordersData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_price), 0)

  const pendingOrders = orders.filter(o => o.status === 'pending').length

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div className="flex items-center gap-3">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={36} height={36} className="rounded-full" />
          <div>
            <h1 className="font-bold text-white text-sm">{restaurant.name}</h1>
            <p className="text-xs" style={{ color: '#64748b' }}>Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm transition" style={{ color: '#64748b' }}>
          Déconnexion
        </button>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Commandes aujourd'hui", value: orders.length, color: '#3b82f6' },
            { label: 'En attente', value: pendingOrders, color: '#f59e0b' },
            { label: 'Revenus (payé en ligne)', value: `${totalRevenue.toFixed(2)}€`, color: '#10b981' },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Commandes', href: '/dashboard/orders', emoji: '📋' },
            { label: 'Menu', href: '/dashboard/menu', emoji: '🍽️' },
            { label: 'Clients', href: '/dashboard/customers', emoji: '👥' },
            { label: 'Analytics', href: '/dashboard/analytics', emoji: '📊' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 transition"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{item.label}</span>
            </a>
          ))}
        </div>

        {/* Dernières commandes */}
        <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-4">Dernières commandes</h2>
          {orders.length === 0 ? (
            <p className="text-sm" style={{ color: '#475569' }}>Aucune commande pour l'instant</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1e293b' }}>
                  <div>
                    <p className="font-medium text-white">{order.first_name} {order.last_name}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>#{order.order_number} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{Number(order.total_price).toFixed(2)}€</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: order.status === 'pending' ? '#451a03' : order.status === 'ready' ? '#052e16' : '#1e293b',
                      color: order.status === 'pending' ? '#fb923c' : order.status === 'ready' ? '#4ade80' : '#94a3b8'
                    }}>
                      {order.status === 'pending' ? 'En attente' : order.status === 'preparing' ? 'En préparation' : order.status === 'ready' ? 'Prêt' : order.status === 'completed' ? 'Terminé' : 'Annulé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
