'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Catalog, Category, Closure, DaySchedule, OptionGroup, Product, Restaurant, Selection } from '@/lib/eatup/types'
import { emptySelection, getMenuOffer, DRINKS_CATEGORY, HIDDEN_CATEGORIES, isProductAvailable } from '@/lib/eatup/pricing'
import { getOpenStatus, getPickupSlots, formatParisTime } from '@/lib/eatup/schedule'
import { formatPrice } from '@/lib/eatup/money'
import type { CartLine, CartRow } from '@/lib/eatup/cart'
import { brandStyle } from '@/lib/eatup/brand'
import { useCart } from './use-cart'
import { useBackToClose } from './sheet'
import { RestaurantHero } from './restaurant-hero'
import { CategoryNav, type NavCategory } from './category-nav'
import { ProductCard } from './product-card'
import { ProductSheet, type SheetRequest } from './product-sheet'
import { CartSheet } from './cart-sheet'
import { ActiveOrderBanner } from './active-order'
import { BagIcon, CheckIcon, ChevronRightIcon, SearchIcon } from './icons'

type RestaurantViewProps = {
  restaurant: Restaurant
  products: Product[]
  categories: Category[]
  groupsByProduct: Record<string, OptionGroup[]>
  schedules: DaySchedule[]
  closures: Closure[]
  serverNow: string
}

type Section = NavCategory & { products: Product[] }
type Toast = { id: number; message: string; undo?: CartLine[] }

const noopSubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Petit point orange qui file du bouton « + » vers le panier (transform/opacity uniquement). */
function flyToCart(from: HTMLElement, to: HTMLElement | null) {
  if (!to || prefersReducedMotion()) return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const dot = document.createElement('span')
  const size = 16
  Object.assign(dot.style, {
    position: 'fixed', left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`, height: `${size}px`, borderRadius: '999px', background: 'var(--brand)',
    boxShadow: '0 0 0 3px #fff, 0 6px 16px rgba(23,23,23,.35)', zIndex: '60', pointerEvents: 'none',
  })
  document.body.appendChild(dot)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const anim = dot.animate([
    { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
    { transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 90}px, 0) scale(1.15)`, opacity: 1, offset: 0.45 },
    { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.45)`, opacity: 0.4 },
  ], { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' })
  anim.onfinish = () => dot.remove()
  anim.oncancel = () => dot.remove()
}

export function RestaurantView({ restaurant, products, categories, groupsByProduct, schedules, closures, serverNow }: RestaurantViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isClient = useIsClient()
  const slug = restaurant.slug

  // ── Horloge : statut et créneaux réévalués chaque minute, en heure de Paris ──
  const [now, setNow] = useState(() => new Date(serverNow))
  useEffect(() => {
    const tick = () => setNow(new Date())
    const raf = requestAnimationFrame(tick)
    const id = window.setInterval(tick, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelAnimationFrame(raf); clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  const status = useMemo(() => getOpenStatus(schedules, closures, now), [schedules, closures, now])
  const pickup = useMemo(() => getPickupSlots(schedules, closures, now), [schedules, closures, now])
  const pickupLabel = pickup ? `${pickup.dayOffset === 0 ? '' : `${pickup.dayLabel} `}${formatParisTime(pickup.slots[0])}` : null

  // ── Carte ──
  const catalog: Catalog = useMemo(() => ({ products, groupsByProduct }), [products, groupsByProduct])
  const cart = useCart(slug, catalog)
  const quantities = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of cart.lines) map[l.productId] = (map[l.productId] || 0) + l.quantity
    return map
  }, [cart.lines])

  const sections: Section[] = useMemo(() => {
    const visible = products.filter(p => !HIDDEN_CATEGORIES.has(p.category || 'Autres'))
    const names = [...new Set(visible.map(p => p.category || 'Autres'))]
    const ordered = [
      ...categories.map(c => c.name).filter(n => names.includes(n)),
      ...names.filter(n => !categories.some(c => c.name === n)),
    ]
    return ordered.map((name, i) => {
      const list = visible.filter(p => (p.category || 'Autres') === name)
      return { id: `cat-${i}`, name, emoji: categories.find(c => c.name === name)?.emoji || null, count: list.length, products: list }
    })
  }, [products, categories])
  const menuSize = sections.reduce((s, c) => s + c.count, 0)

  const offers = useMemo(() => {
    const map: Record<string, ReturnType<typeof getMenuOffer>> = {}
    for (const p of products) map[p.id] = getMenuOffer(p, products)
    return map
  }, [products])
  const isConfigurable = useCallback(
    (p: Product) => (groupsByProduct[p.id]?.length || 0) > 0 || Boolean(offers[p.id]?.available),
    [groupsByProduct, offers],
  )

  // ── Recherche ──
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return []
    return sections.flatMap(s => s.products).filter(p => normalize(`${p.name} ${p.description || ''}`).includes(q))
  }, [query, sections])

  // ── Catégorie active (scrollspy) ──
  const [active, setActive] = useState<string | null>(sections[0]?.id || null)
  const lockUntil = useRef(0)
  const sectionKey = sections.map(s => s.id).join('|')
  useEffect(() => {
    if (searching) return
    const ids = sectionKey ? sectionKey.split('|') : []
    const visible = new Map<string, boolean>()
    const io = new IntersectionObserver(entries => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting)
      if (Date.now() < lockUntil.current) return
      const first = ids.find(id => visible.get(id))
      if (first) setActive(first)
    }, { rootMargin: '-76px 0px -55% 0px' })
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [sectionKey, searching])

  function goToSection(id: string) {
    setActive(id)
    lockUntil.current = Date.now() + 900
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 68
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  // ── Feuilles (fiche produit, panier) ──
  const [sheet, setSheet] = useState<SheetRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(() => searchParams.get('panier') === '1')
  const session = useRef(0)

  const openProduct = useCallback((product: Product, edit?: SheetRequest['edit']) => {
    session.current += 1
    setSheet({ session: session.current, product, edit })
    setSheetOpen(true)
  }, [])

  const closeProduct = useCallback(() => {
    setSheetOpen(false)
    if (sheet?.edit) setCartOpen(true)
  }, [sheet])

  const closeCart = useCallback(() => setCartOpen(false), [])

  // « Modifier le panier » depuis le paiement arrive avec ?panier=1 : on nettoie l'URL.
  useEffect(() => {
    if (searchParams.get('panier') === '1') window.history.replaceState(null, '', pathname)
  }, [searchParams, pathname])

  const closeAll = useCallback(() => { setSheetOpen(false); setCartOpen(false) }, [])
  useBackToClose(isClient && (sheetOpen || cartOpen), closeAll)

  useEffect(() => {
    if (cartOpen) router.prefetch(`/restaurant/${slug}/checkout`)
  }, [cartOpen, router, slug])

  // ── Retours visuels ──
  const [toast, setToast] = useState<Toast | null>(null)
  const [bump, setBump] = useState(0)
  const cartTarget = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  function notifyAdded(name: string, before: CartLine[], verb = 'ajouté') {
    setBump(b => b + 1)
    setToast({ id: Date.now(), message: `${name} ${verb}`, undo: before })
  }

  function quickAdd(product: Product, source: HTMLElement) {
    if (isConfigurable(product)) { openProduct(product); return }
    const before = cart.lines
    cart.add(product, emptySelection(), 1)
    requestAnimationFrame(() => flyToCart(source, cartTarget.current))
    notifyAdded(product.name, before)
  }

  function confirmProduct(product: Product, selection: Selection, quantity: number, editKey?: string) {
    const before = cart.lines
    if (editKey) cart.update(editKey, product, selection, quantity)
    else cart.add(product, selection, quantity)
    notifyAdded(product.name, before, editKey ? 'mis à jour' : 'ajouté')
  }

  function editRow(row: CartRow) {
    if (!row.product) return
    setCartOpen(false)
    openProduct(row.product, { lineKey: row.line.key, selection: row.line.selection, quantity: row.line.quantity })
  }

  function goToCheckout() {
    // Remplace l'entrée d'historique de la feuille : « retour » depuis le paiement ramène à la carte.
    router.replace(`/restaurant/${slug}/checkout`)
  }

  // Suggestion de boissons : seulement si le panier n'en contient pas déjà (directement ou via une formule).
  const drinkSuggestions = useMemo(() => {
    const hasDrink = cart.summary.rows.some(r => r.line.selection.menu || r.product?.category === DRINKS_CATEGORY)
    if (hasDrink) return []
    return products.filter(p => p.category === DRINKS_CATEGORY && isProductAvailable(p)).slice(0, 8)
  }, [cart.summary.rows, products])

  const lineCount = cart.lines.reduce((s, l) => s + l.quantity, 0)
  const showCartBar = isClient && cart.lines.length > 0

  return (
    <div className="eu-app pb-[calc(120px+env(safe-area-inset-bottom))]" style={brandStyle(restaurant.accent_color)}>
      <RestaurantHero restaurant={restaurant} status={status} pickup={pickup} />
      {isClient && <ActiveOrderBanner slug={slug} now={now} />}

      {sections.length > 0 && (
        <>
          <div className="h-6" aria-hidden="true" />
          <CategoryNav
            categories={sections}
            active={active}
            onSelect={goToSection}
            searchEnabled={menuSize >= 12}
            searching={searching}
            query={query}
            onSearchOpen={() => setSearching(true)}
            onSearchClose={() => { setSearching(false); setQuery('') }}
            onQueryChange={setQuery}
          />
        </>
      )}

      <main className="mx-auto max-w-3xl px-4 pt-5">
        {sections.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-sand/70 text-3xl" aria-hidden="true">🍽️</div>
            <p className="mt-5 font-display text-[22px] font-bold">La carte arrive bientôt</p>
            <p className="mt-1.5 max-w-[280px] text-[15px] text-muted">Le restaurant prépare son menu en ligne. Revenez dans quelques instants.</p>
          </div>
        )}

        {searching ? (
          <section aria-live="polite">
            {query.trim() === '' ? (
              <p className="py-10 text-center text-[15px] text-muted">Tapez le nom d’un plat ou d’un ingrédient.</p>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-sand/70"><SearchIcon size={26} /></span>
                <p className="mt-4 text-[17px] font-semibold">Aucun plat ne correspond</p>
                <p className="mt-1 text-[14px] text-muted">Essayez un autre mot, ou parcourez les catégories.</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-[14px] text-muted">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
                <div className="flex flex-col gap-3">
                  {results.map((p, i) => (
                    <ProductCard
                      key={p.id} product={p} offer={offers[p.id]} available={isProductAvailable(p)}
                      configurable={isConfigurable(p)} inCart={isClient ? quantities[p.id] || 0 : 0} index={i}
                      onOpen={openProduct} onQuickAdd={quickAdd}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20 pb-8">
              <div className="mb-3.5 flex items-baseline gap-2.5">
                {section.emoji && <span aria-hidden="true" className="text-[22px]">{section.emoji}</span>}
                <h2 id={`${section.id}-title`} className="font-display text-[24px] leading-tight font-bold tracking-[-0.02em]">{section.name}</h2>
                <span className="eu-num ml-auto text-[13px] text-muted">{section.count} {section.count > 1 ? 'plats' : 'plat'}</span>
              </div>
              <div className="flex flex-col gap-3">
                {section.products.map((p, i) => (
                  <ProductCard
                    key={p.id} product={p} offer={offers[p.id]} available={isProductAvailable(p)}
                    configurable={isConfigurable(p)} inCart={isClient ? quantities[p.id] || 0 : 0} index={i}
                    onOpen={openProduct} onQuickAdd={quickAdd}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <footer className="mt-4 flex flex-col items-center gap-1 pb-4 text-center text-[13px] text-muted">
          <span>Commande en ligne, retrait sur place.</span>
          <span>Propulsé par <span className="font-display font-bold text-ink">eat<span className="text-brand-text">up</span></span></span>
        </footer>
      </main>

      {/* ── Barre panier ── */}
      {showCartBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))]" style={{ animation: 'eu-fade-up .4s var(--eu-ease-out) both' }}>
          {toast && (
            <div key={toast.id} role="status" className="mx-auto mb-2 flex max-w-[560px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-cream shadow-[var(--eu-shadow-float)]" style={{ animation: 'eu-fade-up .3s var(--eu-ease-out) both' }}>
              <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink"><CheckIcon size={15} strokeWidth={2.6} /></span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{toast.message}</span>
              {toast.undo && (
                <button
                  type="button"
                  onClick={() => { cart.restore(toast.undo!); setToast(null) }}
                  className="eu-press -my-1 h-9 rounded-full px-3 text-[14px] font-semibold text-[var(--eu-orange)] hover:bg-white/10"
                >
                  Annuler
                </button>
              )}
            </div>
          )}
          <button
            key={bump}
            type="button"
            onClick={() => setCartOpen(true)}
            className={`eu-press mx-auto flex h-[62px] w-full max-w-[560px] items-center gap-3 rounded-[22px] bg-brand pr-5 pl-2.5 text-brand-ink shadow-[0_14px_36px_-12px_rgba(23,23,23,0.55)] ${bump ? 'eu-bump' : ''}`}
            aria-label={`Voir le panier : ${lineCount} article${lineCount > 1 ? 's' : ''}, ${formatPrice(cart.summary.total)}`}
          >
            <span ref={cartTarget} className="relative grid size-11 place-items-center rounded-2xl bg-ink text-cream">
              <BagIcon size={21} />
              <span key={lineCount} className="eu-badge-pop eu-num absolute -top-1.5 -right-1.5 grid min-w-[22px] place-items-center rounded-full bg-cream px-1 text-[12px] leading-[22px] font-bold text-ink ring-2 ring-brand">
                {lineCount}
              </span>
            </span>
            <span className="flex-1 text-left text-[16px] font-semibold">{cart.summary.blocked ? 'Panier à vérifier' : 'Voir le panier'}</span>
            <span className="eu-num flex items-center gap-1 text-[16px] font-bold">
              {formatPrice(cart.summary.total)}
              <ChevronRightIcon size={18} />
            </span>
          </button>
        </div>
      )}

      <ProductSheet
        request={sheet}
        open={sheetOpen}
        groupsByProduct={groupsByProduct}
        products={products}
        onClose={closeProduct}
        onConfirm={confirmProduct}
      />
      <CartSheet
        open={isClient && cartOpen}
        onClose={closeCart}
        summary={cart.summary}
        groupsByProduct={groupsByProduct}
        restaurantName={restaurant.name}
        pickupLabel={pickupLabel}
        onQuantity={cart.setQuantity}
        onEdit={editRow}
        onCheckout={goToCheckout}
        suggestions={drinkSuggestions}
        onSuggestion={(drink, source) => {
          if (isConfigurable(drink)) { setCartOpen(false); openProduct(drink); return }
          quickAdd(drink, source)
        }}
      />
    </div>
  )
}
