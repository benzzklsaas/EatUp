'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  is_available: boolean
}

type CartItem = {
  product: Product
  quantity: number
}

export default function RestaurantPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_open', true)
        .single()

      if (!resto) { setLoading(false); return }
      setRestaurant(resto)

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', resto.id)
        .eq('is_available', true)
        .order('category')

      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [slug])

  function saveCart(newCart: CartItem[]) {
    setCart(newCart)
    localStorage.setItem(`cart_${slug}`, JSON.stringify(newCart))
  }

  function addToCart(product: Product) {
    const existing = cart.find(i => i.product.id === product.id)
    if (existing) saveCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    else saveCart([...cart, { product, quantity: 1 }])
  }

  function removeFromCart(productId: string) {
    const existing = cart.find(i => i.product.id === productId)
    if (!existing) return
    if (existing.quantity === 1) saveCart(cart.filter(i => i.product.id !== productId))
    else saveCart(cart.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
  }

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const categories = [...new Set(products.map(p => p.category || 'Autres'))]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Restaurant introuvable</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-32" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="px-6 py-8" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
        {restaurant.description && <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{restaurant.description}</p>}
        <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#052e16', color: '#4ade80' }}>
          ✓ Ouvert — Click & Collect
        </span>
      </div>

      {/* Menu */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        {categories.map(cat => (
          <div key={cat} className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>{cat}</h2>
            <div className="space-y-3">
              {products.filter(p => (p.category || 'Autres') === cat).map(product => {
                const cartItem = cart.find(i => i.product.id === product.id)
                return (
                  <div key={product.id} className="rounded-2xl p-4 flex gap-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{product.name}</p>
                      {product.description && <p className="text-sm mt-0.5 line-clamp-2" style={{ color: '#94a3b8' }}>{product.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold" style={{ color: '#3b82f6' }}>{Number(product.price).toFixed(2)}€</p>
                        {cartItem ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                              style={{ background: '#334155', color: 'white' }}
                            >−</button>
                            <span className="font-bold text-white w-4 text-center">{cartItem.quantity}</span>
                            <button
                              onClick={() => addToCart(product)}
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                              style={{ background: '#3b82f6', color: 'white' }}
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition"
                            style={{ background: '#3b82f6', color: 'white' }}
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Bouton panier sticky */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40">
          <button
            onClick={() => router.push(`/restaurant/${slug}/checkout`)}
            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-between px-6"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            <span className="rounded-lg px-2 py-0.5 text-sm" style={{ background: '#1d4ed8' }}>{cartCount}</span>
            <span>Voir mon panier</span>
            <span>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}
    </div>
  )
}
