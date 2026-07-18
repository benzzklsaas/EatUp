'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Image from 'next/image'

const STEPS = [
  { key: 'pending',    label: 'Commande reçue',    icon: '📋', desc: 'Votre commande a bien été reçue par le restaurant.' },
  { key: 'preparing', label: 'En préparation',     icon: '👨‍🍳', desc: 'Le restaurant prépare votre commande.' },
  { key: 'ready',     label: 'Prête à retirer !',  icon: '✅', desc: 'Votre commande est prête. Rendez-vous au comptoir !' },
]

export default function SuiviPage() {
  const params = useParams()
  const orderNumber = Array.isArray(params.orderNumber) ? params.orderNumber[0] : params.orderNumber as string
  const supabase = createClient()

  const [order, setOrder] = useState<any>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase
        .from('orders')
        .select('*, restaurants(*)')
        .eq('order_number', orderNumber)
        .single()

      if (!o) { setNotFound(true); setLoading(false); return }
      setOrder(o)
      setRestaurant(o.restaurants)
      setLoading(false)

      // Temps réel
      const channel = supabase.channel(`suivi-${o.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${o.id}` }, (payload) => {
          setOrder((prev: any) => ({ ...prev, ...payload.new }))
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    const cleanup = load()
    return () => { cleanup?.then(fn => fn?.()) }
  }, [orderNumber])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 20px #6366f1', animation: 'pulse 1s infinite' }} />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Commande introuvable</p>
        <p style={{ color: '#4b5563', fontSize: 14 }}>Vérifiez le numéro de commande.</p>
      </div>
    </div>
  )

  const currentStep = STEPS.findIndex(s => s.key === order.status)
  const stepIndex = currentStep === -1 ? 0 : currentStep
  const isCompleted = order.status === 'completed' || order.status === 'cancelled'
  const tz = 'Europe/Paris'
  const pickupDate = new Date(order.pickup_time)
  const pickupTimeStr = pickupDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const todayStr = new Date().toLocaleDateString('fr-FR', { timeZone: tz })
  const pickupDayStr = pickupDate.toLocaleDateString('fr-FR', { timeZone: tz })
  const pickupLabel = todayStr === pickupDayStr
    ? `Aujourd'hui à ${pickupTimeStr}`
    : pickupDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }) + ` à ${pickupTimeStr}`

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '32px 20px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2);opacity:0} }
      `}</style>

      {/* Ambient */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 420, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

        {/* Header restaurant */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          {restaurant?.logo_url
            ? <img src={restaurant.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
          }
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0 }}>{restaurant?.name}</p>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Suivi de commande #{orderNumber}</p>
          </div>
        </div>

        {/* Statut principal */}
        {!isCompleted ? (
          <div style={{ borderRadius: 24, padding: '32px 24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: `1px solid ${STEPS[stepIndex]?.key === 'ready' ? 'rgba(74,222,128,0.3)' : 'rgba(99,102,241,0.2)'}`, marginBottom: 20, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Ping pour "prêt" */}
            {order.status === 'ready' && (
              <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4ade80', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#4ade80', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 52, marginBottom: 14 }}>{STEPS[stepIndex]?.icon}</div>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.3px' }}>{STEPS[stepIndex]?.label}</p>
            <p style={{ fontSize: 14, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>{STEPS[stepIndex]?.desc}</p>
          </div>
        ) : (
          <div style={{ borderRadius: 24, padding: '32px 24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{order.status === 'cancelled' ? '❌' : '🎉'}</div>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>{order.status === 'cancelled' ? 'Commande annulée' : 'Commande terminée'}</p>
            <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>{order.status === 'cancelled' ? 'Contactez le restaurant pour plus d\'infos.' : 'Merci et à bientôt !'}</p>
          </div>
        )}

        {/* Barre de progression */}
        {!isCompleted && (
          <div style={{ borderRadius: 20, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Ligne de fond */}
              <div style={{ position: 'absolute', left: 18, right: 18, top: 18, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 0 }} />
              {/* Ligne de progression */}
              <div style={{ position: 'absolute', left: 18, top: 18, height: 2, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', zIndex: 0, width: `calc(${(stepIndex / (STEPS.length - 1)) * 100}% - 36px * ${stepIndex / (STEPS.length - 1)})`, transition: 'width 0.6s ease' }} />

              {STEPS.map((step, i) => {
                const done = i <= stepIndex
                const active = i === stepIndex
                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1, flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      background: done ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
                      border: active ? '2px solid #6366f1' : done ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.4s ease',
                    }}>
                      {done ? (active ? step.icon : '✓') : step.icon}
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: done ? '#818cf8' : '#374151', margin: 0, textAlign: 'center', lineHeight: 1.3, maxWidth: 60 }}>{step.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Infos commande */}
        <div style={{ borderRadius: 20, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4b5563' }}>Retrait prévu</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{pickupLabel}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4b5563' }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{Number(order.total_price).toFixed(2)}€</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4b5563' }}>Paiement</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>{order.payment_method === 'cash' ? 'Sur place' : 'Payé en ligne'}</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#1f2937', marginTop: 24 }}>
          Cette page se met à jour automatiquement · EatUp
        </p>
      </div>
    </div>
  )
}
