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

const COLUMNS = [
  { key: 'pending',    label: 'En attente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  next: 'preparing', nextLabel: '→ En prépa' },
  { key: 'preparing', label: 'En préparation', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  next: 'ready',     nextLabel: '→ Prêt' },
  { key: 'ready',     label: 'Prêt',           color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  next: 'completed', nextLabel: '✓ Terminé' },
  { key: 'completed', label: 'Terminé',        color: '#475569', bg: 'rgba(71,85,105,0.08)',   next: null,        nextLabel: '' },
  { key: 'all',       label: 'Toutes',         color: '#818cf8', bg: 'rgba(129,140,248,0.06)', next: null,        nextLabel: '' },
]

let audioCtx: AudioContext | null = null
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.02)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.2)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.25)
    })
  } catch (_) {}
}

function esc(s: string) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [toast, setToast] = useState<{ name: string; amount: string; orderId: string } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({ completed: false, all: false })
  const [restaurantName, setRestaurantName] = useState('')
  const [alertingOrders, setAlertingOrders] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()
  const restaurantId = useRef<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ringInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchItemsAndPrint(order: Order) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    const pickupTime = new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (!printRef.current) return
    printRef.current.innerHTML = `
      <div style="font-family:monospace;font-size:14px;width:280px;padding:12px;">
        <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;margin-bottom:10px;">
          <div style="font-size:18px;font-weight:bold;">${esc(restaurantName||'EatUp')}</div>
          <div style="font-size:11px;color:#555;">Reçu le ${esc(now)}</div>
        </div>
        <div style="text-align:center;font-size:28px;font-weight:900;letter-spacing:2px;margin:8px 0;">#${esc(order.order_number)}</div>
        <div style="text-align:center;font-size:13px;font-weight:bold;margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:8px;">⏰ Retrait à ${esc(pickupTime)}</div>
        <div style="font-size:13px;margin-bottom:8px;display:flex;justify-content:space-between;">
          <div><strong>${esc(order.first_name)} ${esc(order.last_name)}</strong><br/>${esc(order.phone||'')}</div>
          <div style="font-size:12px;font-weight:bold;border:2px solid #000;padding:2px 6px;">${order.payment_status === 'paid' ? 'PAYÉ EN LIGNE' : 'NON RÉGLÉ'}</div>
        </div>
        <div style="border-top:1px dashed #000;padding-top:8px;margin-bottom:8px;">
          ${(items||[]).map((item:any)=>`
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span><strong>${esc(String(item.quantity))}x</strong> ${esc(item.product_name)}</span>
              <span>${Number(item.price*item.quantity).toFixed(2)}€</span>
            </div>
            ${item.options?`<div style="font-size:11px;color:#555;padding-left:16px;">→ ${esc(item.options)}</div>`:''}
          `).join('')}
        </div>
        <div style="border-top:2px dashed #000;padding-top:8px;display:flex;justify-content:space-between;font-size:15px;font-weight:bold;">
          <span>TOTAL</span><span>${Number(order.total_price).toFixed(2)}€</span>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:11px;color:#555;">Paiement en caisse · Merci !</div>
      </div>`
    window.print()
  }

  const startRinging = useCallback((orderId: string) => {
    if (!soundEnabled) return
    if (ringInterval.current) return // déjà en train de sonner
    playNotificationSound()
    ringInterval.current = setInterval(() => {
      playNotificationSound()
    }, 2500)
  }, [soundEnabled])

  const stopRinging = useCallback(() => {
    if (ringInterval.current) { clearInterval(ringInterval.current); ringInterval.current = null }
  }, [])

  const acknowledgeOrder = useCallback((orderId: string) => {
    setAlertingOrders(prev => {
      const next = new Set(prev)
      next.delete(orderId)
      if (next.size === 0) stopRinging()
      return next
    })
    setToast(t => t?.orderId === orderId ? null : t)
  }, [stopRinging])

  const showToast = useCallback((order: Order) => {
    setAlertingOrders(prev => new Set(prev).add(order.id))
    setToast({ name: `${order.first_name} ${order.last_name}`, amount: `${Number(order.total_price).toFixed(2)}€`, orderId: order.id })
    startRinging(order.id)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Nouvelle commande EatUp', {
        body: `${order.first_name} ${order.last_name} — ${Number(order.total_price).toFixed(2)}€`,
        icon: '/LogoEatUp.PNG',
      })
    }
  }, [soundEnabled, startRinging])

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
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      restaurantId.current = resto.id
      const { data: restoFull } = await supabase.from('restaurants').select('name').eq('id', resto.id).single()
      if (restoFull) setRestaurantName(restoFull.name)
      const { data } = await supabase.from('orders').select('*').eq('restaurant_id', resto.id).order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
      channel = supabase.channel(`orders-${resto.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${resto.id}` }, (payload) => {
          const newOrder = payload.new as Order
          setOrders(prev => [newOrder, ...prev])
          showToast(newOrder)
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

  async function openDetail(order: Order) {
    setSelected(order)
    acknowledgeOrder(order.id)
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setSelectedItems(items || [])
  }

  const formatPickup = (iso: string) => {
    const d = new Date(iso)
    const tz = 'Europe/Paris'
    const todayStr = new Date().toLocaleDateString('fr-FR', { timeZone: tz })
    const dStr = d.toLocaleDateString('fr-FR', { timeZone: tz })
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
    return todayStr === dStr
      ? `Aujourd'hui ${time}`
      : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }) + ' ' + time
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <p style={{ color: '#78716C' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4) } 50% { box-shadow: 0 0 0 8px rgba(245,158,11,0) } }
        @media print { body > *:not(#print-ticket) { display: none !important; } #print-ticket { display: block !important; } }
      `}</style>
      <div id="print-ticket" ref={printRef} style={{ display: 'none' }} />

      {/* Toast — persiste jusqu'au clic sur la commande */}
      {toast && (
        <div
          onClick={() => { const o = orders.find(o => o.id === toast.orderId); if (o) openDetail(o) }}
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: 'white', border: '2px solid #f59e0b', borderRadius: 16, padding: '16px 20px', minWidth: 300, boxShadow: '0 8px 40px rgba(245,158,11,0.25)', animation: 'slideIn 0.3s ease', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#1A1208', fontWeight: 800, fontSize: 14, margin: 0 }}>Nouvelle commande !</p>
              <p style={{ color: '#f59e0b', fontSize: 13, margin: '2px 0 0' }}>{toast.name} — <strong>{toast.amount}</strong></p>
              <p style={{ color: '#A8A29E', fontSize: 11, margin: '4px 0 0' }}>Appuyez pour confirmer →</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 64, background: 'rgba(255,251,245,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1A1208', margin: 0 }}>Commandes</h1>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} title="Temps réel actif" />
          <span style={{ fontSize: 12, color: '#A8A29E' }}>{orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} actives</span>
        </div>
        <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', opacity: soundEnabled ? 1 : 0.3 }}>
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </header>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))', gap: 12, padding: '20px 16px', minHeight: 'calc(100vh - 65px)', alignItems: 'start', overflowX: 'auto' }}>
        {COLUMNS.map(col => {
          const colOrders = col.key === 'all' ? orders : orders.filter(o => o.status === col.key)
          const isCollapsible = col.key === 'completed' || col.key === 'all'
          const isExpanded = isCollapsible ? expandedCols[col.key] : true
          return (
            <div key={col.key} style={{ borderRadius: 16, background: col.bg, border: `1px solid ${col.color}22`, padding: '12px 10px' }}>
              {/* En-tête colonne */}
              <div
                onClick={isCollapsible ? () => setExpandedCols(p => ({ ...p, [col.key]: !p[col.key] })) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isExpanded ? 12 : 0, padding: '0 4px', cursor: isCollapsible ? 'pointer' : 'default' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: col.color, background: `${col.color}22`, borderRadius: 100, padding: '2px 8px' }}>{colOrders.length}</span>
                {isCollapsible && <span style={{ fontSize: 11, color: col.color, transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>}
              </div>

              {/* Cartes */}
              {isExpanded && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#1f2937', fontSize: 12 }}>—</div>
                )}
                {colOrders.map(order => {
                  const isAlerting = alertingOrders.has(order.id)
                  return (
                  <div
                    key={order.id}
                    onClick={() => openDetail(order)}
                    style={{
                      borderRadius: 12, background: isAlerting ? 'rgba(245,158,11,0.06)' : 'white',
                      border: `1.5px solid ${isAlerting ? '#f59e0b' : col.key === 'pending' ? col.color + '55' : 'rgba(0,0,0,0.07)'}`,
                      padding: '12px', cursor: 'pointer',
                      boxShadow: isAlerting ? '0 0 20px rgba(245,158,11,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                      animation: isAlerting ? 'pulse 1s infinite' : col.key === 'pending' ? 'pulse 2s infinite' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1208', margin: 0 }}>{order.first_name} {order.last_name}</p>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>#{order.order_number}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#78716C' }}>⏰ {formatPickup(order.pickup_time)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#1A1208' }}>{Number(order.total_price).toFixed(2)}€</span>
                      {col.next && (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatus(order.id, col.next!) }}
                          style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: col.color, color: '#000', whiteSpace: 'nowrap' }}
                        >
                          {col.nextLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )})}
              </div>}
            </div>
          )
        })}
      </div>

      {/* Modal détail */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '28px 24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1208', margin: '0 0 4px' }}>{selected.first_name} {selected.last_name}</h2>
                <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>#{selected.order_number} · {formatPickup(selected.pickup_time)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#A8A29E', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {/* Infos client */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.phone && <span style={{ fontSize: 12, color: '#78716C', background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '4px 10px' }}>📞 {selected.phone}</span>}
              <span style={{ fontSize: 12, color: '#78716C', background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '4px 10px' }}>💳 {selected.payment_method === 'cash' ? 'En caisse' : 'En ligne'}</span>
            </div>

            {/* Articles */}
            {selectedItems.length > 0 && (
              <div style={{ background: '#FAFAF8', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Détail commande</p>
                {selectedItems.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < selectedItems.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div>
                      <span style={{ color: '#1A1208', fontWeight: 600, fontSize: 14 }}>{item.quantity}× {item.product_name}</span>
                      {item.options && <p style={{ color: '#78716C', fontSize: 11, margin: '2px 0 0' }}>→ {item.options}</p>}
                    </div>
                    <span style={{ color: '#78716C', fontWeight: 600, fontSize: 13 }}>{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <span style={{ color: '#1A1208', fontWeight: 800, fontSize: 15 }}>Total</span>
                  <span style={{ color: '#f97316', fontWeight: 800, fontSize: 15 }}>{Number(selected.total_price).toFixed(2)}€</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fetchItemsAndPrint(selected)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'white', color: '#78716C', fontWeight: 600, fontSize: 13 }}>
                🖨️ Imprimer
              </button>
              <button onClick={() => setSelected(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 600, fontSize: 13 }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
