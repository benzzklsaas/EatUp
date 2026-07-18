'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7j' | '30j' | 'total'>('30j')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Filtre par période
  const now = new Date()
  const filteredOrders = orders.filter(o => {
    if (period === 'total') return true
    const days = period === '7j' ? 7 : 30
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - days)
    return new Date(o.created_at) >= cutoff
  })

  // KPIs
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_price), 0)
  const totalOrders = filteredOrders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const uniqueCustomers = new Set(filteredOrders.map(o => o.email)).size

  // CA du mois en cours
  const thisMonth = orders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const revenueThisMonth = thisMonth.reduce((sum, o) => sum + Number(o.total_price), 0)

  // Graphique 30 jours
  const chartDays = period === '7j' ? 7 : 30
  const chartData = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (chartDays - 1 - i))
    const key = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => o.created_at?.startsWith(key) && o.status !== 'cancelled')
    return {
      label: chartDays === 7
        ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      count: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.total_price), 0),
    }
  })
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  // Heure de pointe (grouper par heure)
  const hourMap: Record<number, number> = {}
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours()
    hourMap[h] = (hourMap[h] || 0) + 1
  })
  const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]
  const peakHourLabel = peakHour ? `${peakHour[0]}h–${Number(peakHour[0]) + 1}h` : '—'
  const hourBars = Array.from({ length: 24 }, (_, h) => ({ h, count: hourMap[h] || 0 }))
    .filter(b => b.h >= 9 && b.h <= 23)
  const maxHourCount = Math.max(...hourBars.map(b => b.count), 1)

  // Top produits
  const productMap: Record<string, { name: string; count: number; revenue: number }> = {}

  // Statuts
  const pendingCount = filteredOrders.filter(o => o.status === 'pending').length
  const preparingCount = filteredOrders.filter(o => o.status === 'preparing').length
  const readyCount = filteredOrders.filter(o => o.status === 'ready').length
  const completedCount = filteredOrders.filter(o => o.status === 'completed').length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14' }}>
      <p style={{ color: '#78716C', fontSize: 14, fontFamily: 'system-ui' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 56 }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1208', margin: 0 }}>Analytics</p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['7j', '30j', 'total'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: period === p ? '#6366f1' : 'rgba(255,255,255,0.06)', color: period === p ? 'white' : '#6b7280' }}>
              {p === 'total' ? 'Tout' : p}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* CA du mois — mise en avant */}
        <div style={{ borderRadius: 24, padding: '28px 32px', background: 'linear-gradient(135deg, #1d1b4b, #2d1f6e)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              CA {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
            <p style={{ fontSize: 42, fontWeight: 900, color: '#1A1208', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>
              {revenueThisMonth.toFixed(2)}<span style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>€</span>
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>{thisMonth.length} commande{thisMonth.length > 1 ? 's' : ''} ce mois-ci</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>Heure de pointe</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#a78bfa', margin: 0 }}>{peakHourLabel}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>{peakHour ? `${peakHour[1]} commande${Number(peakHour[1]) > 1 ? 's' : ''}` : ''}</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: 'CA période', value: `${totalRevenue.toFixed(2)}€`, color: '#4ade80', sub: `${totalOrders} commande${totalOrders > 1 ? 's' : ''}` },
            { label: 'Panier moyen', value: `${avgOrder.toFixed(2)}€`, color: '#f59e0b', sub: 'par commande' },
            { label: 'Clients uniques', value: uniqueCustomers, color: '#60a5fa', sub: 'emails différents' },
            { label: 'Terminées', value: completedCount, color: '#a78bfa', sub: `${totalOrders > 0 ? Math.round(completedCount / totalOrders * 100) : 0}% du total` },
          ].map((kpi, i) => (
            <div key={i} style={{ borderRadius: 20, padding: '20px 22px', background: '#0d1424', border: '1.5px solid rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 12, color: '#78716C', margin: '0 0 8px', fontWeight: 600 }}>{kpi.label}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: kpi.color, margin: '0 0 4px', letterSpacing: '-0.8px' }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Graphique CA */}
        <div style={{ borderRadius: 20, padding: '24px', background: '#0d1424', border: '1.5px solid rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 20px' }}>
            Chiffre d'affaires — {period === '7j' ? '7 derniers jours' : period === '30j' ? '30 derniers jours' : 'tout'}
          </p>
          {totalRevenue === 0 ? (
            <p style={{ color: '#78716C', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucune commande sur cette période</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: chartDays > 14 ? 3 : 8, height: 130 }}>
              {chartData.map((day, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  {day.revenue > 0 && <p style={{ fontSize: 9, color: '#f97316', margin: 0, fontWeight: 700 }}>{day.revenue.toFixed(0)}€</p>}
                  <div style={{
                    width: '100%', borderRadius: '5px 5px 0 0',
                    height: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 8 : 3)}%`,
                    background: day.revenue > 0 ? 'linear-gradient(180deg,#818cf8,#6366f1)' : 'rgba(255,255,255,0.04)',
                  }} />
                  {chartDays <= 7 && <p style={{ fontSize: 9, color: '#78716C', margin: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>{day.label}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heure de pointe — graphique horaire */}
        <div style={{ borderRadius: 20, padding: '24px', background: '#0d1424', border: '1.5px solid rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 4px' }}>Affluence par heure</p>
          <p style={{ fontSize: 12, color: '#78716C', margin: '0 0 20px' }}>Toutes commandes confondues</p>
          {orders.length === 0 ? (
            <p style={{ color: '#78716C', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Pas encore de données</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {hourBars.map(({ h, count }) => {
                const isPeak = peakHour && Number(peakHour[0]) === h && count > 0
                return (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max((count / maxHourCount) * 100, count > 0 ? 8 : 2)}%`,
                      background: isPeak ? 'linear-gradient(180deg,#fbbf24,#f59e0b)' : count > 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.04)',
                      transition: 'height 0.4s ease',
                    }} />
                    <p style={{ fontSize: 8, color: isPeak ? '#f59e0b' : '#374151', margin: 0, fontWeight: isPeak ? 800 : 400 }}>{h}h</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Statuts */}
        <div style={{ borderRadius: 20, padding: '24px', background: '#0d1424', border: '1.5px solid rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 20px' }}>Statuts des commandes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'En attente', count: pendingCount, color: '#f59e0b' },
              { label: 'En préparation', count: preparingCount, color: '#60a5fa' },
              { label: 'Prêtes', count: readyCount, color: '#34d399' },
              { label: 'Terminées', count: completedCount, color: '#4ade80' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#78716C' }}>{item.label}</span>
                  <span style={{ color: '#1A1208', fontWeight: 700 }}>{item.count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: 6, borderRadius: 100, background: item.color, width: totalOrders > 0 ? `${(item.count / totalOrders) * 100}%` : '0%', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
