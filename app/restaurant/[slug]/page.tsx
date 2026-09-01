'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getBrand, FONT, ARCH_WIDE, perforation } from '@/lib/brand'
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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // Les couleurs de la marque descendent en variables CSS : la feuille de style
  // ci-dessous est identique pour tous les restaurants, seule la palette change.
  const cssVars = {
    '--cn-ink': p.ink,
    '--cn-char': p.char,
    '--cn-char-up': p.charUp,
    '--cn-line': p.line,
    '--cn-dough': p.dough,
    '--cn-dough-dim': p.doughDim,
    '--cn-paper': p.paper,
    '--cn-paper-ink': p.paperInk,
    '--cn-hot': p.hot,
    '--cn-accent': p.accent,
    '--cn-accent-ink': p.accentInk,
    '--cn-fresh': p.fresh,
  } as React.CSSProperties

  // Le socle de marque, plus ce que la carte seule met en scène.
  const CSS = brandCss() + `

    /* ── LE MASTHEAD : l'image sort à droite, le nom sort à gauche ── */
    .cn-mast { position: relative; padding: 26px 18px 0; max-width: 760px; margin: 0 auto; }
    .cn-mast__media {
      position: relative; margin-left: auto; margin-right: -18px;
      width: 66%; max-width: 380px; aspect-ratio: 4 / 5;
      background: var(--cn-char-up);
    }
    .cn-mast__media img { width: 100%; height: 100%; object-fit: cover; }
    .cn-mast__ember {
      position: absolute; inset: 0;
      background:
        radial-gradient(90% 70% at 50% 108%, var(--cn-hot) 0%, transparent 62%),
        radial-gradient(70% 50% at 50% 100%, var(--cn-accent) 0%, transparent 55%),
        var(--cn-char-up);
    }
    .cn-mast__initial {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-family: ${FONT.display}; color: transparent;
      -webkit-text-stroke: 1.5px rgba(255,255,255,.22);
    }
    .cn-mast__stamp { position: absolute; right: 14px; bottom: 16px; z-index: 4; background: var(--cn-ink); }
    .cn-mast__name {
      position: relative; z-index: 2; margin: -30px 0 0; padding: 0;
      font-size: clamp(52px, 16.5vw, 124px);
      transform: translateX(-.045em);
      text-shadow: 0 6px 26px rgba(0,0,0,.75);
      overflow-wrap: anywhere;
    }
    .cn-mast__voice {
      font-style: italic; font-size: clamp(16px, 4.4vw, 22px); line-height: 1.35;
      color: var(--cn-dough); margin: 16px 0 0; max-width: 22ch;
    }
    .cn-mast__meta {
      display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center;
      margin: 18px 0 0; font-size: 10px; color: var(--cn-dough-dim);
    }
    .cn-mast__meta a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--cn-line); }
    @media (min-width: 700px) {
      .cn-mast { padding-top: 44px; }
      .cn-mast__media { width: 46%; margin-right: 0; }
      .cn-mast__name { margin-top: -64px; }
    }

    /* ── L'ENSEIGNE COLLANTE : une seule barre, jamais deux ── */
    .cn-board {
      position: sticky; top: 0; z-index: 50;
      background: var(--cn-char); border-top: 1px solid var(--cn-line); border-bottom: 1px solid var(--cn-line);
      display: flex; align-items: stretch;
    }
    .cn-board__mark {
      display: flex; align-items: center; gap: 7px; flex-shrink: 0;
      padding-left: 16px; padding-right: 12px;
      border-right: 1px solid transparent;
      max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
      transition: max-width .35s ease, opacity .25s ease, border-color .35s ease;
    }
    .cn-board__mark--on { max-width: 190px; opacity: 1; border-right-color: var(--cn-line); }
    .cn-board__mark span { font-family: ${FONT.display}; font-size: 15px; text-transform: uppercase; }
    .cn-board__cats { display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; flex: 1; }
    .cn-cat {
      flex-shrink: 0; border: none; cursor: pointer; background: transparent;
      font-family: ${FONT.mono}; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase;
      color: var(--cn-dough-dim); padding: 14px 15px; transition: color .15s ease;
      display: inline-flex; align-items: center; gap: 7px;
    }
    .cn-cat:hover { color: var(--cn-dough); }
    .cn-cat--on { background: var(--cn-accent); color: var(--cn-accent-ink); }

    /* ── LA CARTE ── */
    .cn-menu { max-width: 760px; margin: 0 auto; padding: 34px 18px 0; }
    .cn-cathead { display: flex; align-items: baseline; gap: 12px; margin: 0 0 20px; }
    .cn-cathead__name { font-size: clamp(28px, 8vw, 46px); }
    .cn-cathead__rule { flex: 1; height: 1px; background: var(--cn-line); }
    .cn-cathead__count { font-family: ${FONT.mono}; font-size: 9.5px; letter-spacing: .16em; color: var(--cn-dough-dim); text-transform: uppercase; }

    /* La ligne de carte — un ticket, pas une carte à coins arrondis */
    .cn-item {
      display: flex; gap: 16px; align-items: flex-start;
      padding: 20px 0; border-bottom: 1px solid var(--cn-line); position: relative;
    }
    .cn-item--out { opacity: .45; }
    .cn-item__body { flex: 1; min-width: 0; }
    .cn-item__head { display: flex; align-items: baseline; gap: 9px; }
    .cn-num {
      font-family: ${FONT.display}; font-size: 15px; flex-shrink: 0;
      color: transparent; -webkit-text-stroke: 1px var(--cn-dough-dim); opacity: .75;
    }
    .cn-item__name { font-size: 19px; font-weight: 600; margin: 0; line-height: 1.2; letter-spacing: -.01em; }
    .cn-item__desc {
      font-size: 13.5px; line-height: 1.55; color: var(--cn-dough-dim); margin: 7px 0 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cn-item__foot { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
    .cn-price { font-family: ${FONT.display}; font-size: 21px; color: var(--cn-accent); letter-spacing: 0; }
    .cn-leader { flex: 1; border-bottom: 1px dotted var(--cn-line); transform: translateY(-3px); min-width: 14px; }
    .cn-item__media { position: relative; flex-shrink: 0; width: 92px; margin-right: -12px; }
    .cn-item__media img { width: 100%; height: 116px; object-fit: cover; display: block; }
    .cn-item--out .cn-item__media img { filter: grayscale(1) brightness(.55); }

    /* La vedette — première ligne illustrée d'une catégorie */
    .cn-star { position: relative; padding: 0 0 26px; margin-bottom: 6px; }
    .cn-star__media { position: relative; width: 100%; }
    .cn-star__frame { aspect-ratio: 3 / 2; background: var(--cn-char-up); border-radius: ${ARCH_WIDE}; }
    .cn-star__frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cn-star__sticker {
      position: absolute; right: -6px; bottom: -14px; z-index: 3;
      background: var(--cn-accent); color: var(--cn-accent-ink);
      font-family: ${FONT.display}; font-size: 24px; padding: 12px 15px 10px;
      transform: rotate(-6deg); border-radius: 2px; box-shadow: 0 8px 24px rgba(0,0,0,.5);
    }
    .cn-star__kicker { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--cn-dough-dim); margin: 20px 0 0; display: flex; gap: 10px; align-items: center; }
    .cn-star__kicker b { color: var(--cn-accent); font-weight: 400; }
    .cn-star__name { font-size: clamp(26px, 7vw, 40px); margin: 9px 0 0; max-width: 15ch; }
    .cn-star__desc { font-size: 14.5px; line-height: 1.6; color: var(--cn-dough-dim); margin: 10px 0 0; max-width: 42ch; }
    .cn-star__foot { display: flex; align-items: center; gap: 12px; margin-top: 18px; flex-wrap: wrap; }

    @media (min-width: 700px) {
      .cn-star { display: grid; grid-template-columns: 1.05fr .95fr; gap: 30px; align-items: end; }
      .cn-star__kicker { margin-top: 0; }
      /* La pastille passe à gauche : à droite elle viendrait buter le bouton */
      .cn-star__sticker { right: auto; left: -10px; }
    }

    /* Bandeau « victime de son succès », tamponné en travers de l'image */
    .cn-sold {
      position: absolute; left: -8px; top: 18px; z-index: 3;
      background: var(--cn-hot); color: var(--cn-paper);
      font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
      padding: 5px 12px; transform: rotate(-6deg); border-radius: 1px;
    }

    /* Le pas-à-pas de quantité */
    .cn-step { display: inline-flex; align-items: center; border: 1px solid var(--cn-line); border-radius: 2px; }
    .cn-step button {
      width: 38px; height: 38px; border: none; background: transparent; cursor: pointer;
      color: var(--cn-accent); font-family: ${FONT.mono}; font-size: 16px; line-height: 1;
    }
    .cn-step button:hover { background: var(--cn-char-up); }
    .cn-step__n { font-family: ${FONT.display}; font-size: 16px; min-width: 26px; text-align: center; color: var(--cn-dough); }

    /* La ligne d'option déjà au panier */
    .cn-picked {
      display: flex; align-items: center; gap: 10px; justify-content: space-between;
      margin-top: 9px; padding: 9px 12px;
      background: var(--cn-char-up); border-left: 3px solid var(--cn-accent);
      font-family: ${FONT.mono}; font-size: 10px; letter-spacing: .06em; text-transform: none;
      color: var(--cn-dough-dim);
    }

    /* ── LE TICKET : papier de caisse, dentelé, en bas de l'écran ── */
    .cn-ticket {
      position: fixed; left: 12px; right: 12px; bottom: 14px; z-index: 70;
      max-width: 760px; margin: 0 auto;
      background: var(--cn-paper); color: var(--cn-paper-ink);
      border-radius: 2px; box-shadow: 0 14px 40px rgba(0,0,0,.6);
      display: flex; align-items: stretch; width: calc(100% - 24px); border: none;
      cursor: pointer; text-align: left; padding: 0; font: inherit;
      animation: cn-rise .3s ease;
    }
    .cn-ticket__notch { position: absolute; left: 0; right: 0; top: -1px; height: 12px; }
    .cn-ticket__body { flex: 1; padding: 15px 16px; min-width: 0; }
    .cn-ticket__label { font-family: ${FONT.mono}; font-size: 9px; letter-spacing: .18em; text-transform: uppercase; opacity: .6; }
    .cn-ticket__total { font-family: ${FONT.display}; font-size: 25px; margin-top: 3px; }
    .cn-ticket__go {
      display: flex; align-items: center; gap: 9px; padding: 0 20px;
      background: var(--cn-hot); color: var(--cn-paper);
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    }
    .cn-ticket--punch { animation: cn-punch .35s ease; }
  `

  const stampTone = isOpenNow ? p.fresh : p.doughDim

  // ── Chargement : la braise qui monte ────────────────────────────────────────
  if (loading) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center' }}>
        <div className="cn-arch" style={{ width: 46, height: 58, margin: '0 auto 18px', background: `linear-gradient(to top, ${p.hot}, ${p.accent})`, animation: 'cn-ember 1.4s ease-in-out infinite' }} />
        <p className="cn-mono" style={{ fontSize: 9.5, color: p.doughDim, margin: 0 }}>On allume le four</p>
      </div>
      <style>{`@keyframes cn-ember{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.45;transform:translateY(3px)}}`}</style>
    </div>
  )

  // ── 404 ────────────────────────────────────────────────────────────────────
  if (!restaurant) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p className="cn-display" style={{ fontSize: 62, margin: '0 0 14px', color: 'transparent', WebkitTextStroke: `1.5px ${p.line}` }}>404</p>
        <p className="cn-ed" style={{ fontSize: 21, margin: '0 0 8px', fontStyle: 'italic' }}>Rien ne cuit à cette adresse.</p>
        <p className="cn-mono" style={{ fontSize: 9.5, color: p.doughDim }}>Ce lien ne correspond à aucun restaurant</p>
      </div>
    </div>
  )

  const wordmarkLines = brand.wordmark.split('\n')

  // ── La carte ───────────────────────────────────────────────────────────────
  return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', paddingBottom: cartCount > 0 ? 120 : 56 }}>
      <style>{CSS}</style>

      {/* Panier retrouvé — un bout de ticket de la dernière visite */}
      {hasRestoredCart && cartCount > 0 && (
        <div style={{ background: p.accent, color: p.accentInk, padding: '9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p className="cn-mono" style={{ margin: 0, fontSize: 9.5 }}>
            Panier repris · {cartCount} article{cartCount > 1 ? 's' : ''}
          </p>
          <button onClick={() => setHasRestoredCart(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* ── MASTHEAD ── */}
      <header className="cn-mast">
        <div className="cn-mast__media cn-arch">
          {restaurant.cover_image_url
            ? <img src={restaurant.cover_image_url} alt="" />
            : <div className="cn-mast__ember">
                <div className="cn-mast__initial" style={{ fontSize: 'min(38vw, 190px)' }}>{(restaurant.name || '?').trim().charAt(0).toUpperCase()}</div>
              </div>
          }
          <span className="cn-stamp cn-mast__stamp" style={{ color: stampTone }}>
            {isOpenNow ? 'Ouvert · service en cours' : 'Fermé'}
          </span>
        </div>

        <h1 className="cn-display cn-mast__name">
          {wordmarkLines.map((line, i) => (
            <span key={i} style={{ display: 'block' }}>{line}</span>
          ))}
        </h1>

        {restaurant.description
          ? <p className="cn-ed cn-mast__voice">{restaurant.description}</p>
          : <p className="cn-ed cn-mast__voice">{brand.voice}</p>
        }

        <div className="cn-mast__meta cn-mono">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          )}
          {restaurant.address && (
            <span>{(() => {
              const parts = restaurant.address.split(',')
              const short = parts.slice(0, 3).join(',').trim()
              return short || restaurant.address
            })()}</span>
          )}
          {restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}
        </div>
      </header>

      {/* ── LA BANDE ── */}
      <div className="cn-band-wrap" aria-hidden="true">
        <div className="cn-band">
          <div className="cn-band__track">
            {[0, 1].map(copy => (
              <div key={copy} style={{ display: 'flex' }}>
                {brand.band.map((word, i) => (
                  <span key={i} className="cn-band__word">{word}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fermé — on commande quand même, pour plus tard */}
      {!isOpenNow && (
        <div style={{ padding: '0 18px 18px' }}>
          <div className="cn-note">
            <div>
              <p className="cn-note__k" style={{ margin: 0 }}>Four éteint</p>
              <p className="cn-note__v">
                {nextOpening
                  ? <>Prochain retrait possible <strong style={{ color: p.accent }}>{nextOpening.toLowerCase()}</strong>. La carte reste ouverte, commandez pour plus tard.</>
                  : <>La carte reste ouverte — composez votre commande pour plus tard.</>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Le mot du jour, écrit à la main sur l'ardoise */}
      {restaurant.daily_message && (
        <div style={{ padding: '0 18px 18px' }}>
          <div className="cn-note" style={{ borderLeftColor: p.hot }}>
            <div>
              <p className="cn-note__k" style={{ margin: 0, color: p.hot }}>Le mot du jour</p>
              <p className="cn-note__v cn-ed" style={{ fontStyle: 'italic', fontSize: 16 }}>{restaurant.daily_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── L'ENSEIGNE COLLANTE ── */}
      {orderedCategories.length > 0 && (
        <nav className="cn-board" aria-label="Catégories">
          <div className={`cn-board__mark${scrolled ? ' cn-board__mark--on' : ''}`}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpenNow ? p.fresh : p.doughDim, flexShrink: 0 }} />
            <span>{restaurant.name}</span>
          </div>
          <div className="cn-board__cats">
            {orderedCategories.map(cat => {
              const emoji = getCatEmoji(cat)
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  className={`cn-cat${isActive ? ' cn-cat--on' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat)
                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  {emoji && <span style={{ fontSize: 13 }}>{emoji}</span>}
                  {cat}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ── LA CARTE ── */}
      <main className="cn-menu">
        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <p className="cn-display" style={{ fontSize: 34, margin: '0 0 12px' }}>La carte arrive</p>
            <p className="cn-ed" style={{ color: p.doughDim, fontSize: 15, fontStyle: 'italic', margin: 0 }}>Le restaurant prépare son menu. Repassez dans un instant.</p>
          </div>
        )}

        {orderedCategories.map((cat, catIdx) => {
          const catProducts = products.filter(prod => (prod.category || 'Autres') === cat)
          return (
            <section key={cat} id={`cat-${cat}`} style={{ marginBottom: 46, scrollMarginTop: 54 }}>

              <div className="cn-cathead">
                <h2 className="cn-display cn-cathead__name" style={{ margin: 0 }}>{cat}</h2>
                <span className="cn-cathead__rule" />
                <span className="cn-cathead__count">{String(catIdx + 1).padStart(2, '0')} · {catProducts.length} plat{catProducts.length > 1 ? 's' : ''}</span>
              </div>

              {catProducts.map((product, idx) => {
                const cartItems = cart.filter(i => i.product.id === product.id)
                const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
                const unavailable = !product.is_available
                const hasFormule = (product as any).menu_extra_price > 0
                const isStar = idx === 0 && !!product.image_url

                // Le pied de ligne : prix, pointillés, action — partagé vedette/ligne
                const foot = (
                  <>
                    {unavailable ? (
                      <span className="cn-mono" style={{ fontSize: 9.5, color: p.doughDim }}>Indisponible</span>
                    ) : totalQty > 0 && cartItems.every(ci => !ci.optionGroups?.length) ? (
                      <div className="cn-step">
                        <button onClick={() => removeFromCart(cartItems[cartItems.length - 1].cartKey)} aria-label={`Retirer un ${product.name}`}>−</button>
                        <span className="cn-step__n">{totalQty}</span>
                        <button onClick={() => handleAddToCart(product)} aria-label={`Ajouter un ${product.name}`}>+</button>
                      </div>
                    ) : (
                      <button className="cn-btn" onClick={() => handleAddToCart(product)} disabled={loadingOptions}>
                        {totalQty > 0 ? `Ajouter · ${totalQty}` : 'Ajouter'}
                      </button>
                    )}
                  </>
                )

                // Les options déjà choisies, listées sous la ligne
                const picked = cartItems.length > 0 && cartItems.some(i => i.optionGroups && i.optionGroups.length > 0) && (
                  <div>
                    {cartItems.map(ci => (
                      <div key={ci.cartKey} className="cn-picked">
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {Object.values(ci.selectedOptions || {}).flat().map((i: any) => i.name).join(' · ')}
                          {ci.menuBoisson && <span style={{ color: p.accent }}> · {ci.menuBoisson}</span>}
                          {ci.menuAccomp && <span style={{ color: p.accent }}> · {ci.menuAccomp}</span>}
                          {ci.extraPrice > 0 && <span style={{ color: p.accent }}> +{price(ci.extraPrice)}€</span>}
                        </span>
                        <span className="cn-step" style={{ borderColor: 'transparent' }}>
                          <button onClick={() => removeFromCart(ci.cartKey)} style={{ width: 30, height: 30, color: p.doughDim }} aria-label="Retirer">−</button>
                          <span className="cn-step__n" style={{ fontSize: 13, minWidth: 18 }}>{ci.quantity}</span>
                          <button onClick={() => handleAddToCart(product)} style={{ width: 30, height: 30 }} aria-label="Ajouter">+</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )

                // ── La vedette : première ligne illustrée de la catégorie ──
                if (isStar) return (
                  <article key={product.id} className={`cn-star${unavailable ? ' cn-item--out' : ''}`}>
                    <div className="cn-star__media">
                      <div className="cn-arch cn-star__frame">
                        <img src={product.image_url} alt={product.name} style={unavailable ? { filter: 'grayscale(1) brightness(.55)' } : undefined} />
                      </div>
                      {unavailable && <span className="cn-sold">Victime de son succès</span>}
                      <span className="cn-star__sticker">{price(product.price)}€</span>
                    </div>
                    <div className="cn-star__txt">
                      <p className="cn-star__kicker">
                        <span>N°{String(idx + 1).padStart(2, '0')}</span>
                        {!unavailable && hasFormule && <b>Formule disponible</b>}
                      </p>
                      <h3 className="cn-display cn-star__name">{product.name}</h3>
                      {product.description && <p className="cn-star__desc">{product.description}</p>}
                      <div className="cn-star__foot">{foot}</div>
                      {picked}
                    </div>
                  </article>
                )

                // ── La ligne de carte ──
                return (
                  <article key={product.id} className={`cn-item${unavailable ? ' cn-item--out' : ''}`}>
                    <div className="cn-item__body">
                      <div className="cn-item__head">
                        <span className="cn-num">{String(idx + 1).padStart(2, '0')}</span>
                        <h3 className="cn-ed cn-item__name">{product.name}</h3>
                      </div>
                      {product.description && <p className="cn-item__desc">{product.description}</p>}
                      {!unavailable && hasFormule && (
                        <p className="cn-mono" style={{ fontSize: 9, color: p.accent, margin: '9px 0 0' }}>Formule disponible</p>
                      )}
                      <div className="cn-item__foot">
                        <span className="cn-price">{price(product.price)}€</span>
                        <span className="cn-leader" />
                        {foot}
                      </div>
                      {picked}
                    </div>

                    {product.image_url && (
                      <div className="cn-item__media">
                        <div className="cn-arch" style={{ background: p.charUp }}>
                          <img src={product.image_url} alt={product.name} />
                        </div>
                        {unavailable && <span className="cn-sold">Épuisé</span>}
                      </div>
                    )}
                  </article>
                )
              })}
            </section>
          )
        })}
      </main>

      {/* ── LE TICKET ── */}
      {cartCount > 0 && (
        <button
          className={`cn-ticket${cartBounce ? ' cn-ticket--punch' : ''}`}
          onClick={() => router.push(`/restaurant/${slug}/checkout`)}
        >
          <span className="cn-ticket__notch" style={perforation(p.ink, 'top')} />
          <span className="cn-ticket__body">
            <span className="cn-ticket__label" style={{ display: 'block' }}>{cartCount} article{cartCount > 1 ? 's' : ''} · à retirer sur place</span>
            <span className="cn-ticket__total" style={{ display: 'block' }}>{price(total)}€</span>
          </span>
          <span className="cn-ticket__go">Commander →</span>
        </button>
      )}

      {/* ── LA FEUILLE : personnaliser un plat ── */}
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
        const valid = optionsValid()

        return (
          <div className="cn-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) setOptionsModal(null) }}>
            <div className="cn-sheet">
              <span className="cn-sheet__notch" style={perforation(p.ink, 'top')} />
              <button className="cn-sheet__close" onClick={() => setOptionsModal(null)} aria-label="Fermer">✕</button>

              <p className="cn-mono" style={{ fontSize: 9, opacity: .55, margin: '0 0 8px' }}>Votre composition</p>
              <h3 className="cn-display cn-sheet__title">{prod.name}</h3>

              {menuPrice > 0 && (
                <div style={{ marginTop: 22 }}>
                  <div className="cn-group__head" style={{ marginTop: 0 }}>
                    <span>La formule</span>
                    <span className="cn-group__rule" />
                  </div>
                  <div className="cn-formule">
                    <button type="button" className={!wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(false)}>
                      <div className="cn-formule__t">Plat seul</div>
                      <div className="cn-formule__p">{price(prod.price)}€</div>
                    </button>
                    <button type="button" className={wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(true)}>
                      <div className="cn-formule__t">En menu</div>
                      <div className="cn-formule__p">+{price(Math.max(0, menuPrice - Number(prod.price)))}€</div>
                    </button>
                  </div>
                  {menuLabel && <p className="cn-mono" style={{ fontSize: 9, opacity: .6, margin: '8px 0 0' }}>{menuLabel}</p>}
                </div>
              )}

              {optionsModal.groups.map(group => (
                <div key={group.id}>
                  <div className="cn-group__head">
                    <span>{group.name}</span>
                    <span className="cn-group__rule" />
                    <span className={group.min_choices > 0 ? 'cn-group__req' : ''}>
                      {group.max_choices === 1 ? '1 choix' : `jusqu'à ${group.max_choices}`}{group.min_choices > 0 ? ' · requis' : ''}
                    </span>
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
                <div>
                  <div className="cn-group__head">
                    <span>L&apos;accompagnement</span>
                    <span className="cn-group__rule" />
                    <span className="cn-group__req">requis</span>
                  </div>
                  {accomps.map(a => (
                    <OptRow
                      key={a.id}
                      label={a.name}
                      single
                      on={selectedAccomp?.id === a.id}
                      extra={Number(a.price) === 0 ? 'inclus' : `+${price(a.price)}€`}
                      onClick={() => setSelectedAccomp(a)}
                    />
                  ))}
                </div>
              )}

              {wantsMenu && boissons.length > 0 && (
                <div>
                  <div className="cn-group__head">
                    <span>La boisson</span>
                    <span className="cn-group__rule" />
                    <span className="cn-group__req">requis</span>
                  </div>
                  {boissons.map(b => (
                    <OptRow
                      key={b.id}
                      label={b.name}
                      single
                      on={selectedBoisson?.id === b.id}
                      extra={Number((b as any).menu_supplement) > 0 ? `+${price((b as any).menu_supplement)}€` : 'incluse'}
                      onClick={() => setSelectedBoisson(b)}
                    />
                  ))}
                </div>
              )}

              <button className="cn-confirm" onClick={confirmOptions} disabled={!valid}>
                <span>Mettre au panier</span>
                <b>{price(totalItem)}€</b>
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── LA FEUILLE : plat seul ou en menu (produits sans options) ── */}
      {menuOnlyModal && (() => {
        const prod = menuOnlyModal
        const menuPrice = Number((prod as any).menu_extra_price || 0)
        const menuLabel = (prod as any).menu_label
        const accomps = products.filter(a => a.category === 'Accompagnements' && a.is_available !== false)
        const boissons = products.filter(b => b.category === 'Boissons' && b.is_available !== false)
        const wantsAccomp = (prod as any).has_accompagnement !== false
        const needsAccomp = wantsMenu && wantsAccomp && accomps.length > 0 && !selectedAccomp
        const needsBoisson = wantsMenu && boissons.length > 0 && !selectedBoisson
        const blocked = needsAccomp || needsBoisson

        const accompExtra = wantsMenu && selectedAccomp ? Number(selectedAccomp.price) : 0
        const boissonExtra = wantsMenu && selectedBoisson ? Number((selectedBoisson as any).menu_supplement || 0) : 0
        const totalItem = wantsMenu ? menuPrice + accompExtra + boissonExtra : Number(prod.price)

        return (
          <div className="cn-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) setMenuOnlyModal(null) }}>
            <div className="cn-sheet">
              <span className="cn-sheet__notch" style={perforation(p.ink, 'top')} />
              <button className="cn-sheet__close" onClick={() => setMenuOnlyModal(null)} aria-label="Fermer">✕</button>

              <p className="cn-mono" style={{ fontSize: 9, opacity: .55, margin: '0 0 8px' }}>Seul ou en formule</p>
              <h3 className="cn-display cn-sheet__title">{prod.name}</h3>
              {prod.description && <p className="cn-ed" style={{ fontSize: 14.5, lineHeight: 1.55, opacity: .7, margin: '12px 0 0' }}>{prod.description}</p>}

              <div style={{ marginTop: 22 }}>
                <div className="cn-formule">
                  <button type="button" className={!wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(false)}>
                    <div className="cn-formule__t">Plat seul</div>
                    <div className="cn-formule__p">{price(prod.price)}€</div>
                  </button>
                  <button type="button" className={wantsMenu ? 'on' : ''} onClick={() => setWantsMenu(true)}>
                    <div className="cn-formule__t">En menu</div>
                    <div className="cn-formule__p">+{price(Math.max(0, menuPrice - Number(prod.price)))}€</div>
                  </button>
                </div>
                {menuLabel && <p className="cn-mono" style={{ fontSize: 9, opacity: .6, margin: '8px 0 0' }}>{menuLabel}</p>}
              </div>

              {wantsMenu && wantsAccomp && accomps.length > 0 && (
                <div>
                  <div className="cn-group__head">
                    <span>L&apos;accompagnement</span>
                    <span className="cn-group__rule" />
                    <span className="cn-group__req">requis</span>
                  </div>
                  {accomps.map(a => (
                    <OptRow
                      key={a.id}
                      label={a.name}
                      single
                      on={selectedAccomp?.id === a.id}
                      extra={Number(a.price) === 0 ? 'inclus' : `+${price(a.price)}€`}
                      onClick={() => setSelectedAccomp(a)}
                    />
                  ))}
                </div>
              )}

              {wantsMenu && boissons.length > 0 && (
                <div>
                  <div className="cn-group__head">
                    <span>La boisson</span>
                    <span className="cn-group__rule" />
                    <span className="cn-group__req">requis</span>
                  </div>
                  {boissons.map(b => (
                    <OptRow
                      key={b.id}
                      label={b.name}
                      single
                      on={selectedBoisson?.id === b.id}
                      extra={Number((b as any).menu_supplement) > 0 ? `+${price((b as any).menu_supplement)}€` : 'incluse'}
                      onClick={() => setSelectedBoisson(b)}
                    />
                  ))}
                </div>
              )}

              <button
                className="cn-confirm"
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
                <span>Mettre au panier</span>
                <b>{price(totalItem)}€</b>
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** Une case à cocher de bon de commande : on croise la case à l'encre. */
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
        <span className="cn-opt__box" style={{ borderRadius: single ? '50%' : 2 }}>{on ? '✕' : ''}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </span>
      {extra && <span className="cn-opt__extra">{extra}</span>}
    </button>
  )
}
