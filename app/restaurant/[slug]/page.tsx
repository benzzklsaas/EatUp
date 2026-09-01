'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getBrand, paletteVars, FONT } from '@/lib/brand'
import { brandCss } from '@/lib/brand-styles'

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
  menuAccomp?: string
}

const price = (n: number) => Number(n).toFixed(2).replace('.', ',')

export default function RestaurantPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug as string
  const router = useRouter()
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [hasRestoredCart, setHasRestoredCart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [nextOpening, setNextOpening] = useState<string | null>(null)
  const [isOpenNow, setIsOpenNow] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)

  const [optionsModal, setOptionsModal] = useState<{ product: Product; groups: OptionGroup[] } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [wantsMenu, setWantsMenu] = useState(false)
  const [menuOnlyModal, setMenuOnlyModal] = useState<Product | null>(null)
  const [selectedBoisson, setSelectedBoisson] = useState<Product | null>(null)
  const [selectedAccomp, setSelectedAccomp] = useState<Product | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`cart_${slug}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.length > 0) { setCart(parsed); setHasRestoredCart(true) }
    }

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

  // La vitrine : un seul écrit de variable CSS par image, le reste est du GPU.
  const heroRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const h = el.offsetHeight || 1
      el.style.setProperty('--p', String(Math.min(1, Math.max(0, window.scrollY / h))))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2))
      el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2))
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      el.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [restaurant])

  useEffect(() => {
    const lock = !!(optionsModal || menuOnlyModal)
    if (lock) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top))
    }
    return () => {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top))
    }
  }, [optionsModal, menuOnlyModal])

  // L'ouverture de la vitrine, une fois le restaurant connu.
  useEffect(() => {
    if (loading || !restaurant) return
    const el = heroRef.current
    if (!el) return
    const id = requestAnimationFrame(() => el.classList.add('is-ready'))
    return () => cancelAnimationFrame(id)
  }, [loading, restaurant])

  // Tout le mouvement de la page tient dans un observateur et une boucle rAF.
  useEffect(() => {
    if (loading) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    let obs: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      obs = new IntersectionObserver((entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); o.unobserve(e.target) }
        }
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0.04 })
      reveals.forEach(el => obs!.observe(el))
    } else {
      reveals.forEach(el => el.classList.add('is-in'))
    }

    const media = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'))
    const bar = document.querySelector<HTMLElement>('.cn-bar')
    let raf = 0
    const frame = () => {
      raf = 0
      const vh = window.innerHeight
      for (const el of media) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -100 || r.top > vh + 100) continue
        const centred = (r.top + r.height / 2 - vh / 2) / vh
        el.style.setProperty('--y', (centred * 14).toFixed(2))
      }
      if (bar) bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= 0.5)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame) }

    frame()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      obs?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [loading, products.length, dbCategories.length])

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
      setSelectedAccomp(null)
      setOptionsModal({ product, groups: optGroups })
    } else if (hasMenu) {
      setWantsMenu(true)
      setSelectedBoisson(null)
      setSelectedAccomp(null)
      setMenuOnlyModal(product)
    } else {
      addToCart(product, {}, [], 0)
    }
  }

  function addToCart(product: Product, selOpts: SelectedOptions, groups: OptionGroup[], extra: number, menuBoisson?: string, menuAccomp?: string) {
    const cartKey = product.id + JSON.stringify(selOpts) + Date.now()
    saveCart([...cart, { product, quantity: 1, selectedOptions: selOpts, optionGroups: groups, extraPrice: extra, cartKey, menuBoisson, menuAccomp }])
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
    const accompExtra = wantsMenu && selectedAccomp ? Number(selectedAccomp.price) : 0
    const boissonExtra = wantsMenu && selectedBoisson ? Number((selectedBoisson as any).menu_supplement || 0) : 0
    addToCart(product, selectedOptions, groups, optExtra + menuExtra + accompExtra + boissonExtra, wantsMenu && selectedBoisson ? selectedBoisson.name : undefined, wantsMenu && selectedAccomp ? selectedAccomp.name : undefined)
    setOptionsModal(null)
    setWantsMenu(false)
    setSelectedBoisson(null)
    setSelectedAccomp(null)
  }

  function optionsValid() {
    if (!optionsModal) return false
    const optsOk = optionsModal.groups.every(g => (selectedOptions[g.id] || []).length >= g.min_choices)
    if (wantsMenu && !selectedBoisson) return false
    const productWantsAccomp = (optionsModal.product as any).has_accompagnement !== false
    const hasAccomps = products.some(p => p.category === 'Accompagnements' && p.is_available !== false)
    if (wantsMenu && productWantsAccomp && hasAccomps && !selectedAccomp) return false
    return optsOk
  }

  const total = cart.reduce((sum, i) => sum + (i.product.price + i.extraPrice) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const HIDDEN_CATEGORIES = ['Accompagnements']
  const productCategories = [...new Set(products.map(p => p.category || 'Autres').filter(c => !HIDDEN_CATEGORIES.includes(c)))]
  const orderedCategories = dbCategories.length > 0
    ? [...dbCategories.map(c => c.name).filter(n => productCategories.includes(n)), ...productCategories.filter(n => !dbCategories.find(c => c.name === n))]
    : productCategories
  const getCatEmoji = (name: string) => dbCategories.find(c => c.name === name)?.emoji || ''

  const brand = getBrand(slug, restaurant?.name || '')
  const p = brand.palette
  const cssVars = paletteVars(p) as React.CSSProperties

  const CSS = brandCss() + `
    /* ══ LA VITRINE ══════════════════════════════════════════════════════════
       Quatre plans à des profondeurs différentes dans une même perspective.
       Le défilement écrit --p (0 → 1), tout le reste est du transform GPU.   */
    .cn-hero {
      --p: 0; --mx: 0; --my: 0;
      position: relative; overflow: hidden; isolation: isolate;
      min-height: 84svh; display: flex; align-items: flex-end;
      padding: 0 20px 40px;
      perspective: 1100px; perspective-origin: 62% 38%;
      background:
        radial-gradient(120% 78% at 80% 4%, var(--cn-hot-soft) 0%, transparent 56%),
        radial-gradient(96% 68% at 6% 96%, var(--cn-fresh-soft) 0%, transparent 58%),
        var(--cn-bg);
    }
    .cn-hero__scene { position: absolute; inset: 0; transform-style: preserve-3d; pointer-events: none; }
    /* Le voile : garantit la lisibilité du texte quelle que soit la photo posée
       derrière. En bas sur mobile, sur la gauche dès que le texte passe à côté. */
    .cn-hero__veil {
      position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: linear-gradient(to top,
        var(--cn-bg) 20%,
        color-mix(in srgb, var(--cn-bg) 62%, transparent) 52%,
        transparent 86%);
    }

    /* Plan 1 — la gueule du four, loin derrière, qui grandit quand on avance */
    .cn-hero__oven {
      position: absolute; left: 50%; top: 4%; width: min(84vw, 520px); aspect-ratio: 3 / 4.1;
      border-radius: 999px 999px 14px 14px;
      background: linear-gradient(178deg, var(--cn-hot) 0%, #EFA23C 52%, var(--cn-fresh) 128%);
      opacity: .17; filter: blur(3px);
      transform: translate3d(-50%, calc(var(--p) * -30px), -340px) scale(calc(1 + var(--p) * .18));
    }
    /* Plan 2 — le plat, cintré, qui bascule légèrement au pointeur */
    .cn-hero__dish {
      position: absolute; left: 50%; top: 7%; width: min(58vw, 300px); aspect-ratio: 4 / 5;
      border-radius: 999px 999px 8px 8px; overflow: hidden;
      background: var(--cn-shade);
      box-shadow: 0 30px 70px rgba(27, 33, 20, .18);
      transform:
        translate3d(-50%, calc(var(--p) * -110px), -40px)
        rotateY(calc(var(--mx) * 6deg)) rotateX(calc(var(--my) * -5deg));
    }
    .cn-hero__dish img { width: 100%; height: 100%; object-fit: cover; }
    /* Plan 3 — les herbes, au premier plan, qui filent plus vite */
    .cn-hero__leaf {
      position: absolute; width: 26px; height: 26px;
      border-radius: 0 62% 0 62%; background: var(--cn-fresh); opacity: .5;
    }
    .cn-hero__leaf--a { left: 8%;  top: 30%; transform: translate3d(0, calc(var(--p) * -230px), 110px) rotate(18deg); }
    .cn-hero__leaf--b { right: 11%; top: 46%; width: 18px; height: 18px; opacity: .38;
      transform: translate3d(0, calc(var(--p) * -300px), 60px) rotate(-32deg); }
    .cn-hero__leaf--c { left: 22%; top: 12%; width: 14px; height: 14px; opacity: .3;
      transform: translate3d(0, calc(var(--p) * -170px), 20px) rotate(48deg); }

    /* Le texte, devant tout, et seul à recevoir les clics */
    .cn-hero__inner { position: relative; z-index: 5; width: 100%; max-width: 940px; margin: 0 auto; }
    .cn-hero__name {
      font-family: ${FONT.display}; font-weight: 800;
      font-size: clamp(44px, 12.5vw, 96px); line-height: .96; letter-spacing: -.035em;
      margin: 0; text-wrap: balance;
    }
    .cn-hero__voice {
      font-size: clamp(17px, 4.4vw, 22px); line-height: 1.4; color: var(--cn-dim);
      margin: 14px 0 0; max-width: 30ch;
    }
    .cn-hero__marks { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 0; padding: 0; list-style: none; }
    .cn-hero__mark {
      font-family: ${FONT.mono}; font-size: 12px; color: var(--cn-fresh-ink);
      background: var(--cn-fresh-soft); padding: 6px 12px; border-radius: 999px;
    }
    .cn-hero__cta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 26px; }
    .cn-hero__meta { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 22px 0 0;
      font-size: 13px; color: var(--cn-dim); }
    .cn-hero__meta a { color: inherit; }
    @media (min-width: 760px) {
      .cn-hero { align-items: center; padding-bottom: 0; min-height: 90svh; }
      .cn-hero__dish { left: auto; right: 4%; top: 12%; width: min(38vw, 380px);
        transform: translate3d(0, calc(var(--p) * -110px), -40px)
                   rotateY(calc(var(--mx) * 6deg)) rotateX(calc(var(--my) * -5deg)); }
      .cn-hero__oven { left: 68%; top: 2%; width: min(46vw, 560px); }
      .cn-hero__inner { max-width: 620px; margin: 0; }
      .cn-hero__veil {
        background: linear-gradient(to right,
          var(--cn-bg) 26%,
          color-mix(in srgb, var(--cn-bg) 55%, transparent) 58%,
          transparent 82%);
      }
    }

    /* ══ LA BARRE ════════════════════════════════════════════════════════════
       Une seule barre collante : la marque, les catégories, le panier.       */
    .cn-bar {
      position: sticky; top: 0; z-index: 50;
      background: color-mix(in srgb, var(--cn-bg) 92%, transparent);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--cn-line);
    }
    .cn-bar__in { max-width: 940px; margin: 0 auto; display: flex; align-items: center; gap: 14px; padding: 0 16px; }
    .cn-bar__name { font-family: ${FONT.display}; font-weight: 700; font-size: 16px; flex-shrink: 0; padding: 12px 0; }
    .cn-bar__cats { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; flex: 1; }
    .cn-bar__cats::-webkit-scrollbar { display: none; }
    .cn-cat {
      flex-shrink: 0; border: none; cursor: pointer; background: transparent; color: var(--cn-dim);
      font-family: ${FONT.ui}; font-size: 14px; font-weight: 500; padding: 13px 12px;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .cn-cat:hover { color: var(--cn-text); }
    .cn-cat--on { color: var(--cn-hot-ink); border-bottom-color: var(--cn-hot-ink); }

    /* ══ LA CARTE ════════════════════════════════════════════════════════════ */
    .cn-menu { max-width: 940px; margin: 0 auto; padding: 30px 16px 0; }
    .cn-cathead { display: flex; align-items: baseline; gap: 12px; margin: 0 0 4px; }
    .cn-cathead__name { font-family: ${FONT.display}; font-weight: 700; font-size: clamp(24px, 5vw, 32px); margin: 0; }
    .cn-cathead__count { font-family: ${FONT.mono}; font-size: 12px; color: var(--cn-dim); margin-left: auto; flex-shrink: 0; }

    .cn-item {
      display: flex; gap: 16px; align-items: center; width: 100%; text-align: left;
      padding: 16px 0; border-bottom: 1px solid var(--cn-line);
      background: none; border-left: none; border-right: none; border-top: none;
      font: inherit; color: inherit; cursor: pointer;
    }
    .cn-item:hover .cn-item__name { color: var(--cn-hot-ink); }
    .cn-item:disabled { cursor: default; opacity: .55; }
    .cn-item:disabled:hover .cn-item__name { color: inherit; }
    .cn-item__body { flex: 1; min-width: 0; }
    .cn-item__name { font-family: ${FONT.display}; font-weight: 700; font-size: 17px; margin: 0; line-height: 1.25; }
    .cn-item__desc {
      font-size: 14px; line-height: 1.5; color: var(--cn-dim); margin: 5px 0 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cn-item__foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
    .cn-item__media { position: relative; flex-shrink: 0; width: 86px; }
    .cn-item__media .cn-arch { width: 86px; height: 100px; }
    .cn-item__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cn-item--out .cn-item__media img { filter: grayscale(1); }
    .cn-item__add {
      position: absolute; right: -6px; bottom: -8px;
      width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
      background: var(--cn-hot-ink); color: #fff; font-size: 19px; line-height: 1;
      box-shadow: 0 3px 10px rgba(27,33,20,.24);
      display: flex; align-items: center; justify-content: center;
    }
    .cn-item__qty {
      position: absolute; right: -6px; top: -6px; min-width: 22px; height: 22px; padding: 0 6px;
      border-radius: 999px; background: var(--cn-fresh-ink); color: #fff;
      font-family: ${FONT.mono}; font-size: 12px; display: flex; align-items: center; justify-content: center;
    }
    .cn-tag {
      font-family: ${FONT.mono}; font-size: 11px; color: var(--cn-fresh-ink);
      background: var(--cn-fresh-soft); padding: 3px 9px; border-radius: 999px;
    }
    .cn-tag--out { color: var(--cn-dim); background: var(--cn-shade); }
    .cn-picked {
      display: flex; align-items: center; gap: 10px; justify-content: space-between;
      margin-top: 8px; padding: 8px 12px; border-radius: 8px;
      background: var(--cn-shade); font-size: 13px; color: var(--cn-dim);
    }

    /* ══ LE PANIER ═══════════════════════════════════════════════════════════ */
    .cn-cart {
      position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom));
      z-index: 70; max-width: 560px; margin: 0 auto;
      display: flex; align-items: center; gap: 14px; width: calc(100% - 24px);
      padding: 13px 16px; border: none; border-radius: 12px; cursor: pointer; text-align: left;
      background: var(--cn-text); color: var(--cn-bg); font: inherit;
      box-shadow: 0 12px 34px rgba(27,33,20,.3); animation: cn-rise .28s ease;
    }
    .cn-cart__n {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--cn-hot); color: #fff; font-family: ${FONT.mono}; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .cn-cart__t { flex: 1; font-weight: 600; font-size: 15px; }
    .cn-cart__p { font-family: ${FONT.mono}; font-size: 17px; }
    @keyframes cn-punch { 0%,100% { transform: scale(1) } 40% { transform: scale(1.03) } }
    .cn-cart--punch { animation: cn-punch .3s ease; }

    /* ══ LES INFOS PRATIQUES, en pied de vitrine ═════════════════════════════ */
    .cn-foot { max-width: 940px; margin: 54px auto 0; padding: 30px 16px 40px; border-top: 1px solid var(--cn-line); }
    .cn-foot__grid { display: grid; gap: 22px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .cn-foot__k { font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--cn-dim); margin: 0 0 6px; }
    .cn-foot__v { margin: 0; font-size: 15px; line-height: 1.5; }
    .cn-foot__v a { color: inherit; }
 
    /* ══ MOUVEMENT ═══════════════════════════════════════════════════════════
       Une seule courbe, trois durées. Tout le reste s'y range — c'est la
       cohérence du timing qui fait « premium », pas le nombre d'effets.
       Rien n'est masqué quand l'utilisateur refuse les animations : les états
       de départ vivent tous dans le no-preference.                           */
    .cn { --e: cubic-bezier(.22, 1, .36, 1); }

    @media (prefers-reduced-motion: no-preference) {

      /* Apparition au défilement, échelonnée par --d */
      .cn [data-reveal] { opacity: 0; transform: translateY(20px); }
      .cn [data-reveal].is-in {
        opacity: 1; transform: none;
        transition: opacity .55s var(--e) var(--d, 0s), transform .7s var(--e) var(--d, 0s);
      }

      /* Le cadre est fixe, l'image respire derrière : c'est ça, la profondeur */
      .cn [data-parallax] img {
        transform: translate3d(0, calc(var(--y, 0) * 1px), 0) scale(1.14);
        will-change: transform;
      }

      /* Ouverture de la vitrine : l'arche se remplit, le texte suit */
      .cn-hero__dish { opacity: 0; }
      .cn-hero.is-ready .cn-hero__dish { animation: cn-arch-in 1.05s var(--e) .08s forwards; }
      @keyframes cn-arch-in {
        from { opacity: 0; clip-path: inset(100% 0 0 0); }
        to   { opacity: 1; clip-path: inset(0 0 0 0); }
      }
      .cn-hero__oven { opacity: 0; }
      .cn-hero.is-ready .cn-hero__oven { animation: cn-oven-in 1.4s var(--e) forwards; }
      @keyframes cn-oven-in { to { opacity: .17; } }

      .cn-hero__name, .cn-hero__voice, .cn-hero__marks,
      .cn-hero__cta, .cn-hero__meta { opacity: 0; transform: translateY(16px); }
      .cn-hero.is-ready .cn-hero__name  { animation: cn-in .75s var(--e) .14s forwards; }
      .cn-hero.is-ready .cn-hero__voice { animation: cn-in .75s var(--e) .24s forwards; }
      .cn-hero.is-ready .cn-hero__marks { animation: cn-in .75s var(--e) .32s forwards; }
      .cn-hero.is-ready .cn-hero__cta   { animation: cn-in .75s var(--e) .4s forwards; }
      .cn-hero.is-ready .cn-hero__meta  { animation: cn-in .75s var(--e) .48s forwards; }
      @keyframes cn-in { to { opacity: 1; transform: none; } }

      .cn-hero__leaf { opacity: 0; }
      .cn-hero.is-ready .cn-hero__leaf--a { animation: cn-leaf .9s var(--e) .5s forwards; }
      .cn-hero.is-ready .cn-hero__leaf--b { animation: cn-leaf .9s var(--e) .62s forwards; }
      .cn-hero.is-ready .cn-hero__leaf--c { animation: cn-leaf .9s var(--e) .72s forwards; }
      @keyframes cn-leaf { to { opacity: .45; } }

      /* Micro-interactions : la ligne de carte se soulève, l'image avance */
      .cn-item { transition: transform .3s var(--e); }
      .cn-item:hover:not(:disabled) { transform: translateX(3px); }
      .cn-item__media .cn-arch { transition: transform .45s var(--e), box-shadow .45s var(--e); }
      .cn-item:hover:not(:disabled) .cn-item__media .cn-arch {
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 12px 26px rgba(27, 33, 20, .16);
      }
      .cn-item__add { transition: transform .22s var(--e), background .16s ease; }
      .cn-item:hover:not(:disabled) .cn-item__add { transform: scale(1.1); }

      /* La barre collante se pose au lieu d'apparaître */
      .cn-bar { transition: box-shadow .3s var(--e); }
      .cn-bar.is-stuck { box-shadow: 0 6px 20px rgba(27, 33, 20, .07); }

      /* Le prix qui change ne saute pas */
      .cn-cart__p, .cn-total__v { transition: transform .3s var(--e); }
    }

  `

  const goToMenu = () => document.getElementById('carte')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // ── Chargement ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center' }}>
        <div className="cn-arch" style={{ width: 42, height: 54, margin: '0 auto 16px', background: `linear-gradient(180deg, ${p.hot}, ${p.fresh})`, animation: 'cn-breathe 1.5s ease-in-out infinite' }} />
        <p className="cn-eyebrow" style={{ margin: 0 }}>On sort la carte</p>
      </div>
      <style>{`@keyframes cn-breathe{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.5;transform:translateY(4px)}}`}</style>
    </div>
  )

  // ── Restaurant inconnu ─────────────────────────────────────────────────────
  if (!restaurant) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p className="cn-display" style={{ fontSize: 44, margin: '0 0 10px' }}>Page introuvable</p>
        <p style={{ color: p.dim, margin: 0 }}>Ce lien ne correspond à aucun restaurant.</p>
      </div>
    </div>
  )

  return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', paddingBottom: cartCount > 0 ? 96 : 0 }}>
      <style>{CSS}</style>

      {/* ══ LA VITRINE ══ */}
      <section className="cn-hero" ref={heroRef}>
        <div className="cn-hero__scene" aria-hidden="true">
          <div className="cn-hero__oven" />
          <div className="cn-hero__dish">
            {restaurant.cover_image_url && <img src={restaurant.cover_image_url} alt="" />}
          </div>
          <span className="cn-hero__leaf cn-hero__leaf--a" />
          <span className="cn-hero__leaf cn-hero__leaf--b" />
          <span className="cn-hero__leaf cn-hero__leaf--c" />
        </div>
        <div className="cn-hero__veil" aria-hidden="true" />

        <div className="cn-hero__inner">
          <h1 className="cn-hero__name cn-display">{brand.wordmark}</h1>
          <p className="cn-hero__voice">{restaurant.description || brand.voice}</p>

          <ul className="cn-hero__marks">
            {brand.marks.map(m => <li key={m} className="cn-hero__mark">{m}</li>)}
          </ul>

          <div className="cn-hero__cta">
            <button className="cn-btn" onClick={goToMenu}>Voir la carte</button>
            <span className={`cn-pill ${isOpenNow ? 'cn-pill--open' : 'cn-pill--shut'}`}>
              <span className="cn-pill__dot" />
              {isOpenNow ? 'Ouvert maintenant' : nextOpening ? `Ouvre ${nextOpening.toLowerCase()}` : 'Fermé'}
            </span>
          </div>

          <div className="cn-hero__meta">
            {restaurant.address && <span>{restaurant.address.split(',').slice(0, 3).join(',').trim()}</span>}
            {restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}
          </div>
        </div>
      </section>

      {/* Le mot du jour, s'il y en a un */}
      {restaurant.daily_message && (
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '20px 16px 0' }}>
          <div className="cn-note" data-reveal>
            <div>
              <p className="cn-note__t">Le mot du jour</p>
              <p className="cn-note__d">{restaurant.daily_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fermé : on commande quand même, pour plus tard */}
      {!isOpenNow && (
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '20px 16px 0' }}>
          <div className="cn-note cn-note--warn" data-reveal>
            <div>
              <p className="cn-note__t">Fermé pour le moment</p>
              <p className="cn-note__d">
                {nextOpening
                  ? <>Composez votre commande dès maintenant : le premier retrait possible est <strong>{nextOpening.toLowerCase()}</strong>.</>
                  : <>Composez votre commande dès maintenant, elle sera préparée à la réouverture.</>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ LA BARRE ══ */}
      <nav className="cn-bar" aria-label="Catégories" id="carte">
        <div className="cn-bar__in">
          <span className="cn-bar__name">{restaurant.name}</span>
          <div className="cn-bar__cats">
            {orderedCategories.map(cat => (
              <button
                key={cat}
                className={`cn-cat${activeCategory === cat ? ' cn-cat--on' : ''}`}
                onClick={() => {
                  setActiveCategory(cat)
                  document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ══ LA CARTE ══ */}
      <main className="cn-menu">
        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <p className="cn-display" style={{ fontSize: 28, margin: '0 0 10px' }}>La carte arrive</p>
            <p style={{ color: p.dim, margin: 0 }}>Le restaurant prépare son menu. Repassez dans un instant.</p>
          </div>
        )}

        {orderedCategories.map(cat => {
          const catProducts = products.filter(prod => (prod.category || 'Autres') === cat)
          return (
            <section key={cat} id={`cat-${cat}`} style={{ marginBottom: 42, scrollMarginTop: 62 }}>
              <div className="cn-cathead" data-reveal>
                <h2 className="cn-cathead__name">{cat}</h2>
                <span className="cn-cathead__count">{catProducts.length} plat{catProducts.length > 1 ? 's' : ''}</span>
              </div>

              {catProducts.map((product, idx) => {
                const totalQty = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)
                const unavailable = !product.is_available
                const hasFormule = (product as any).menu_extra_price > 0
                const cartLines = cart.filter(i => i.product.id === product.id && i.optionGroups && i.optionGroups.length > 0)

                return (
                  <div key={product.id} data-reveal style={{ ['--d' as any]: `${Math.min(idx, 6) * 55}ms` }}>
                    <button
                      className={`cn-item${unavailable ? ' cn-item--out' : ''}`}
                      onClick={() => handleAddToCart(product)}
                      disabled={unavailable || loadingOptions}
                    >
                      <span className="cn-item__body">
                        <span className="cn-item__name" style={{ display: 'block' }}>{product.name}</span>
                        {product.description && <span className="cn-item__desc" style={{ display: '-webkit-box' }}>{product.description}</span>}
                        <span className="cn-item__foot">
                          <span className="cn-price">{price(product.price)}€</span>
                          {hasFormule && !unavailable && <span className="cn-tag">Formule possible</span>}
                          {unavailable && <span className="cn-tag cn-tag--out">Épuisé</span>}
                        </span>
                      </span>

                      {product.image_url ? (
                        <span className="cn-item__media">
                          <span className="cn-arch" data-parallax>
                            <img src={product.image_url} alt="" />
                          </span>
                          {!unavailable && <span className="cn-item__add" aria-hidden="true">+</span>}
                          {totalQty > 0 && <span className="cn-item__qty">{totalQty}</span>}
                        </span>
                      ) : !unavailable && (
                        <span className="cn-item__media" style={{ width: 34 }}>
                          <span className="cn-item__add" style={{ position: 'static' }} aria-hidden="true">+</span>
                          {totalQty > 0 && <span className="cn-item__qty">{totalQty}</span>}
                        </span>
                      )}
                    </button>

                    {cartLines.map(ci => (
                      <div key={ci.cartKey} className="cn-picked">
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {ci.quantity}× {Object.values(ci.selectedOptions || {}).flat().map((o: any) => o.name).join(' · ')}
                          {ci.menuBoisson && ` · ${ci.menuBoisson}`}
                          {ci.menuAccomp && ` · ${ci.menuAccomp}`}
                        </span>
                        <span className="cn-step">
                          <button onClick={() => removeFromCart(ci.cartKey)} aria-label="Retirer un article">−</button>
                          <span className="cn-step__n">{ci.quantity}</span>
                          <button onClick={() => handleAddToCart(product)} aria-label="Ajouter un article">+</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </section>
          )
        })}
      </main>

      {/* ══ INFOS PRATIQUES ══ */}
      <footer className="cn-foot" data-reveal>
        <div className="cn-foot__grid">
          <div>
            <p className="cn-foot__k">Le retrait</p>
            <p className="cn-foot__v">{restaurant.address || 'Adresse à venir'}</p>
          </div>
          {restaurant.phone && (
            <div>
              <p className="cn-foot__k">Une question</p>
              <p className="cn-foot__v"><a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a></p>
            </div>
          )}
          <div>
            <p className="cn-foot__k">Le paiement</p>
            <p className="cn-foot__v">Sur place au comptoir, au moment du retrait.</p>
          </div>
        </div>
      </footer>

      {/* ══ LE PANIER ══ */}
      {cartCount > 0 && (
        <button
          className={`cn-cart${cartBounce ? ' cn-cart--punch' : ''}`}
          onClick={() => router.push(`/restaurant/${slug}/checkout`)}
        >
          <span className="cn-cart__n">{cartCount}</span>
          <span className="cn-cart__t">Voir ma commande</span>
          <span className="cn-cart__p">{price(total)}€</span>
        </button>
      )}

      {/* ══ PERSONNALISER UN PLAT ══ */}
      {optionsModal && (() => {
        const prod = optionsModal.product
        const menuPrice = Number((prod as any).menu_extra_price || 0)
        const menuLabel = (prod as any).menu_label
        const accomps = products.filter(a => a.category === 'Accompagnements' && a.is_available !== false)
        const boissons = products.filter(b => b.category === 'Boissons' && b.is_available !== false)
        const wantsAccomp = (prod as any).has_accompagnement !== false

        const optExtra = optionsModal.groups.reduce((sum, g) => sum + (selectedOptions[g.id] || []).reduce((s, i) => s + Number(i.extra_price), 0), 0)
        const menuExtra = wantsMenu ? Math.max(0, menuPrice - Number(prod.price)) : 0
        const accompExtra = wantsMenu && selectedAccomp ? Number(selectedAccomp.price) : 0
        const boissonExtra = wantsMenu && selectedBoisson ? Number((selectedBoisson as any).menu_supplement || 0) : 0
        const totalItem = Number(prod.price) + optExtra + menuExtra + accompExtra + boissonExtra

        return (
          <div className="cn-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) setOptionsModal(null) }}>
            <div className="cn-sheet" role="dialog" aria-label={prod.name}>
              <div className="cn-sheet__head">
                <div>
                  <p className="cn-eyebrow" style={{ margin: '0 0 3px' }}>Votre plat</p>
                  <h3 className="cn-sheet__title">{prod.name}</h3>
                </div>
                <button className="cn-sheet__close" onClick={() => setOptionsModal(null)} aria-label="Fermer">✕</button>
              </div>

              <div className="cn-sheet__body">
                {menuPrice > 0 && (
                  <div className="cn-group">
                    <div className="cn-group__head"><span className="cn-group__name">La formule</span></div>
                    <div className="cn-formule">
                      <button type="button" className={!wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(false)}>
                        <div className="cn-formule__t">Plat seul</div>
                        <div className="cn-formule__p">{price(prod.price)}€</div>
                      </button>
                      <button type="button" className={wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(true)}>
                        <div className="cn-formule__t">En formule</div>
                        <div className="cn-formule__p">+{price(Math.max(0, menuPrice - Number(prod.price)))}€</div>
                        {menuLabel && <div className="cn-formule__n">{menuLabel}</div>}
                      </button>
                    </div>
                  </div>
                )}

                {optionsModal.groups.map(group => (
                  <div key={group.id} className="cn-group">
                    <div className="cn-group__head">
                      <span className="cn-group__name">{group.name}</span>
                      {group.min_choices > 0
                        ? <span className="cn-group__req">Obligatoire</span>
                        : <span className="cn-group__opt">{group.max_choices === 1 ? 'Au choix' : `Jusqu'à ${group.max_choices}`}</span>}
                    </div>
                    {group.items.map(item => (
                      <OptRow
                        key={item.id}
                        label={item.name}
                        single={group.max_choices === 1}
                        on={(selectedOptions[group.id] || []).some(i => i.id === item.id)}
                        disabled={item.is_available === false}
                        extra={Number(item.extra_price) > 0 ? `+${price(item.extra_price)}€` : undefined}
                        onClick={() => toggleOption(group, item)}
                      />
                    ))}
                  </div>
                ))}

                {wantsMenu && wantsAccomp && accomps.length > 0 && (
                  <div className="cn-group">
                    <div className="cn-group__head">
                      <span className="cn-group__name">L&apos;accompagnement</span>
                      <span className="cn-group__req">Obligatoire</span>
                    </div>
                    {accomps.map(a => (
                      <OptRow key={a.id} label={a.name} single on={selectedAccomp?.id === a.id}
                        extra={Number(a.price) === 0 ? 'Inclus' : `+${price(a.price)}€`}
                        onClick={() => setSelectedAccomp(a)} />
                    ))}
                  </div>
                )}

                {wantsMenu && boissons.length > 0 && (
                  <div className="cn-group">
                    <div className="cn-group__head">
                      <span className="cn-group__name">La boisson</span>
                      <span className="cn-group__req">Obligatoire</span>
                    </div>
                    {boissons.map(b => (
                      <OptRow key={b.id} label={b.name} single on={selectedBoisson?.id === b.id}
                        extra={Number((b as any).menu_supplement) > 0 ? `+${price((b as any).menu_supplement)}€` : 'Incluse'}
                        onClick={() => setSelectedBoisson(b)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="cn-sheet__foot">
                <button className="cn-btn cn-btn--block" onClick={confirmOptions} disabled={!optionsValid()}>
                  Ajouter · {price(totalItem)}€
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══ SEUL OU EN FORMULE (plats sans options) ══ */}
      {menuOnlyModal && (() => {
        const prod = menuOnlyModal
        const menuPrice = Number((prod as any).menu_extra_price || 0)
        const menuLabel = (prod as any).menu_label
        const accomps = products.filter(a => a.category === 'Accompagnements' && a.is_available !== false)
        const boissons = products.filter(b => b.category === 'Boissons' && b.is_available !== false)
        const wantsAccomp = (prod as any).has_accompagnement !== false
        const blocked = wantsMenu && ((wantsAccomp && accomps.length > 0 && !selectedAccomp) || (boissons.length > 0 && !selectedBoisson))

        const accompExtra = wantsMenu && selectedAccomp ? Number(selectedAccomp.price) : 0
        const boissonExtra = wantsMenu && selectedBoisson ? Number((selectedBoisson as any).menu_supplement || 0) : 0
        const totalItem = wantsMenu ? menuPrice + accompExtra + boissonExtra : Number(prod.price)

        return (
          <div className="cn-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) setMenuOnlyModal(null) }}>
            <div className="cn-sheet" role="dialog" aria-label={prod.name}>
              <div className="cn-sheet__head">
                <div>
                  <p className="cn-eyebrow" style={{ margin: '0 0 3px' }}>Seul ou en formule</p>
                  <h3 className="cn-sheet__title">{prod.name}</h3>
                </div>
                <button className="cn-sheet__close" onClick={() => setMenuOnlyModal(null)} aria-label="Fermer">✕</button>
              </div>

              <div className="cn-sheet__body">
                {prod.description && <p style={{ color: p.dim, fontSize: 15, margin: '14px 0 0' }}>{prod.description}</p>}

                <div className="cn-group">
                  <div className="cn-formule">
                    <button type="button" className={!wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(false)}>
                      <div className="cn-formule__t">Plat seul</div>
                      <div className="cn-formule__p">{price(prod.price)}€</div>
                    </button>
                    <button type="button" className={wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(true)}>
                      <div className="cn-formule__t">En formule</div>
                      <div className="cn-formule__p">+{price(Math.max(0, menuPrice - Number(prod.price)))}€</div>
                      {menuLabel && <div className="cn-formule__n">{menuLabel}</div>}
                    </button>
                  </div>
                </div>

                {wantsMenu && wantsAccomp && accomps.length > 0 && (
                  <div className="cn-group">
                    <div className="cn-group__head">
                      <span className="cn-group__name">L&apos;accompagnement</span>
                      <span className="cn-group__req">Obligatoire</span>
                    </div>
                    {accomps.map(a => (
                      <OptRow key={a.id} label={a.name} single on={selectedAccomp?.id === a.id}
                        extra={Number(a.price) === 0 ? 'Inclus' : `+${price(a.price)}€`}
                        onClick={() => setSelectedAccomp(a)} />
                    ))}
                  </div>
                )}

                {wantsMenu && boissons.length > 0 && (
                  <div className="cn-group">
                    <div className="cn-group__head">
                      <span className="cn-group__name">La boisson</span>
                      <span className="cn-group__req">Obligatoire</span>
                    </div>
                    {boissons.map(b => (
                      <OptRow key={b.id} label={b.name} single on={selectedBoisson?.id === b.id}
                        extra={Number((b as any).menu_supplement) > 0 ? `+${price((b as any).menu_supplement)}€` : 'Incluse'}
                        onClick={() => setSelectedBoisson(b)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="cn-sheet__foot">
                <button
                  className="cn-btn cn-btn--block"
                  disabled={blocked}
                  onClick={() => {
                    if (blocked) return
                    const menuExtra = wantsMenu ? Math.max(0, menuPrice - Number(prod.price)) : 0
                    addToCart(prod, {}, [], menuExtra + accompExtra + boissonExtra, wantsMenu && selectedBoisson ? selectedBoisson.name : undefined, wantsMenu && selectedAccomp ? selectedAccomp.name : undefined)
                    setMenuOnlyModal(null)
                    setWantsMenu(false)
                    setSelectedBoisson(null)
                    setSelectedAccomp(null)
                  }}
                >
                  Ajouter · {price(totalItem)}€
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** Une ligne de choix : grande cible, état évident, prix aligné à droite. */
function OptRow({ label, on, extra, disabled, single, onClick }: {
  label: string
  on: boolean
  extra?: string
  disabled?: boolean
  single?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`cn-opt${on ? ' cn-opt--on' : ''}${disabled ? ' cn-opt--off' : ''}`}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span className="cn-opt__box" style={{ borderRadius: single ? '50%' : 6 }}>{on ? '✓' : ''}</span>
        <span className="cn-opt__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </span>
      {extra && <span className="cn-opt__extra">{extra}</span>}
    </button>
  )
}
