'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SuperAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedResto, setSelectedResto] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Le middleware garantit déjà que seul le superadmin peut atteindre cette page
      setAuthorized(true)

      const { data: restos } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      setRestaurants(restos || [])
      setOrders(allOrders || [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggleRestaurant(id: string, isOpen: boolean) {
    await supabase.from('restaurants').update({ is_open: !isOpen }).eq('id', id)
    setRestaurants(restaurants.map(r => r.id === id ? { ...r, is_open: !isOpen } : r))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Vérification accès...</p>
    </div>
  )

  if (!authorized) return null

  const totalOrders = orders.length
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0)
  const activeRestos = restaurants.filter(r => r.is_open).length
  const mrr = restaurants.length * 29.99

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => o.created_at?.startsWith(key))
    return {
      label: d.getDate(),
      revenue: dayOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price), 0),
      count: dayOrders.length,
    }
  })
  const maxRev = Math.max(...last30Days.map(d => d.revenue), 1)

  const restoWithOrders = restaurants.map(r => {
    const ro = orders.filter(o => o.restaurant_id === r.id)
    const lastOrder = ro[0]?.created_at
    const daysSinceLastOrder = lastOrder
      ? Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000)
      : null
    return { ...r, orderCount: ro.length, revenue: ro.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_price), 0), daysSinceLastOrder }
  })

  const atRisk = restoWithOrders.filter(r => r.daysSinceLastOrder !== null && r.daysSinceLastOrder > 7)

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'restaurants', label: '🍽️ Restaurants' },
    { key: 'orders', label: '📋 Commandes' },
    { key: 'finances', label: '💰 Finances' },
    { key: 'alerts', label: `⚠️ Alertes${atRisk.length > 0 ? ` (${atRisk.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div>
          <h1 className="font-bold text-white text-lg">EatUp — Superadmin</h1>
          <p className="text-xs" style={{ color: '#64748b' }}>Espace privé</p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/auth/login') }} style={{ color: '#64748b' }} className="text-sm">
          Déconnexion
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 overflow-x-auto" style={{ borderBottom: '1px solid #334155' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
            style={{
              background: activeTab === tab.key ? '#3b82f6' : '#1e293b',
              color: activeTab === tab.key ? 'white' : '#94a3b8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-6xl mx-auto">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'MRR', value: `${mrr.toFixed(2)}€`, sub: 'Revenu mensuel récurrent', color: '#10b981' },
                { label: 'Restaurants', value: restaurants.length, sub: `${activeRestos} ouverts`, color: '#3b82f6' },
                { label: 'Commandes totales', value: totalOrders, sub: 'Toute la plateforme', color: '#f59e0b' },
                { label: 'GMV', value: `${totalRevenue.toFixed(2)}€`, sub: 'Volume total traité', color: '#a78bfa' },
              ].map((kpi, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{kpi.label}</p>
                  <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{kpi.sub}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h2 className="font-bold text-white mb-4">Commandes — 30 derniers jours</h2>
              <div className="flex items-end gap-1 h-32">
                {last30Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max((day.revenue / maxRev) * 110, day.count > 0 ? 6 : 2)}px`,
                        background: day.count > 0 ? '#3b82f6' : '#1e3a5f',
                      }}
                    />
                    {i % 5 === 0 && <p className="text-xs" style={{ color: '#475569' }}>{day.label}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h2 className="font-bold text-white mb-4">Top restaurants par commandes</h2>
              <div className="space-y-3">
                {restoWithOrders.sort((a, b) => b.orderCount - a.orderCount).slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{r.name}</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>{r.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: '#3b82f6' }}>{r.orderCount} commandes</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>{r.revenue.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESTAURANTS */}
        {activeTab === 'restaurants' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm" style={{ color: '#64748b' }}>{restaurants.length} restaurants inscrits</p>
            </div>
            {restoWithOrders.map(r => (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white">{r.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: r.is_open ? '#052e16' : '#1e293b',
                        color: r.is_open ? '#4ade80' : '#64748b',
                      }}>
                        {r.is_open ? 'Ouvert' : 'Fermé'}
                      </span>
                      {r.daysSinceLastOrder !== null && r.daysSinceLastOrder > 7 && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#451a03', color: '#fb923c' }}>
                          ⚠️ Inactif {r.daysSinceLastOrder}j
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{r.email} · /{r.slug}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      Inscrit le {new Date(r.created_at).toLocaleDateString('fr-FR')} · {r.orderCount} commandes · {r.revenue.toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedResto(r)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: '#1e3a5f', color: '#60a5fa' }}
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => toggleRestaurant(r.id, r.is_open)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: r.is_open ? '#451a03' : '#052e16', color: r.is_open ? '#fb923c' : '#4ade80' }}
                    >
                      {r.is_open ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMMANDES */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>{orders.length} commandes sur la plateforme</p>
            {orders.slice(0, 50).map(order => {
              const resto = restaurants.find(r => r.id === order.restaurant_id)
              return (
                <div key={order.id} className="rounded-2xl p-4 flex justify-between" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <div>
                    <p className="font-bold text-white">{order.first_name} {order.last_name}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>#{order.order_number} · {resto?.name || 'Restaurant inconnu'}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{Number(order.total_price).toFixed(2)}€</p>
                    <p className="text-xs" style={{ color: order.payment_status === 'paid' ? '#4ade80' : '#fb923c' }}>
                      {order.payment_status === 'paid' ? '✅ Payé' : '⏳ Non payé'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FINANCES */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'MRR', value: `${mrr.toFixed(2)}€`, desc: `${restaurants.length} × 29,99€`, color: '#10b981' },
                { label: 'ARR', value: `${(mrr * 12).toFixed(2)}€`, desc: 'Revenu annuel récurrent', color: '#3b82f6' },
                { label: 'GMV total', value: `${totalRevenue.toFixed(2)}€`, desc: 'Volume traité sur la plateforme', color: '#a78bfa' },
              ].map((kpi, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{kpi.label}</p>
                  <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{kpi.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h2 className="font-bold text-white mb-4">Revenus par restaurant</h2>
              <div className="space-y-3">
                {restoWithOrders.sort((a, b) => b.revenue - a.revenue).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #334155' }}>
                    <div>
                      <p className="font-medium text-white">{r.name}</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>{r.orderCount} commandes</p>
                    </div>
                    <p className="font-bold" style={{ color: '#10b981' }}>{r.revenue.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ALERTES */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: '#1c1917', border: '1px solid #451a03' }}>
              <h2 className="font-bold mb-1" style={{ color: '#fb923c' }}>⚠️ Restaurants inactifs ({atRisk.length})</h2>
              <p className="text-sm mb-4" style={{ color: '#78716c' }}>Ces restaurants n'ont pas reçu de commande depuis plus de 7 jours — risque de churn.</p>
              {atRisk.length === 0 ? (
                <p style={{ color: '#4ade80' }}>✅ Tous les restaurants sont actifs</p>
              ) : (
                <div className="space-y-3">
                  {atRisk.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 rounded-xl" style={{ background: '#0c0a09' }}>
                      <div>
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="text-xs" style={{ color: '#78716c' }}>{r.email}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#fb923c' }}>
                        {r.daysSinceLastOrder}j sans commande
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h2 className="font-bold text-white mb-1">📊 Santé de la plateforme</h2>
              <div className="space-y-2 mt-3">
                {[
                  { label: 'Restaurants ouverts', value: `${activeRestos}/${restaurants.length}`, ok: activeRestos === restaurants.length },
                  { label: 'Commandes aujourd\'hui', value: orders.filter(o => o.created_at?.startsWith(new Date().toISOString().split('T')[0])).length, ok: true },
                  { label: 'Restaurants à risque', value: atRisk.length, ok: atRisk.length === 0 },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #334155' }}>
                    <p style={{ color: '#94a3b8' }}>{item.label}</p>
                    <span className="font-bold" style={{ color: item.ok ? '#4ade80' : '#fb923c' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal détail restaurant */}
      {selectedResto && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-white">{selectedResto.name}</h2>
              <button onClick={() => setSelectedResto(null)} style={{ color: '#64748b' }}>✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Email', value: selectedResto.email },
                { label: 'Slug', value: `/${selectedResto.slug}` },
                { label: 'Statut', value: selectedResto.is_open ? 'Ouvert' : 'Fermé' },
                { label: 'Commandes', value: selectedResto.orderCount },
                { label: 'Revenus', value: `${selectedResto.revenue.toFixed(2)}€` },
                { label: 'Inscrit le', value: new Date(selectedResto.created_at).toLocaleDateString('fr-FR') },
                { label: 'Dernière commande', value: selectedResto.daysSinceLastOrder !== null ? `Il y a ${selectedResto.daysSinceLastOrder}j` : 'Aucune' },
              ].map(row => (
                <p key={row.label}>
                  <span style={{ color: '#64748b' }}>{row.label} : </span>
                  <span className="text-white font-medium">{row.value}</span>
                </p>
              ))}
            </div>
            <a
              href={`/restaurant/${selectedResto.slug}`}
              target="_blank"
              className="block w-full text-center py-3 rounded-xl font-medium mt-4"
              style={{ background: '#1e3a5f', color: '#60a5fa' }}
            >
              Voir la page client →
            </a>
            <button
              onClick={() => setSelectedResto(null)}
              className="w-full py-3 rounded-xl font-medium mt-2"
              style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
