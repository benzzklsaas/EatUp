'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const NAV = [
  { label: 'Commandes', href: '/dashboard/orders', icon: '📋', desc: 'Gérer les commandes' },
  { label: 'Menu', href: '/dashboard/menu', icon: '🍽️', desc: 'Gérer vos produits' },
  { label: 'Agent IA', href: '/dashboard/agent', icon: '🤖', desc: 'Répondre aux avis', badge: 'BETA' },
  { label: 'Clients', href: '/dashboard/customers', icon: '👥', desc: 'Base clients' },
  { label: 'Fidélité', href: '/dashboard/loyalty', icon: '🎁', desc: 'Tampons & points' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📊', desc: 'Revenus & stats' },
  { label: 'Paramètres', href: '/dashboard/settings', icon: '⚙️', desc: 'Horaires & config' },
]

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [productCount, setProductCount] = useState<number | null>(null)
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

      const isNew = (Date.now() - new Date(resto.created_at).getTime()) < 3 * 60_000
      let sub = null
      const { data: existingSub } = await supabase.from('restaurant_subscriptions').select('status, past_due_since').eq('restaurant_id', resto.id).single()
      if (existingSub) {
        sub = existingSub
      } else if (isNew) {
        sub = await new Promise<{ status: string; past_due_since: string | null } | null>(resolve => {
          const timeout = setTimeout(() => resolve(null), 30_000)
          const channel = supabase.channel(`sub-wait-${resto.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurant_subscriptions', filter: `restaurant_id=eq.${resto.id}` }, (payload) => {
              clearTimeout(timeout); supabase.removeChannel(channel)
              resolve(payload.new as { status: string; past_due_since: string | null })
            }).subscribe()
        })
      }
      const gracePeriodExpired = sub?.status === 'past_due' && sub.past_due_since
        && (Date.now() - new Date(sub.past_due_since).getTime()) > 2 * 24 * 3600_000
      if (!sub || (sub.status !== 'active' && sub.status !== 'past_due') || gracePeriodExpired) {
        router.push('/subscribe'); return
      }
      if (!resto.onboarding_done) { router.push('/dashboard/onboarding'); return }

      setRestaurant(resto)
      const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', resto.id).order('created_at', { ascending: false }).limit(10)
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('restaurant_id', resto.id)
      setProductCount(count ?? 0)
      setOrders(ordersData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(249,115,22,0.4)', animation: 'pulse 1s infinite' }} />
        <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  )

  const GREETINGS = ['Bonjour', 'Bienvenue', 'Ravis de vous revoir']
  const greeting = GREETINGS[Math.floor(Date.now() / 10000) % GREETINGS.length]
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const todayOrders = orders.filter(o => o.created_at?.startsWith(new Date().toISOString().split('T')[0])).length

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
        background: 'rgba(255,251,245,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={36} height={36} style={{ borderRadius: '50%' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1208', margin: 0 }}>{restaurant.name}</p>
            <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/restaurant/${restaurant.slug}`} target="_blank" style={{ fontSize: 13, color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>
            Voir ma page →
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }} style={{ fontSize: 13, color: '#78716C', background: 'none', border: 'none', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#1A1208', margin: 0, letterSpacing: '-0.5px' }}>
            {greeting}, <span style={{ color: '#f97316' }}>{restaurant.name}</span> 👋
          </p>
        </div>

        {/* Bannière menu vide */}
        {productCount === 0 && (
          <Link href="/dashboard/menu" style={{
            display: 'flex', alignItems: 'center', gap: 14, borderRadius: 18, padding: '18px 22px',
            background: 'rgba(249,115,22,0.06)', border: '1.5px solid rgba(249,115,22,0.2)',
            textDecoration: 'none', marginBottom: 24,
          }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#ea580c', margin: '0 0 3px' }}>Votre menu est vide</p>
              <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Ajoutez vos premiers plats pour que vos clients puissent commander.</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316', flexShrink: 0 }}>Configurer →</span>
          </Link>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: "Commandes aujourd'hui", value: todayOrders, color: '#3b82f6', icon: '📋' },
            { label: 'En attente', value: pendingOrders, color: '#f59e0b', icon: '⏳' },
            { label: 'Revenus (en ligne)', value: `${totalRevenue.toFixed(2)}€`, color: '#10b981', icon: '💰' },
          ].map((stat, i) => (
            <div key={i} style={{ borderRadius: 20, padding: '24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 12, color: '#A8A29E', margin: '0 0 12px' }}>{stat.icon} {stat.label}</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: stat.color, margin: 0, letterSpacing: '-1px' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 32 }}>
          {NAV.map(item => {
            const isPremium = !!(item as any).badge
            return (
              <Link key={item.href} href={item.href} style={{
                borderRadius: 18, padding: '20px',
                background: isPremium ? 'rgba(249,115,22,0.05)' : 'white',
                border: isPremium ? '1.5px solid rgba(249,115,22,0.2)' : '1.5px solid rgba(0,0,0,0.07)',
                textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {isPremium && (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#f97316', padding: '4px 10px', borderRadius: '0 18px 0 12px', fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>
                    ✦ BETA
                  </div>
                )}
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>{item.desc}</p>
              </Link>
            )
          })}
        </div>

        {/* Dernières commandes */}
        <div style={{ borderRadius: 20, background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1208', margin: 0 }}>Dernières commandes</p>
            <Link href="/dashboard/orders" style={{ fontSize: 13, color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>Voir tout →</Link>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🛒</p>
              <p style={{ color: '#A8A29E', fontSize: 14 }}>Aucune commande pour l'instant</p>
            </div>
          ) : (
            <div>
              {orders.map((order, i) => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: i < orders.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1208', margin: '0 0 4px' }}>{order.first_name} {order.last_name}</p>
                    <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>#{order.order_number} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1208', margin: 0 }}>{Number(order.total_price).toFixed(2)}€</p>
                    <span style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 100, fontWeight: 600,
                      background: order.status === 'pending' ? 'rgba(245,158,11,0.1)' : order.status === 'ready' ? 'rgba(16,185,129,0.1)' : order.status === 'preparing' ? 'rgba(249,115,22,0.1)' : 'rgba(0,0,0,0.05)',
                      color: order.status === 'pending' ? '#f59e0b' : order.status === 'ready' ? '#10b981' : order.status === 'preparing' ? '#f97316' : '#A8A29E',
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
