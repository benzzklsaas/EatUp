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
  is_available: boolean
}

type OptionGroup = {
  id: string
  product_id: string
  name: string
  min_choices: number
  max_choices: number
  items: OptionItem[]
}

type SelectedOptions = Record<string, OptionItem[]>

type Category = { id: string; name: string; emoji: string; position: number }

type CartItem = {
  product: Product
  quantity: number
  selectedOptions?: SelectedOptions
  optionGroups?: OptionGroup[]
  extraPrice: number
  cartKey: string
  menuBoisson?: string
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
  const [nextOpening, setNextOpening] = useState<string | null>(null)
  const [isOpenNow, setIsOpenNow] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)

  const [optionsModal, setOptionsModal] = useState<{ product: Product; groups: OptionGroup[] } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [wantsMenu, setWantsMenu] = useState(false)
  const [menuOnlyModal, setMenuOnlyModal] = useState<Product | null>(null)
  const [selectedBoisson, setSelectedBoisson] = useState<Product | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) setCart(JSON.parse(stored))

    async function load() {
      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!resto) { setLoading(false); return }
      setRestaurant(resto)

      const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      const { data: schedules } = await supabase
        .from('restaurant_schedule')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('day_of_week')

      // Calcul ouvert/fermé selon horaires réels
      const now = new Date()
      const todayIdx = (now.getDay() + 6) % 7
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const todaySched = schedules?.find((s: any) => s.day_of_week === todayIdx)
      const openNow = todaySched && !todaySched.is_closed && (
        (todaySched.opening_time_1 && todaySched.closing_time_1 &&
          currentMinutes >= toMinutes(todaySched.opening_time_1) &&
          currentMinutes < toMinutes(todaySched.closing_time_1)) ||
        (todaySched.opening_time_2 && todaySched.closing_time_2 &&
          currentMinutes >= toMinutes(todaySched.opening_time_2) &&
          currentMinutes < toMinutes(todaySched.closing_time_2))
      )
      setIsOpenNow(!!openNow)

      if (!openNow) {
        // Chercher la prochaine ouverture : d'abord plus tard aujourd'hui, puis les jours suivants
        let found = false

        // Vérifier si le restaurant ouvre encore aujourd'hui (service du soir ou ouverture future)
        if (todaySched && !todaySched.is_closed) {
          const slots = [
            todaySched.opening_time_1,
            todaySched.opening_time_2,
          ].filter(Boolean)
          for (const t of slots) {
            if (toMinutes(t) > currentMinutes) {
              setNextOpening(`Aujourd'hui à ${t.slice(0, 5)}`)
              found = true
              break
            }
          }
        }

        if (!found) {
          const openSchedules = (schedules || []).filter((s: any) => !s.is_closed)
          for (let i = 1; i <= 7; i++) {
            const dayIdx = (todayIdx + i) % 7
            const sched = openSchedules.find((s: any) => s.day_of_week === dayIdx)
            if (sched?.opening_time_1) {
              const dayName = i === 1 ? 'Demain' : DAY_NAMES[dayIdx]
              setNextOpening(`${dayName} à ${sched.opening_time_1.slice(0, 5)}`)
              break
            }
          }
        }
      }

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', resto.id)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function saveCart(newCart: CartItem[]) {
    setCart(newCart)
    localStorage.setItem(`cart_${slug}`, JSON.stringify(newCart))
    setCartBounce(true)
    setTimeout(() => setCartBounce(false), 350)
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

    const hasMenu = (product as any).menu_extra_price > 0
    if (optGroups.length > 0) {
      setSelectedOptions({})
      setWantsMenu(hasMenu)
      setSelectedBoisson(null)
      setOptionsModal({ product, groups: optGroups })
    } else if (hasMenu) {
      setWantsMenu(true)
      setSelectedBoisson(null)
      setMenuOnlyModal(product)
    } else {
      addToCart(product, {}, [], 0)
    }
  }

  function addToCart(product: Product, selOpts: SelectedOptions, groups: OptionGroup[], extra: number, menuBoisson?: string) {
    const cartKey = product.id + JSON.stringify(selOpts) + Date.now()
    saveCart([...cart, { product, quantity: 1, selectedOptions: selOpts, optionGroups: groups, extraPrice: extra, cartKey, menuBoisson }])
  }

  function removeFromCart(cartKey: string) {
    const existing = cart.find(i => i.cartKey === cartKey)
    if (!existing) return
    if (existing.quantity === 1) saveCart(cart.filter(i => i.cartKey !== cartKey))
    else saveCart(cart.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i))
  }

  function toggleOption(group: OptionGroup, item: OptionItem) {
    if (item.is_available === false) return
    const current = selectedOptions[group.id] || []
    const already = current.find(i => i.id === item.id)
    if (already) {
      setSelectedOptions({ ...selectedOptions, [group.id]: current.filter(i => i.id !== item.id) })
    } else {
      if (current.length >= group.max_choices) {
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
    const optExtra = groups.reduce((sum, g) => sum + (selectedOptions[g.id] || []).reduce((s, i) => s + Number(i.extra_price), 0), 0)
    const menuExtra = wantsMenu ? Math.max(0, Number((product as any).menu_extra_price || 0) - Number(product.price)) : 0
    addToCart(product, selectedOptions, groups, optExtra + menuExtra, wantsMenu && selectedBoisson ? selectedBoisson.name : undefined)
    setOptionsModal(null)
    setWantsMenu(false)
    setSelectedBoisson(null)
  }

  function optionsValid() {
    if (!optionsModal) return false
    const optsOk = optionsModal.groups.every(g => (selectedOptions[g.id] || []).length >= g.min_choices)
    if (wantsMenu && !selectedBoisson) return false
    return optsOk
  }

  const total = cart.reduce((sum, i) => sum + (i.product.price + i.extraPrice) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const productCategories = [...new Set(products.map(p => p.category || 'Autres'))]
  const orderedCategories = dbCategories.length > 0
    ? [...dbCategories.map(c => c.name).filter(n => productCategories.includes(n)), ...productCategories.filter(n => !dbCategories.find(c => c.name === n))]
    : productCategories
  const getCatEmoji = (name: string) => dbCategories.find(c => c.name === name)?.emoji || ''

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: '#0d1424', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite', overflow: 'hidden' }}><img src="/LogoEatUp.PNG" alt="EatUp" style={{ width: 46, height: 46, objectFit: 'contain' }} /></div>
        <p style={{ color: '#374151', fontSize: 13, fontFamily: 'system-ui', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Chargement du menu</p>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}`}</style>
    </div>
  )

  // ── 404 ──────────────────────────────────────────────────────────────────
  if (!restaurant) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <p style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 8, fontFamily: 'system-ui' }}>Restaurant introuvable</p>
        <p style={{ color: '#374151', fontSize: 14, fontFamily: 'system-ui' }}>Ce lien ne correspond à aucun restaurant.</p>
      </div>
    </div>
  )


  // ── Page principale ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#080c14', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: cartCount > 0 ? 110 : 48 }}>
      <style>{`
        @keyframes slideUp { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        @keyframes bounceIn { 0%{transform:scale(1)} 30%{transform:scale(1.12)} 60%{transform:scale(0.95)} 100%{transform:scale(1)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header sticky (apparaît au scroll) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        transform: scrolled ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
      }}>
        {restaurant.logo_url
          ? <img src={restaurant.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
        }
        <span style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>{restaurant.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpenNow ? '#4ade80' : '#ef4444', display: 'inline-block', boxShadow: `0 0 8px ${isOpenNow ? '#4ade80' : '#ef4444'}` }} />
          <span style={{ fontSize: 12, color: isOpenNow ? '#4ade80' : '#ef4444', fontWeight: 700 }}>{isOpenNow ? 'Ouvert' : 'Fermé'}</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: restaurant.cover_image_url ? 260 : 200, overflow: 'hidden' }}>
        {restaurant.cover_image_url
          ? <>
              <img src={restaurant.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,12,20,0.2) 0%, rgba(8,12,20,0.95) 100%)' }} />
            </>
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
              <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
            </div>
        }

        {/* Infos restaurant sur le hero */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 24px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {restaurant.logo_url
            ? <div style={{ width: 80, height: 80, borderRadius: 18, flexShrink: 0, background: '#000', padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'screen' }} />
              </div>
            : <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, border: '3px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>🍽️</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{restaurant.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, background: isOpenNow ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isOpenNow ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpenNow ? '#4ade80' : '#ef4444', boxShadow: `0 0 6px ${isOpenNow ? '#4ade80' : '#ef4444'}`, display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: isOpenNow ? '#4ade80' : '#ef4444' }}>{isOpenNow ? 'Ouvert · Click & Collect' : 'Fermé'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              {restaurant.address && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  📍 {(() => {
                    const parts = restaurant.address.split(',')
                    const short = parts.slice(0, 3).join(',').trim()
                    return short || restaurant.address
                  })()}
                </span>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
                  📞 {restaurant.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bannière fermé — commandes programmées */}
      {!isOpenNow && (
        <div style={{ margin: '16px 20px 0', padding: '14px 16px', borderRadius: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🌙</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>Fermé pour le moment</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78716c' }}>
              {nextOpening ? <>Prochain retrait disponible : <strong style={{ color: '#d97706' }}>{nextOpening}</strong></> : 'Parcourez le menu et commandez pour plus tard'}
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      {restaurant.description && (
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0, maxWidth: 560 }}>{restaurant.description}</p>
        </div>
      )}

      {/* ── Barre catégories sticky ── */}
      {orderedCategories.length > 1 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,12,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px', scrollbarWidth: 'none' }}>
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
                    flexShrink: 0, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: isActive ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'white' : '#6b7280',
                    boxShadow: isActive ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Menu ── */}
      <main style={{ padding: '20px 16px', maxWidth: 700, margin: '0 auto' }}>
        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <img src="/LogoEatUp.PNG" alt="EatUp" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 12, opacity: 0.5 }} />
            <p style={{ color: '#374151', fontSize: 14 }}>Le menu arrive bientôt…</p>
          </div>
        )}

        {orderedCategories.map(cat => (
          <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 36, scrollMarginTop: 80 }}>

            {/* En-tête catégorie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {getCatEmoji(cat) && <span style={{ fontSize: 20 }}>{getCatEmoji(cat)}</span>}
              <span style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>{cat}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
              <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{products.filter(p => (p.category || 'Autres') === cat).length} plats</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => (p.category || 'Autres') === cat).map(product => {
                const cartItems = cart.filter(i => i.product.id === product.id)
                const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
                const unavailable = !product.is_available

                return (
                  <div key={product.id} style={{
                    borderRadius: 20, overflow: 'hidden', position: 'relative',
                    background: unavailable ? '#0a0d15' : totalQty > 0 ? 'linear-gradient(145deg, #0d1526, #10192e)' : '#0d1424',
                    border: unavailable ? '1px solid rgba(255,255,255,0.04)' : totalQty > 0 ? '1.5px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    transition: 'border-color 0.2s',
                    opacity: unavailable ? 0.6 : 1,
                  }}>
                    {unavailable && (
                      <div style={{ background: 'linear-gradient(90deg,#7f1d1d,#991b1b)', padding: '5px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>🔥</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fecaca', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Victime de son succès</span>
                        <span style={{ fontSize: 12 }}>🔥</span>
                      </div>
                    )}

                    <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: unavailable ? '#4b5563' : 'white', margin: '0 0 4px', lineHeight: 1.3 }}>{product.name}</p>
                        {product.description && (
                          <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 8px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{product.description}</p>
                        )}
                        {!unavailable && (product as any).menu_extra_price > 0 && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10, padding: '4px 10px', borderRadius: 100, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <span style={{ fontSize: 12 }}>🍟</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>Formule disponible</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 17, fontWeight: 900, color: unavailable ? '#374151' : '#818cf8', letterSpacing: '-0.3px' }}>{Number(product.price).toFixed(2)}€</span>

                          {unavailable ? (
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, padding: '6px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.04)' }}>Indisponible</span>
                          ) : totalQty > 0 && cartItems.every(ci => !ci.optionGroups?.length) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={() => removeFromCart(cartItems[cartItems.length - 1].cartKey)}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(99,102,241,0.4)', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >−</button>
                              <span style={{ fontSize: 15, fontWeight: 800, color: 'white', minWidth: 20, textAlign: 'center' }}>{totalQty}</span>
                              <button
                                onClick={() => handleAddToCart(product)}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}
                              >+</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={loadingOptions}
                              style={{
                                padding: '9px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
                                background: totalQty > 0 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.12)',
                                color: totalQty > 0 ? 'white' : '#818cf8',
                                fontSize: 13, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6,
                                boxShadow: totalQty > 0 ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                                transition: 'all 0.2s',
                              }}
                            >
                              {totalQty > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{totalQty}</span>}
                              + Ajouter
                            </button>
                          )}
                        </div>

                        {/* Options sélectionnées dans le panier */}
                        {cartItems.length > 0 && cartItems.some(i => i.optionGroups && i.optionGroups.length > 0) && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {cartItems.map(ci => (
                              <div key={ci.cartKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <span style={{ fontSize: 12, color: '#818cf8', flex: 1 }}>
                                  {Object.values(ci.selectedOptions || {}).flat().map((i: any) => i.name).join(' · ')}
                                  {ci.menuBoisson && <span style={{ color: '#f59e0b' }}> · 🥤 {ci.menuBoisson}</span>}
                                  {ci.extraPrice > 0 && <span style={{ color: '#f59e0b' }}> +{ci.extraPrice.toFixed(2)}€</span>}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                                  <button onClick={() => removeFromCart(ci.cartKey)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', color: '#6b7280', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                  <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{ci.quantity}</span>
                                  <button onClick={() => handleAddToCart(product)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#6366f1', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Image produit */}
                      {product.image_url && (
                        <div style={{ flexShrink: 0 }}>
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 16, filter: unavailable ? 'grayscale(0.7) brightness(0.5)' : 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                          />
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

      {/* ── Bouton panier sticky ── */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 60, maxWidth: 680, margin: '0 auto', animation: 'slideUp 0.3s ease' }}>
          <button
            onClick={() => router.push(`/restaurant/${slug}/checkout`)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '15px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 40px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.3)',
              animation: cartBounce ? 'bounceIn 0.35s ease' : 'none',
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>{cartCount}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.2px' }}>Voir mon panier</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}

      {/* ── Modal options ── */}
      {optionsModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOptionsModal(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div style={{ width: '100%', maxWidth: 560, borderRadius: '24px 24px 0 0', padding: '8px 20px 36px', background: '#0d1424', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>

            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '12px auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>{optionsModal.product.name}</h3>
                <p style={{ color: '#4b5563', fontSize: 13, margin: 0 }}>Personnalisez votre commande</p>
              </div>
              <button onClick={() => setOptionsModal(null)} style={{ color: '#4b5563', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 16, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Toggle menu / plat seul */}
            {(optionsModal.product as any).menu_extra_price > 0 && (() => {
              const menuPrice = Number((optionsModal.product as any).menu_extra_price)
              const menuLabel = (optionsModal.product as any).menu_label
              return (
                <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                  <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🍟 Formule disponible</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <button onClick={() => setWantsMenu(false)} style={{ flex: 1, padding: '14px 10px', border: 'none', cursor: 'pointer', textAlign: 'center', background: !wantsMenu ? 'rgba(99,102,241,0.18)' : 'transparent', color: !wantsMenu ? '#818cf8' : '#6b7280', transition: 'all 0.2s', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Plat seul</div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, color: !wantsMenu ? '#818cf8' : '#4b5563' }}>{Number(optionsModal.product.price).toFixed(2)}€</div>
                    </button>
                    <button onClick={() => setWantsMenu(true)} style={{ flex: 1, padding: '14px 10px', border: 'none', cursor: 'pointer', textAlign: 'center', background: wantsMenu ? 'rgba(99,102,241,0.18)' : 'transparent', color: wantsMenu ? '#818cf8' : '#6b7280', transition: 'all 0.2s', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>En menu</span>
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommandé</span>
                      </div>
                      {menuLabel && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2, fontWeight: 600 }}>{menuLabel}</div>}
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2, color: '#f59e0b' }}>+{Math.max(0, menuPrice - Number(optionsModal.product.price)).toFixed(2)}€</div>
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Sélecteur de boisson obligatoire si En menu */}
            {wantsMenu && (() => {
              const boissons = products.filter(p => p.category === 'Boissons' && p.is_available !== false)
              if (!boissons.length) return null
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>🥤 Choisir votre boisson</p>
                    <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: 100, fontWeight: 600 }}>Requis</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {boissons.map(b => (
                      <button key={b.id} onClick={() => setSelectedBoisson(b)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 15px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: selectedBoisson?.id === b.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)', outline: selectedBoisson?.id === b.id ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedBoisson?.id === b.id ? '#6366f1' : 'rgba(255,255,255,0.2)'}`, background: selectedBoisson?.id === b.id ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selectedBoisson?.id === b.id && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: selectedBoisson?.id === b.id ? 'white' : '#d1d5db', fontWeight: selectedBoisson?.id === b.id ? 600 : 400 }}>{b.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Incluse</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {optionsModal.groups.map(group => (
              <div key={group.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{group.name}</p>
                  <span style={{ fontSize: 11, color: '#4b5563', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 100, fontWeight: 600 }}>
                    {group.max_choices === 1 ? '1 choix' : `Jusqu'à ${group.max_choices} choix`}
                    {group.min_choices > 0 && ' · Requis'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(item => {
                    const selected = (selectedOptions[group.id] || []).some(i => i.id === item.id)
                    const unavailable = item.is_available === false
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleOption(group, item)}
                        disabled={unavailable}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '13px 15px', borderRadius: 14, border: 'none', cursor: unavailable ? 'not-allowed' : 'pointer', textAlign: 'left',
                          background: unavailable ? 'rgba(255,255,255,0.02)' : selected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                          outline: unavailable ? 'none' : selected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                          opacity: unavailable ? 0.4 : 1, transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 20, height: 20, borderRadius: group.max_choices === 1 ? '50%' : 6, border: `2px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`, background: selected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selected && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: unavailable ? '#374151' : selected ? 'white' : '#d1d5db', fontWeight: selected ? 600 : 400, textDecoration: unavailable ? 'line-through' : 'none' }}>{item.name}</span>
                        </div>
                        {item.extra_price > 0 && (
                          <span style={{ fontSize: 13, color: unavailable ? '#374151' : '#f59e0b', fontWeight: 700 }}>+{Number(item.extra_price).toFixed(2)}€</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {(() => {
              const extra = optionsModal.groups.reduce((sum, g) => sum + (selectedOptions[g.id] || []).reduce((s, i) => s + Number(i.extra_price), 0), 0)
              const totalItem = optionsModal.product.price + extra
              const valid = optionsValid()
              return (
                <button
                  onClick={confirmOptions}
                  disabled={!valid}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: valid ? 'pointer' : 'default',
                    background: valid ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                    color: valid ? 'white' : '#374151', fontWeight: 800, fontSize: 15, marginTop: 4,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: valid ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
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

      {/* Mini-modal : Plat seul / En menu (produits sans groupes d'options) */}
      {menuOnlyModal && (
        <div
          onClick={() => setMenuOnlyModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1a1a2e', borderRadius: '24px 24px 0 0', padding: '28px 20px 36px', width: '100%', maxWidth: 480 }}
          >
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 24px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 6 }}>{menuOnlyModal.name}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>{menuOnlyModal.description}</p>

            {/* Toggle Plat seul / En menu */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', marginBottom: 24 }}>
              <div style={{ padding: '7px 14px 5px', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🍟 Formule disponible</span>
              </div>
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => setWantsMenu(false)}
                  style={{
                    flex: 1, padding: '14px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
                    background: !wantsMenu ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: !wantsMenu ? '#818cf8' : '#6b7280', transition: 'all 0.2s',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Plat seul</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: !wantsMenu ? '#818cf8' : '#4b5563' }}>{Number(menuOnlyModal.price).toFixed(2)}€</div>
                </button>
                <button
                  onClick={() => setWantsMenu(true)}
                  style={{
                    flex: 1, padding: '14px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
                    background: wantsMenu ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: wantsMenu ? '#818cf8' : '#6b7280', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>En menu</span>
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommandé</span>
                  </div>
                  {(menuOnlyModal as any).menu_label && (
                    <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2, fontWeight: 600 }}>{(menuOnlyModal as any).menu_label}</div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: wantsMenu ? '#818cf8' : '#4b5563' }}>
                    +{Math.max(0, Number((menuOnlyModal as any).menu_extra_price) - Number(menuOnlyModal.price)).toFixed(2)}€
                  </div>
                </button>
              </div>
            </div>

            {/* Sélecteur de boisson obligatoire si En menu */}
            {wantsMenu && (() => {
              const boissons = products.filter(p => p.category === 'Boissons' && p.is_available !== false)
              if (!boissons.length) return null
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>🥤 Choisir votre boisson</p>
                    <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: 100, fontWeight: 600 }}>Requis</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {boissons.map(b => (
                      <button key={b.id} onClick={() => setSelectedBoisson(b)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 15px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: selectedBoisson?.id === b.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)', outline: selectedBoisson?.id === b.id ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedBoisson?.id === b.id ? '#6366f1' : 'rgba(255,255,255,0.2)'}`, background: selectedBoisson?.id === b.id ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selectedBoisson?.id === b.id && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: selectedBoisson?.id === b.id ? 'white' : '#d1d5db', fontWeight: selectedBoisson?.id === b.id ? 600 : 400 }}>{b.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Incluse</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            <button
              onClick={() => {
                if (wantsMenu && !selectedBoisson) return
                const menuExtra = wantsMenu ? Math.max(0, Number((menuOnlyModal as any).menu_extra_price || 0) - Number(menuOnlyModal.price)) : 0
                addToCart(menuOnlyModal, {}, [], menuExtra, wantsMenu && selectedBoisson ? selectedBoisson.name : undefined)
                setMenuOnlyModal(null)
                setWantsMenu(false)
                setSelectedBoisson(null)
              }}
              disabled={wantsMenu && !selectedBoisson}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: wantsMenu && !selectedBoisson ? 'default' : 'pointer',
                background: wantsMenu && !selectedBoisson ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: wantsMenu && !selectedBoisson ? '#374151' : 'white',
                fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: wantsMenu && !selectedBoisson ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}
            >
              <span>Ajouter au panier</span>
              <span>{(wantsMenu ? Number((menuOnlyModal as any).menu_extra_price || 0) : Number(menuOnlyModal.price)).toFixed(2)}€</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
