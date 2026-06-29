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
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) setCart(JSON.parse(stored))

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

  useEffect(() => {
    if (products.length > 0) {
      const cats = [...new Set(products.map(p => p.category || 'Autres'))]
      setActiveCategory(cats[0])
    }
  }, [products])

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
        <p style={{ color: '#374151', fontSize: 14, fontFamily: 'system-ui' }}>Chargement du menu...</p>
      </div>
    </div>
  )

  if (!restaurant) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: 'system-ui' }}>Restaurant introuvable</p>
        <p style={{ color: '#374151', fontSize: 14, fontFamily: 'system-ui' }}>Ce lien ne correspond à aucun restaurant actif.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: cartCount > 0 ? 100 : 32 }}>

      {/* Hero header */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Glow background */}
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ padding: '48px 24px 32px', textAlign: 'center', position: 'relative' }}>
          {/* Avatar restaurant */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '2px solid rgba(99,102,241,0.3)' }}>
            🍽️
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 8px' }}>{restaurant.name}</h1>

          {restaurant.description && (
            <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 16px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{restaurant.description}</p>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 8px #4ade80' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>Ouvert · Click & Collect</span>
          </div>

          {restaurant.address && (
            <p style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>📍 {restaurant.address}</p>
          )}
        </div>
      </div>

      {/* Barre de catégories sticky */}
      {categories.length > 1 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat)
                  document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                  background: activeCategory === cat ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === cat ? 'white' : '#4b5563',
                  boxShadow: activeCategory === cat ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <main style={{ padding: '24px 16px', maxWidth: 680, margin: '0 auto' }}>
        {categories.map(cat => (
          <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#374151', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px', paddingLeft: 4 }}>{cat}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => (p.category || 'Autres') === cat).map(product => {
                const cartItem = cart.find(i => i.product.id === product.id)
                return (
                  <div key={product.id} style={{
                    borderRadius: 20, padding: '16px', display: 'flex', gap: 14, alignItems: 'center',
                    background: cartItem ? 'linear-gradient(145deg, #0f172a, rgba(99,102,241,0.08))' : 'linear-gradient(145deg, #0f172a, #111827)',
                    border: cartItem ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                  }}>
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 14, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>{product.name}</p>
                      {product.description && (
                        <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{product.description}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#818cf8', margin: 0, letterSpacing: '-0.3px' }}>{Number(product.price).toFixed(2)}€</p>
                        {cartItem ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => removeFromCart(product.id)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, background: 'rgba(255,255,255,0.08)', color: 'white' }}>−</button>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: 15, minWidth: 20, textAlign: 'center' }}>{cartItem.quantity}</span>
                            <button onClick={() => addToCart(product)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} style={{ padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8', transition: 'all 0.2s' }}>
                            + Ajouter
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
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 50, maxWidth: 640, margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/restaurant/${slug}/checkout`)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 40px rgba(99,102,241,0.5)',
              color: 'white',
            }}
          >
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{cartCount}</span>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>Voir mon panier</span>
            <span style={{ fontSize: 15, fontWeight: 900 }}>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}

    </div>
  )
}
