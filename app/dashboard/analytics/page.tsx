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

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!resto) { router.push('/dashboard'); return }

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

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

  const uniqueCustomers = new Set(orders.map(o => o.email)).size
  const onlinePayments = orders.filter(o => o.payment_method === 'online').length
  const cashPayments = orders.filter(o => o.payment_method === 'cash').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
        <h1 className="font-bold text-white text-lg">Analytics</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenus totaux', value: `${totalRevenue.toFixed(2)}€`, color: '#10b981' },
            { label: 'Commandes', value: totalOrders, color: '#3b82f6' },
            { label: 'Panier moyen', value: `${avgOrder.toFixed(2)}€`, color: '#f59e0b' },
            { label: 'Clients uniques', value: uniqueCustomers, color: '#a78bfa' },
          ].map((kpi, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-xs mb-1" style={{ color: '#64748b' }}>{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Graphique 7 jours */}
        <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-4">Revenus — 7 derniers jours</h2>
          <div className="flex items-end gap-2 h-40">
            {last7Days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs font-medium" style={{ color: '#60a5fa' }}>
                  {day.revenue > 0 ? `${day.revenue.toFixed(0)}€` : ''}
                </p>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((day.revenue / maxRevenue) * 120, day.revenue > 0 ? 8 : 4)}px`,
                    background: day.revenue > 0 ? '#3b82f6' : '#334155',
                  }}
                />
                <p className="text-xs text-center" style={{ color: '#64748b' }}>{day.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statuts et paiements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-4">Statuts des commandes</h2>
            <div className="space-y-3">
              {[
                { label: 'En attente', count: pendingCount, color: '#f59e0b' },
                { label: 'Terminées', count: completedCount, color: '#10b981' },
                { label: 'Annulées', count: cancelledCount, color: '#ef4444' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: '#94a3b8' }}>{item.label}</span>
                    <span className="font-medium text-white">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#0f172a' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: totalOrders > 0 ? `${(item.count / totalOrders) * 100}%` : '0%',
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h2 className="font-bold text-white mb-4">Modes de paiement</h2>
            <div className="space-y-3">
              {[
                { label: 'En ligne', count: onlinePayments, color: '#3b82f6' },
                { label: 'En caisse', count: cashPayments, color: '#64748b' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: '#94a3b8' }}>{item.label}</span>
                    <span className="font-medium text-white">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#0f172a' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: totalOrders > 0 ? `${(item.count / totalOrders) * 100}%` : '0%',
                        background: item.color,
                      }}
                    />
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
