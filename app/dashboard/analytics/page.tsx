'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      const { data } = await supabase.from('orders').select('*').eq('restaurant_id', resto.id).order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const uniqueCustomers = new Set(orders.map(o => o.email)).size
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length
  const onlinePayments = orders.filter(o => o.payment_method === 'online').length
  const cashPayments = orders.filter(o => o.payment_method === 'cash').length

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => o.created_at?.startsWith(key))
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      count: dayOrders.length,
      revenue: dayOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0),
    }
  })
  const maxRevenue = Math.max(...last7Days.map(d => d.revenue), 1)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 48 }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Analytics</p>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'Revenus totaux', value: `${totalRevenue.toFixed(2)}€`, color: '#4ade80', icon: '💰' },
            { label: 'Commandes', value: totalOrders, color: '#60a5fa', icon: '📋' },
            { label: 'Panier moyen', value: `${avgOrder.toFixed(2)}€`, color: '#f59e0b', icon: '🛒' },
            { label: 'Clients uniques', value: uniqueCustomers, color: '#a78bfa', icon: '👥' },
          ].map((kpi, i) => (
            <div key={i} style={{ borderRadius: 20, padding: '24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, color: '#374151', margin: '0 0 12px' }}>{kpi.icon} {kpi.label}</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: kpi.color, margin: 0, letterSpacing: '-1px' }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Graphique 7 jours */}
        <div style={{ borderRadius: 20, padding: '28px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 24px' }}>Revenus — 7 derniers jours</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {last7Days.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                {day.revenue > 0 && <p style={{ fontSize: 10, color: '#818cf8', margin: 0, fontWeight: 700 }}>{day.revenue.toFixed(0)}€</p>}
                <div style={{
                  width: '100%', borderRadius: '6px 6px 0 0',
                  height: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 6 : 3)}%`,
                  background: day.revenue > 0 ? 'linear-gradient(180deg, #818cf8, #6366f1)' : 'rgba(255,255,255,0.05)',
                }} />
                <p style={{ fontSize: 10, color: '#374151', margin: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>{day.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statuts et paiements */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ borderRadius: 20, padding: '28px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>Statuts des commandes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'En attente', count: pendingCount, color: '#f59e0b' },
                { label: 'Terminées', count: completedCount, color: '#4ade80' },
                { label: 'Annulées', count: cancelledCount, color: '#ef4444' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>{item.label}</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>{item.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: 6, borderRadius: 100, background: item.color, width: totalOrders > 0 ? `${(item.count / totalOrders) * 100}%` : '0%', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 20, padding: '28px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>Modes de paiement</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: '💳 En ligne', count: onlinePayments, color: '#818cf8' },
                { label: '💵 En caisse', count: cashPayments, color: '#4b5563' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>{item.label}</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>{item.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: 6, borderRadius: 100, background: item.color, width: totalOrders > 0 ? `${(item.count / totalOrders) * 100}%` : '0%', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
