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

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!resto) { router.push('/dashboard'); return }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })

      setOrders(ordersData || [])

      const customerMap = new Map<string, Customer>()
      for (const order of (ordersData || [])) {
        const key = order.email
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: order.id,
            first_name: order.first_name,
            last_name: order.last_name,
            phone: order.phone,
            email: order.email,
            total_orders: 1,
            last_order_date: order.created_at,
            created_at: order.created_at,
          })
        } else {
          const c = customerMap.get(key)!
          c.total_orders++
        }
      }

      setCustomers(Array.from(customerMap.values()))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const customerOrders = selected ? orders.filter(o => o.email === selected.email) : []

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
        <h1 className="font-bold text-white text-lg">Clients</h1>
        <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: '#1e3a5f', color: '#60a5fa' }}>{customers.length}</span>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <input
          placeholder="Rechercher un client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
        />

        {filtered.length === 0 ? (
          <p className="text-center py-20" style={{ color: '#475569' }}>Aucun client</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(customer => (
              <div
                key={customer.email}
                onClick={() => setSelected(customer)}
                className="rounded-2xl p-4 flex items-center justify-between cursor-pointer transition"
                style={{ background: '#1e293b', border: '1px solid #334155' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">{customer.first_name} {customer.last_name}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: '#60a5fa' }}>{customer.total_orders} commande{customer.total_orders > 1 ? 's' : ''}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{new Date(customer.last_order_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                  {selected.first_name[0]}{selected.last_name[0]}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white">{selected.first_name} {selected.last_name}</h2>
                  <p className="text-sm" style={{ color: '#64748b' }}>{selected.total_orders} commande{selected.total_orders > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#64748b' }} className="text-xl">x</button>
            </div>

            <div className="space-y-2 text-sm mb-5">
              <p><span style={{ color: '#64748b' }}>Email : </span><span className="text-white">{selected.email}</span></p>
              <p><span style={{ color: '#64748b' }}>Telephone : </span><span className="text-white">{selected.phone}</span></p>
            </div>

            <h3 className="font-bold text-white mb-3 text-sm">Historique des commandes</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {customerOrders.map(order => (
                <div key={order.id} className="flex justify-between text-sm p-3 rounded-xl" style={{ background: '#0f172a' }}>
                  <div>
                    <p className="text-white font-medium">#{order.order_number}</p>
                    <p style={{ color: '#64748b' }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p className="font-bold" style={{ color: '#3b82f6' }}>{Number(order.total_price).toFixed(2)}euro</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full py-3 rounded-xl font-medium mt-4"
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
