'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  total_orders: number
  last_order_date: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }

      const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', resto.id).order('created_at', { ascending: false })
      setOrders(ordersData || [])

      const customerMap = new Map<string, Customer>()
      for (const order of (ordersData || [])) {
        if (!customerMap.has(order.email)) {
          customerMap.set(order.email, { id: order.id, first_name: order.first_name, last_name: order.last_name, phone: order.phone, email: order.email, total_orders: 1, last_order_date: order.created_at, created_at: order.created_at })
        } else {
          customerMap.get(order.email)!.total_orders++
        }
      }
      setCustomers(Array.from(customerMap.values()))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
  const customerOrders = selected ? orders.filter(o => o.email === selected.email) : []
  const totalRevenue = customerOrders.reduce((sum, o) => sum + Number(o.total_price), 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Clients</p>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600 }}>{customers.length}</span>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
        <input
          placeholder="Rechercher un client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 14, background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
        />

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>👥</p>
            <p style={{ color: '#374151', fontSize: 15 }}>Aucun client trouvé</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(customer => (
              <div key={customer.email} onClick={() => setSelected(customer)} style={{ borderRadius: 18, padding: '16px 20px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, background: 'rgba(99,102,241,0.15)', color: '#818cf8', flexShrink: 0 }}>
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 3px' }}>{customer.first_name} {customer.last_name}</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{customer.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', margin: '0 0 3px' }}>{customer.total_orders} commande{customer.total_orders > 1 ? 's' : ''}</p>
                  <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{new Date(customer.last_order_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 24, padding: '36px 32px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                  {selected.first_name[0]}{selected.last_name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>{selected.first_name} {selected.last_name}</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{selected.total_orders} commande{selected.total_orders > 1 ? 's' : ''} · {totalRevenue.toFixed(2)}€</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 13, margin: 0 }}><span style={{ color: '#4b5563' }}>Email : </span><span style={{ color: 'white' }}>{selected.email}</span></p>
              <p style={{ fontSize: 13, margin: 0 }}><span style={{ color: '#4b5563' }}>Téléphone : </span><span style={{ color: 'white' }}>{selected.phone}</span></p>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Historique</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {customerOrders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: '0 0 3px' }}>#{order.order_number}</p>
                    <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#818cf8', margin: 0 }}>{Number(order.total_price).toFixed(2)}€</p>
                </div>
              ))}
            </div>

            <button onClick={() => setSelected(null)} style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
