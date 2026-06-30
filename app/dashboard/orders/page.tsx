'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Order = {
  id: string
  order_number: string
  first_name: string
  last_name: string
  phone: string
  email: string
  total_price: number
  pickup_time: string
  payment_method: string
  payment_status: string
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  preparing: 'En préparation',
  ready: 'Prêt',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const notes = [523, 659, 784] // Do Mi Sol
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.02)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.2)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.25)
    })
  } catch (_) {}
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Order | null>(null)
  const [toast, setToast] = useState<{ name: string; amount: string } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const restaurantId = useRef<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((order: Order) => {
    if (soundEnabled) playNotificationSound()
    setToast({ name: `${order.first_name} ${order.last_name}`, amount: `${Number(order.total_price).toFixed(2)}€` })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Nouvelle commande EatUp', {
        body: `${order.first_name} ${order.last_name} — ${Number(order.total_price).toFixed(2)}€`,
        icon: '/LogoEatUp.PNG',
      })
    }
  }, [soundEnabled])

  useEffect(() => {
    const unlock = () => getAudioContext()
    window.addEventListener('click', unlock, { once: true })
    return () => window.removeEventListener('click', unlock)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!resto) {
        alert(`DEBUG - user.id: ${user.id} | erreur: ${restoError?.message}`)
        router.push('/dashboard'); return
      }
      restaurantId.current = resto.id

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)

      // Demander permission notifs navigateur
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      // Supabase Realtime
      const channel = supabase
        .channel(`orders-${resto.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${resto.id}`,
        }, (payload) => {
          const newOrder = payload.new as Order
          setOrders(prev => [newOrder, ...prev])
          showToast(newOrder)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    load()
  }, [])

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    if (selected?.id === orderId) setSelected({ ...selected!, status })
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 200,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid #3b82f6',
          borderRadius: 16, padding: '16px 20px', minWidth: 280,
          boxShadow: '0 0 40px rgba(59,130,246,0.3)',
          animation: 'slideIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🔔</div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>Nouvelle commande !</p>
              <p style={{ color: '#60a5fa', fontSize: 13, margin: '2px 0 0' }}>{toast.name} — <strong>{toast.amount}</strong></p>
            </div>
            <button onClick={() => setToast(null)} style={{ marginLeft: 'auto', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <header className="px-6 py-4 flex items-center justify-between" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
          <h1 className="font-bold text-white text-lg">Commandes</h1>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} title="Temps réel actif" />
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', opacity: soundEnabled ? 1 : 0.3 }}
          title={soundEnabled ? 'Son activé' : 'Son désactivé'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-4 py-2 rounded-full text-sm font-medium transition"
              style={{
                background: filter === s ? '#3b82f6' : '#1e293b',
                color: filter === s ? 'white' : '#94a3b8',
                border: '1px solid',
                borderColor: filter === s ? '#3b82f6' : '#334155',
              }}
            >
              {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
              <span className="ml-1 text-xs opacity-70">
                ({s === 'all' ? orders.length : orders.filter(o => o.status === s).length})
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-20" style={{ color: '#475569' }}>Aucune commande</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className="rounded-2xl p-4 flex items-center justify-between cursor-pointer transition"
                style={{ background: '#1e293b', border: `1px solid ${order.status === 'pending' ? '#f59e0b' : '#334155'}` }}
              >
                <div>
                  <p className="font-bold text-white">{order.first_name} {order.last_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    #{order.order_number} · Retrait {new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {order.payment_method === 'cash' ? '💵 En caisse' : '💳 En ligne'} · {order.payment_status === 'paid' ? '✅ Payé' : '⏳ Non payé'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{Number(order.total_price).toFixed(2)}€</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: order.status === 'pending' ? '#451a03' : order.status === 'ready' ? '#052e16' : order.status === 'preparing' ? '#1e3a5f' : '#1e293b',
                    color: order.status === 'pending' ? '#fb923c' : order.status === 'ready' ? '#4ade80' : order.status === 'preparing' ? '#60a5fa' : '#94a3b8'
                  }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-white">{selected.first_name} {selected.last_name}</h2>
                <p className="text-sm" style={{ color: '#64748b' }}>#{selected.order_number}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#64748b' }} className="text-xl">✕</button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {[
                { label: 'Téléphone', value: selected.phone },
                { label: 'Email', value: selected.email },
                { label: 'Retrait', value: new Date(selected.pickup_time).toLocaleString('fr-FR') },
                { label: 'Total', value: `${Number(selected.total_price).toFixed(2)}€` },
                { label: 'Paiement', value: `${selected.payment_method === 'cash' ? 'En caisse' : 'En ligne'} — ${selected.payment_status === 'paid' ? '✅ Payé' : '⏳ Non payé'}` },
              ].map(row => (
                <p key={row.label}>
                  <span style={{ color: '#64748b' }}>{row.label} : </span>
                  <span className="font-medium text-white">{row.value}</span>
                </p>
              ))}
            </div>

            <p className="text-sm mb-2" style={{ color: '#64748b' }}>Changer le statut :</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => updateStatus(selected.id, key)}
                  className="py-2 rounded-xl text-sm font-medium transition"
                  style={{
                    background: selected.status === key ? '#3b82f6' : '#0f172a',
                    color: selected.status === key ? 'white' : '#94a3b8',
                    border: '1px solid',
                    borderColor: selected.status === key ? '#3b82f6' : '#334155',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full py-3 rounded-xl font-medium"
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
