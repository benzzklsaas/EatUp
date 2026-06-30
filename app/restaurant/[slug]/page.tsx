'use client'

import { useEffect, useState, useRef } from 'react'
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

type OptionItem = {
  id: string
  group_id: string
  name: string
  extra_price: number
}

type OptionGroup = {
  id: string
  product_id: string
  name: string
  min_choices: number
  max_choices: number
  items: OptionItem[]
}

type SelectedOptions = Record<string, OptionItem[]> // group_id -> selected items

type Category = { id: string; name: string; emoji: string; position: number }

type CartItem = {
  product: Product
  quantity: number
  selectedOptions?: SelectedOptions
  optionGroups?: OptionGroup[]
  extraPrice: number
  cartKey: string
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
  const [dbCategories, setDbCategories] = useState<Category[]>([])

  // Options modal
  const [optionsModal, setOptionsModal] = useState<{ product: Product; groups: OptionGroup[] } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [loadingOptions, setLoadingOptions] = useState(false)

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
        .neq('is_online', false)
        .order('category')

      setProducts(data || [])

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('position')
      setDbCategories(cats || [])

      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (products.length > 0) {
      const cats = [...new Set(products.map(p => p.category || 'Autres'))]
      setActiveCategory(dbCategories.length > 0 ? (dbCategories.find(c => cats.includes(c.name))?.name || cats[0]) : cats[0])
    }
  }, [products])

  function saveCart(newCart: CartItem[]) {
    setCart(newCart)
    localStorage.setItem(`cart_${slug}`, JSON.stringify(newCart))
  }

  async function handleAddToCart(product: Product) {
    setLoadingOptions(true)
    const { data: groups } = await supabase
      .from('product_option_groups')
      .select('*, items:product_option_items(*)')
      .eq('product_id', product.id)
      .order('created_at')

    const optGroups: OptionGroup[] = (groups || []).map((g: any) => ({ ...g, items: g.items || [] }))
    setLoadingOptions(false)

    if (optGroups.length > 0) {
      setSelectedOptions({})
      setOptionsModal({ product, groups: optGroups })
    } else {
      addToCart(product, {}, [], 0)
    }
  }

  function addToCart(product: Product, selOpts: SelectedOptions, groups: OptionGroup[], extra: number) {
    const cartKey = product.id + JSON.stringify(selOpts) + Date.now()
    saveCart([...cart, { product, quantity: 1, selectedOptions: selOpts, optionGroups: groups, extraPrice: extra, cartKey }])
  }

  function removeFromCart(cartKey: string) {
    const existing = cart.find(i => i.cartKey === cartKey)
    if (!existing) return
    if (existing.quantity === 1) saveCart(cart.filter(i => i.cartKey !== cartKey))
    else saveCart(cart.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i))
  }

  function toggleOption(group: OptionGroup, item: OptionItem) {
    const current = selectedOptions[group.id] || []
    const already = current.find(i => i.id === item.id)
    if (already) {
      setSelectedOptions({ ...selectedOptions, [group.id]: current.filter(i => i.id !== item.id) })
    } else {
      if (current.length >= group.max_choices) {
        // Replace oldest if max reached (for single choice)
        const next = group.max_choices === 1 ? [item] : [...current.slice(1), item]
        setSelectedOptions({ ...selectedOptions, [group.id]: next })
      } else {
        setSelectedOptions({ ...selectedOptions, [group.id]: [...current, item] })
      }
    }
  }

  function confirmOptions() {
    if (!optionsModal) return
    const { product, groups } = optionsModal
    const extra = groups.reduce((sum, g) => {
      return sum + (selectedOptions[g.id] || []).reduce((s, i) => s + Number(i.extra_price), 0)
    }, 0)
    addToCart(product, selectedOptions, groups, extra)
    setOptionsModal(null)
  }

  function optionsValid() {
    if (!optionsModal) return false
    return optionsModal.groups.every(g => (selectedOptions[g.id] || []).length >= g.min_choices)
  }

  const total = cart.reduce((sum, i) => sum + (i.product.price + i.extraPrice) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const productCategories = [...new Set(products.map(p => p.category || 'Autres'))]
  const orderedCategories = dbCategories.length > 0
    ? [...dbCategories.map(c => c.name).filter(n => productCategories.includes(n)), ...productCategories.filter(n => !dbCategories.find(c => c.name === n))]
    : productCategories
  const getCatEmoji = (name: string) => dbCategories.find(c => c.name === name)?.emoji || ''

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
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ padding: '48px 24px 32px', textAlign: 'center', position: 'relative' }}>
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
      {orderedCategories.length > 1 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,16,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 0' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
            {orderedCategories.map(cat => {
              const emoji = getCatEmoji(cat)
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat)
                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    flexShrink: 0, padding: '9px 18px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                    background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? 'white' : '#6b7280',
                    boxShadow: isActive ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Menu */}
      <main style={{ padding: '24px 16px', maxWidth: 680, margin: '0 auto' }}>
        {orderedCategories.map(cat => (
          <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 40, scrollMarginTop: 70 }}>
            {/* En-tête de catégorie bien visible */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px', padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
              {getCatEmoji(cat) && <span style={{ fontSize: 22 }}>{getCatEmoji(cat)}</span>}
              <span style={{ fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: '-0.2px' }}>{cat}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{products.filter(p => (p.category || 'Autres') === cat).length} plats</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => (p.category || 'Autres') === cat).map(product => {
                const cartItems = cart.filter(i => i.product.id === product.id)
                const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
                return (
                  <div key={product.id} style={{
                    borderRadius: 20, padding: '16px', display: 'flex', gap: 14, alignItems: 'center',
                    background: totalQty > 0 ? 'linear-gradient(145deg, #0f172a, rgba(99,102,241,0.08))' : 'linear-gradient(145deg, #0f172a, #111827)',
                    border: totalQty > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
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
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={loadingOptions}
                          style={{ padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          {totalQty > 0 && <span style={{ background: '#6366f1', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{totalQty}</span>}
                          + Ajouter
                        </button>
                      </div>
                      {/* Show cart items with options */}
                      {cartItems.length > 0 && cartItems.some(i => i.optionGroups && i.optionGroups.length > 0) && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {cartItems.map(ci => (
                            <div key={ci.cartKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 10, background: 'rgba(99,102,241,0.08)' }}>
                              <span style={{ fontSize: 11, color: '#818cf8' }}>
                                {ci.optionGroups?.map(g => (selectedOptions[g.id] || ci.selectedOptions?.[g.id] || []).map(i => i.name).join(', ')).filter(Boolean).join(' · ') || Object.values(ci.selectedOptions || {}).flat().map((i: any) => i.name).join(', ')}
                                {ci.extraPrice > 0 && ` +${ci.extraPrice.toFixed(2)}€`}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button onClick={() => removeFromCart(ci.cartKey)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 800 }}>−</button>
                                <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{ci.quantity}</span>
                                <button onClick={() => handleAddToCart(product)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#6366f1', color: 'white', fontWeight: 800 }}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

      {/* Modal sélection options */}
      {optionsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 540, borderRadius: '24px 24px 0 0', padding: '28px 20px 36px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: 0 }}>{optionsModal.product.name}</h3>
                <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Personnalisez votre commande</p>
              </div>
              <button onClick={() => setOptionsModal(null)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {optionsModal.groups.map(group => (
              <div key={group.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{group.name}</p>
                  <span style={{ fontSize: 11, color: '#4b5563', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 100 }}>
                    {group.max_choices === 1 ? '1 choix' : `Jusqu'à ${group.max_choices} choix`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(item => {
                    const selected = (selectedOptions[group.id] || []).some(i => i.id === item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleOption(group, item)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          outline: selected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: group.max_choices === 1 ? '50%' : 6,
                            border: `2px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                            background: selected ? '#6366f1' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {selected && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: selected ? 'white' : '#d1d5db', fontWeight: selected ? 600 : 400 }}>{item.name}</span>
                        </div>
                        {item.extra_price > 0 && (
                          <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>+{Number(item.extra_price).toFixed(2)}€</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Récap prix */}
            {(() => {
              const extra = optionsModal.groups.reduce((sum, g) => sum + (selectedOptions[g.id] || []).reduce((s, i) => s + Number(i.extra_price), 0), 0)
              const totalItem = optionsModal.product.price + extra
              return (
                <button
                  onClick={confirmOptions}
                  disabled={!optionsValid()}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: optionsValid() ? 'pointer' : 'default',
                    background: optionsValid() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                    color: optionsValid() ? 'white' : '#4b5563',
                    fontWeight: 800, fontSize: 15, marginTop: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>Ajouter au panier</span>
                  <span>{totalItem.toFixed(2)}€</span>
                </button>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
