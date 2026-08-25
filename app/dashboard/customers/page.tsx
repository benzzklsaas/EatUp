'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type LoyaltyAccount = {
  customer_id: string
  stamps_count: number
  points_balance: number
}

type Customer = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  total_orders: number
  last_order_date: string
  created_at: string
  loyalty?: LoyaltyAccount
}

type Program = {
  stamps_enabled: boolean
  stamps_threshold: number
  stamps_reward_label: string
  points_enabled: boolean
  points_per_reward: number
  points_reward_label: string
} | null

export default function CustomersPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [program, setProgram] = useState<Program>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [creditForm, setCreditForm] = useState({ stamps: '', points: '' })
  const [crediting, setCrediting] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function loadCustomers(resto: { id: string }): Promise<Customer[]> {
    const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', resto.id).order('created_at', { ascending: false })
    setOrders(ordersData || [])

    const { data: accountsData } = await supabase
      .from('loyalty_accounts')
      .select('customer_id, stamps_count, points_balance, customers(email)')
      .eq('restaurant_id', resto.id)
    const accountByEmail = new Map<string, LoyaltyAccount>()
    for (const a of (accountsData || []) as any[]) {
      const email = a.customers?.email?.toLowerCase()
      if (email) accountByEmail.set(email, { customer_id: a.customer_id, stamps_count: a.stamps_count, points_balance: a.points_balance })
    }

    const customerMap = new Map<string, Customer>()
    for (const order of (ordersData || [])) {
      if (!customerMap.has(order.email)) {
        customerMap.set(order.email, {
          id: order.id, first_name: order.first_name, last_name: order.last_name, phone: order.phone, email: order.email,
          total_orders: 1, last_order_date: order.created_at, created_at: order.created_at,
          loyalty: accountByEmail.get(order.email?.toLowerCase()),
        })
      } else {
        customerMap.get(order.email)!.total_orders++
      }
    }
    const list = Array.from(customerMap.values())
    setCustomers(list)
    return list
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurantId(resto.id)

      const { data: programData } = await supabase.from('loyalty_programs').select('*').eq('restaurant_id', resto.id).maybeSingle()
      setProgram(programData)

      await loadCustomers(resto)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
  const customerOrders = selected ? orders.filter(o => o.email === selected.email) : []
  const totalRevenue = customerOrders.reduce((sum, o) => sum + Number(o.total_price), 0)

  const stampsAvailable = selected?.loyalty && program?.stamps_enabled ? Math.floor(selected.loyalty.stamps_count / program.stamps_threshold) : 0
  const pointsAvailable = selected?.loyalty && program?.points_enabled ? Math.floor(selected.loyalty.points_balance / program.points_per_reward) : 0

  async function refreshSelected() {
    if (!restaurantId || !selected) return
    const list = await loadCustomers({ id: restaurantId })
    const updated = list.find(c => c.email === selected.email)
    if (updated) setSelected(updated)
  }

  async function handleCredit() {
    if (!selected) return
    const stamps = Number(creditForm.stamps || 0)
    const points = Number(creditForm.points || 0)
    if (stamps <= 0 && points <= 0) return
    setCrediting(true)
    setActionMsg('')
    const res = await fetch('/api/loyalty/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: selected.email, phone: selected.phone, firstName: selected.first_name, lastName: selected.last_name, stamps, points, note: 'Ajout manuel — commerçant' }),
    })
    if (res.ok) {
      setCreditForm({ stamps: '', points: '' })
      setActionMsg('✓ Crédité')
      await refreshSelected()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Erreur' }))
      setActionMsg(error || 'Erreur')
    }
    setCrediting(false)
  }

  async function handleRedeem(type: 'stamps' | 'points') {
    if (!selected?.loyalty) return
    setRedeeming(true)
    setActionMsg('')
    const res = await fetch('/api/loyalty/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: selected.loyalty.customer_id, type }),
    })
    if (res.ok) {
      setActionMsg('🎁 Récompense remise')
      await refreshSelected()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Erreur' }))
      setActionMsg(error || 'Erreur')
    }
    setRedeeming(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(255,251,245,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1208', margin: 0 }}>Clients</p>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.15)', color: '#f97316', fontWeight: 600 }}>{customers.length}</span>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
        <input
          placeholder="Rechercher un client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 14, background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', color: '#1A1208', outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
        />

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>👥</p>
            <p style={{ color: '#78716C', fontSize: 15 }}>Aucun client trouvé</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(customer => (
              <div key={customer.email} onClick={() => setSelected(customer)} style={{ borderRadius: 18, padding: '16px 20px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, background: 'rgba(99,102,241,0.15)', color: '#f97316', flexShrink: 0 }}>
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 3px' }}>{customer.first_name} {customer.last_name}</p>
                    <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>{customer.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f97316', margin: '0 0 3px' }}>{customer.total_orders} commande{customer.total_orders > 1 ? 's' : ''}</p>
                  {customer.loyalty ? (
                    <p style={{ fontSize: 11, color: '#A8A29E', margin: 0 }}>
                      {program?.stamps_enabled && `🥙 ${customer.loyalty.stamps_count}`}
                      {program?.stamps_enabled && program?.points_enabled && ' · '}
                      {program?.points_enabled && `⭐ ${customer.loyalty.points_balance}`}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>{new Date(customer.last_order_date).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 24, padding: '36px 32px', background: 'white', border: '1.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, background: 'rgba(99,102,241,0.15)', color: '#f97316' }}>
                  {selected.first_name[0]}{selected.last_name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#1A1208', margin: '0 0 4px' }}>{selected.first_name} {selected.last_name}</p>
                  <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>{selected.total_orders} commande{selected.total_orders > 1 ? 's' : ''} · {totalRevenue.toFixed(2)}€</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, background: '#FAFAF8', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 13, margin: 0 }}><span style={{ color: '#78716C' }}>Email : </span><span style={{ color: 'white' }}>{selected.email}</span></p>
              <p style={{ fontSize: 13, margin: 0 }}><span style={{ color: '#78716C' }}>Téléphone : </span><span style={{ color: 'white' }}>{selected.phone}</span></p>
            </div>

            {program && (program.stamps_enabled || program.points_enabled) && (
              <div style={{ marginBottom: 24, borderRadius: 14, padding: 16, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>🎁 Fidélité</p>

                <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                  {program.stamps_enabled && (
                    <div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#1A1208', margin: 0 }}>{selected.loyalty?.stamps_count ?? 0}<span style={{ fontSize: 13, color: '#A8A29E', fontWeight: 600 }}> / {program.stamps_threshold} 🥙</span></p>
                      {stampsAvailable > 0 && <p style={{ fontSize: 11, color: '#f97316', fontWeight: 700, margin: '2px 0 0' }}>{stampsAvailable} récompense{stampsAvailable > 1 ? 's' : ''} disponible{stampsAvailable > 1 ? 's' : ''}</p>}
                    </div>
                  )}
                  {program.points_enabled && (
                    <div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#1A1208', margin: 0 }}>{selected.loyalty?.points_balance ?? 0}<span style={{ fontSize: 13, color: '#A8A29E', fontWeight: 600 }}> pts</span></p>
                      {pointsAvailable > 0 && <p style={{ fontSize: 11, color: '#f97316', fontWeight: 700, margin: '2px 0 0' }}>{pointsAvailable} récompense{pointsAvailable > 1 ? 's' : ''} disponible{pointsAvailable > 1 ? 's' : ''}</p>}
                    </div>
                  )}
                </div>

                {(stampsAvailable > 0 || pointsAvailable > 0) && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {stampsAvailable > 0 && (
                      <button onClick={() => handleRedeem('stamps')} disabled={redeeming} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 12 }}>
                        Offrir : {program.stamps_reward_label}
                      </button>
                    )}
                    {pointsAvailable > 0 && (
                      <button onClick={() => handleRedeem('points')} disabled={redeeming} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 12 }}>
                        Offrir : {program.points_reward_label}
                      </button>
                    )}
                  </div>
                )}

                <p style={{ fontSize: 11, color: '#78716C', fontWeight: 600, margin: '0 0 8px' }}>Ajouter manuellement (client payé en caisse)</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {program.stamps_enabled && (
                    <input type="number" min={0} placeholder="Tampons" value={creditForm.stamps} onChange={e => setCreditForm({ ...creditForm, stamps: e.target.value })} style={{ width: 70, borderRadius: 10, padding: '9px 10px', fontSize: 13, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none' }} />
                  )}
                  {program.points_enabled && (
                    <input type="number" min={0} placeholder="Points" value={creditForm.points} onChange={e => setCreditForm({ ...creditForm, points: e.target.value })} style={{ width: 70, borderRadius: 10, padding: '9px 10px', fontSize: 13, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none' }} />
                  )}
                  <button onClick={handleCredit} disabled={crediting} style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid rgba(249,115,22,0.3)', cursor: 'pointer', background: 'white', color: '#f97316', fontWeight: 700, fontSize: 12 }}>
                    {crediting ? '...' : 'Créditer'}
                  </button>
                </div>
                {actionMsg && <p style={{ fontSize: 12, color: '#78716C', margin: '8px 0 0' }}>{actionMsg}</p>}
              </div>
            )}

            <p style={{ fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Historique</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {customerOrders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1208', margin: '0 0 3px' }}>#{order.order_number}</p>
                    <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#f97316', margin: 0 }}>{Number(order.total_price).toFixed(2)}€</p>
                </div>
              ))}
            </div>

            <button onClick={() => setSelected(null)} style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#78716C', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
