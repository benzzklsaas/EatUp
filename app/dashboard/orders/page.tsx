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
  const [autoPrint, setAutoPrint] = useState(true)
  const autoPrintRef = useRef(true)
  const [restaurantName, setRestaurantName] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const restaurantId = useRef<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  function esc(str: string) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  async function fetchItemsAndPrint(order: Order) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    const pickupTime = new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    if (!printRef.current) return
    printRef.current.innerHTML = `
      <div style="font-family: monospace; font-size: 14px; width: 280px; padding: 12px;">
        <div style="text-align:center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="font-size: 18px; font-weight: bold;">${esc(restaurantName || 'EatUp')}</div>
          <div style="font-size: 11px; color: #555;">Reçu le ${esc(now)}</div>
        </div>
        <div style="text-align:center; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 8px 0;">
          #${esc(order.order_number)}
        </div>
        <div style="text-align:center; font-size: 13px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
          ⏰ Retrait à ${esc(pickupTime)}
        </div>
        <div style="font-size: 13px; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <strong>${esc(order.first_name)} ${esc(order.last_name)}</strong><br/>
            ${esc(order.phone || '')}
          </div>
          <div style="font-size:12px; font-weight:bold; border: 2px solid #000; padding: 2px 6px; white-space:nowrap;">NON RÉGLÉ</div>
        </div>
        <div style="border-top: 1px dashed #000; padding-top: 8px; margin-bottom: 8px;">
          ${(items || []).map((item: any) => `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span><strong>${esc(String(item.quantity))}x</strong> ${esc(item.product_name)}</span>
              <span>${Number(item.price * item.quantity).toFixed(2)}€</span>
            </div>
            ${item.options ? `<div style="font-size:11px; color:#555; padding-left:16px;">→ ${esc(item.options)}</div>` : ''}
          `).join('')}
        </div>
        <div style="border-top: 2px dashed #000; padding-top: 8px; display:flex; justify-content:space-between; font-size:15px; font-weight:bold;">
          <span>TOTAL</span>
          <span>${Number(order.total_price).toFixed(2)}€</span>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:11px; color:#555;">
          Paiement en caisse · Merci !
        </div>
      </div>
    `
    window.print()
  }

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
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!resto) { router.push('/dashboard'); return }
      restaurantId.current = resto.id

      const { data: restoFull } = await supabase.from('restaurants').select('name').eq('id', resto.id).single()
      if (restoFull) setRestaurantName(restoFull.name)

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      channel = supabase
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
          if (autoPrintRef.current) fetchItemsAndPrint(newOrder)
        })
        .subscribe()
    }

    load()
    return () => { if (channel) supabase.removeChannel(channel) }
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
        @media print {
          body > *:not(#print-ticket) { display: none !important; }
          #print-ticket { display: block !important; }
        }
      `}</style>
      <div id="print-ticket" ref={printRef} style={{ display: 'none' }} />

      <header className="px-6 py-4 flex items-center justify-between" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
          <h1 className="font-bold text-white text-lg">Commandes</h1>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} title="Temps réel actif" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setAutoPrint(v => { autoPrintRef.current = !v; return !v }) }}
            style={{ fontSize: 13, padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 600, background: autoPrint ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', color: autoPrint ? '#4ade80' : '#475569' }}
            title={autoPrint ? 'Impression auto activée' : 'Impression auto désactivée'}
          >
            🖨️ {autoPrint ? 'Auto' : 'Off'}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', opacity: soundEnabled ? 1 : 0.3 }}
            title={soundEnabled ? 'Son activé' : 'Son désactivé'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => fetchItemsAndPrint(selected)}
                className="py-3 rounded-xl font-medium"
                style={{ flex: 1, background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                🖨️ Imprimer ticket
              </button>
              <button
                onClick={() => setSelected(null)}
                className="py-3 rounded-xl font-medium"
                style={{ flex: 1, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
