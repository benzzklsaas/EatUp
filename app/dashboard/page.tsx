'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const NAV = [
  { label: 'Commandes', href: '/dashboard/orders', icon: '📋', desc: 'Gérer les commandes' },
  { label: 'Menu', href: '/dashboard/menu', icon: '🍽️', desc: 'Gérer vos produits' },
  { label: 'Clients', href: '/dashboard/customers', icon: '👥', desc: 'Base clients' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📊', desc: 'Revenus & stats' },
  { label: 'Paramètres', href: '/dashboard/settings', icon: '⚙️', desc: 'Horaires & config' },
]

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

      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) {
        const { data: admin } = await supabase.from('superadmins').select('id').eq('id', user.id).single()
        if (admin) { router.push('/superadmin'); return }
        router.push('/auth/register'); return
      }

      const { data: sub } = await supabase.from('restaurant_subscriptions').select('status, past_due_since').eq('restaurant_id', resto.id).single()
      const gracePeriodExpired = sub?.status === 'past_due' && sub.past_due_since
        && (Date.now() - new Date(sub.past_due_since).getTime()) > 2 * 24 * 3600_000
      if (!sub || (sub.status !== 'active' && sub.status !== 'past_due') || gracePeriodExpired) {
        router.push('/subscribe'); return
      }

      if (!resto.onboarding_done) { router.push('/dashboard/onboarding'); return }

      setRestaurant(resto)

      const { data: ordersData } = await supabase
        .from('orders').select('*').eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false }).limit(10)

      setOrders(ordersData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', margin: '0 auto 16px', boxShadow: '0 0 20px #6366f1', animation: 'pulse 1s infinite' }} />
        <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  )

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const todayOrders = orders.filter(o => o.created_at?.startsWith(new Date().toISOString().split('T')[0])).length

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={36} height={36} style={{ borderRadius: '50%' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>{restaurant.name}</p>
            <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/restaurant/${restaurant.slug}`} target="_blank" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
            Voir ma page →
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }} style={{ fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: "Commandes aujourd'hui", value: todayOrders, color: '#60a5fa', icon: '📋' },
            { label: 'En attente', value: pendingOrders, color: '#f59e0b', icon: '⏳' },
            { label: 'Revenus (en ligne)', value: `${totalRevenue.toFixed(2)}€`, color: '#4ade80', icon: '💰' },
          ].map((stat, i) => (
            <div key={i} style={{ borderRadius: 20, padding: '24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, color: '#374151', margin: '0 0 12px' }}>{stat.icon} {stat.label}</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: stat.color, margin: 0, letterSpacing: '-1px' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 32 }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{ borderRadius: 18, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.2s' }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Dernières commandes */}
        <div style={{ borderRadius: 20, background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>Dernières commandes</p>
            <Link href="/dashboard/orders" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Voir tout →</Link>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🛒</p>
              <p style={{ color: '#374151', fontSize: 14 }}>Aucune commande pour l'instant</p>
            </div>
          ) : (
            <div>
              {orders.map((order, i) => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: i < orders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: '0 0 4px' }}>{order.first_name} {order.last_name}</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>#{order.order_number} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0 }}>{Number(order.total_price).toFixed(2)}€</p>
                    <span style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 100, fontWeight: 600,
                      background: order.status === 'pending' ? 'rgba(245,158,11,0.1)' : order.status === 'ready' ? 'rgba(74,222,128,0.1)' : order.status === 'preparing' ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.05)',
                      color: order.status === 'pending' ? '#f59e0b' : order.status === 'ready' ? '#4ade80' : order.status === 'preparing' ? '#60a5fa' : '#6b7280',
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
