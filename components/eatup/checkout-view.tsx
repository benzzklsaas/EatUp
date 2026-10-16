'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import type { Catalog, Closure, DaySchedule, OptionGroup, Product, Restaurant } from '@/lib/eatup/types'
import { getPickupSlots, groupSlotsByService, formatParisTime, formatPickup, DAY_NAMES, parisParts } from '@/lib/eatup/schedule'
import { formatPrice } from '@/lib/eatup/money'
import { generateOrderNumber, validateCustomer, type CustomerField } from '@/lib/eatup/order-request'
import { brandStyle } from '@/lib/eatup/brand'
import { writeRaw } from '@/lib/eatup/client-store'
import { useCart } from './use-cart'
import { lastOrderKey } from './active-order'
import { mapsUrl } from './restaurant-hero'
import { FoodImage } from './food-image'
import {
  AlertIcon, BagIcon, CardIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ClockIcon, EditIcon, PinIcon, RefreshIcon, Spinner,
} from './icons'

type CheckoutViewProps = {
  restaurant: Restaurant
  products: Product[]
  groupsByProduct: Record<string, OptionGroup[]>
  schedules: DaySchedule[]
  closures: Closure[]
  serverNow: string
}

type ServerError = {
  message: string
  code?: string
  items?: { productId: string; message: string }[]
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const pendingKey = (slug: string) => `eatup_pending_order_${slug}`
const noopSubscribe = () => () => {}

function sessionGet(key: string) { try { return window.sessionStorage.getItem(key) } catch { return null } }
function sessionSet(key: string, value: string | null) {
  try { if (value === null) window.sessionStorage.removeItem(key); else window.sessionStorage.setItem(key, value) } catch { /* stockage indisponible */ }
}

export function CheckoutView({ restaurant, products, groupsByProduct, schedules, closures, serverNow }: CheckoutViewProps) {
  const router = useRouter()
  const slug = restaurant.slug
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const catalog: Catalog = useMemo(() => ({ products, groupsByProduct }), [products, groupsByProduct])
  const cart = useCart(slug, catalog)
  const { summary } = cart

  // ── Créneaux réels, recalculés chaque minute ──
  const [now, setNow] = useState(() => new Date(serverNow))
  useEffect(() => {
    const tick = () => setNow(new Date())
    const raf = requestAnimationFrame(tick)
    const id = window.setInterval(tick, 30_000)
    return () => { cancelAnimationFrame(raf); clearInterval(id) }
  }, [])
  const pickup = useMemo(() => getPickupSlots(schedules, closures, now), [schedules, closures, now])
  const [chosenSlot, setChosenSlot] = useState<string | null>(null)
  const slotStillValid = Boolean(chosenSlot && pickup?.slots.includes(chosenSlot))
  const slot = slotStillValid ? chosenSlot : pickup?.slots[0] ?? null
  const slotExpired = Boolean(chosenSlot && !slotStillValid)
  const [showAllSlots, setShowAllSlots] = useState(false)

  // ── Coordonnées ──
  const [form, setForm] = useState<Record<CustomerField, string>>({ firstName: '', lastName: '', email: '', phone: '' })
  const [touched, setTouched] = useState<Partial<Record<CustomerField, boolean>>>({})
  const [serverFieldError, setServerFieldError] = useState<{ field: CustomerField; message: string } | null>(null)
  const errors = validateCustomer(form)
  const fieldError = (f: CustomerField) => (serverFieldError?.field === f ? serverFieldError.message : touched[f] ? errors[f] : undefined)
  const inputs = useRef<Partial<Record<CustomerField, HTMLInputElement | null>>>({})

  // ── Envoi ──
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerError | null>(null)
  const [recapOpen, setRecapOpen] = useState(false)
  const [placed, setPlaced] = useState<string | null>(null)
  const lock = useRef(false)
  const slotsRef = useRef<HTMLElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (lock.current) return
    setServerError(null)
    setServerFieldError(null)
    setTouched({ firstName: true, lastName: true, email: true, phone: true })
    const firstInvalid = (['firstName', 'lastName', 'email', 'phone'] as CustomerField[]).find(f => errors[f])
    if (firstInvalid) { inputs.current[firstInvalid]?.focus(); return }
    if (!slot) { slotsRef.current?.scrollIntoView({ block: 'center' }); return }
    if (summary.blocked || summary.rows.length === 0) return

    lock.current = true
    setSubmitting(true)
    try {
      // Le même numéro est réutilisé si l'envoi doit être retenté : le serveur ne crée pas de doublon.
      let orderNumber = sessionGet(pendingKey(slug))
      if (!orderNumber) {
        orderNumber = generateOrderNumber(n => crypto.getRandomValues(new Uint8Array(n)))
        sessionSet(pendingKey(slug), orderNumber)
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          orderNumber,
          customer: form,
          pickupTime: slot,
          items: cart.lines.map(l => ({ productId: l.productId, quantity: l.quantity, selection: l.selection })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.order) {
        lock.current = false
        setSubmitting(false)
        if (json.code === 'SLOT_UNAVAILABLE') { setNow(new Date()); setChosenSlot(null) }
        if (json.code === 'INVALID' && json.field && json.field in form) {
          setServerFieldError({ field: json.field, message: json.error })
          inputs.current[json.field as CustomerField]?.focus()
          return
        }
        setServerError({ message: json.error || 'La commande n’a pas pu être envoyée. Réessayez.', code: json.code, items: json.items })
        return
      }
      const created = json.order as { order_number: string; pickup_time: string }
      sessionSet(pendingKey(slug), null)
      sessionSet(`eatup_order_name_${created.order_number}`, form.firstName.trim())
      writeRaw(lastOrderKey(slug), JSON.stringify({ orderNumber: created.order_number, pickupTime: created.pickup_time, createdAt: new Date().toISOString() }))
      setPlaced(created.order_number)
      router.replace(`/suivi/${encodeURIComponent(created.order_number)}?nouvelle=1`)
      cart.clear()
    } catch {
      lock.current = false
      setSubmitting(false)
      setServerError({ message: 'Connexion interrompue. Réessayez : si la commande a déjà été reçue, elle ne sera pas enregistrée deux fois.', code: 'NETWORK' })
    }
  }

  const style = brandStyle(restaurant.accent_color)
  const backHref = `/restaurant/${slug}`

  const header = (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-xl items-center gap-3 px-3">
        <Link href={backHref} className="eu-press grid size-11 place-items-center rounded-full hover:bg-white" aria-label="Retour au menu">
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-[19px] leading-tight font-bold tracking-[-0.01em]">Finaliser la commande</h1>
          <p className="truncate text-[13px] text-muted">{restaurant.name} · click & collect</p>
        </div>
      </div>
    </header>
  )

  if (!isClient) {
    return <div className="eu-app" style={style}>{header}</div>
  }

  if (placed) {
    // Transition le temps d'ouvrir la page de suivi (le panier vient d'être vidé).
    return (
      <div className="eu-app grid place-items-center px-6" style={style}>
        <div className="flex flex-col items-center text-center" role="status">
          <span className="grid size-20 place-items-center rounded-full bg-brand text-brand-ink" style={{ animation: 'eu-pop-in .45s var(--eu-ease-spring) both' }}>
            <CheckIcon size={38} strokeWidth={2.4} />
          </span>
          <p className="mt-5 font-display text-[24px] font-bold">Commande envoyée</p>
          <p className="eu-num mt-1 text-[15px] text-muted">{placed} · ouverture du suivi…</p>
        </div>
      </div>
    )
  }

  if (summary.rows.length === 0) {
    return (
      <div className="eu-app" style={style}>
        {header}
        <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
          <span className="grid size-24 place-items-center rounded-full bg-sand/70"><BagIcon size={40} strokeWidth={1.5} /></span>
          <h2 className="mt-5 font-display text-[22px] font-bold">Votre panier est vide</h2>
          <p className="mt-1.5 text-[15px] text-muted">Ajoutez des plats depuis la carte pour passer commande.</p>
          <Link href={backHref} className="eu-press mt-6 flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-semibold text-cream">Voir la carte</Link>
        </div>
      </div>
    )
  }

  const visibleSlots = pickup ? (showAllSlots ? pickup.slots : pickup.slots.slice(0, 12)) : []
  const services = groupSlotsByService(visibleSlots)
  const dayTitle = pickup ? (() => {
    const p = parisParts(new Date(pickup.slots[0]))
    const date = `${DAY_NAMES[p.weekday].toLowerCase()} ${p.d} ${MONTHS[p.m - 1]}`
    return pickup.dayOffset === 0 ? `Aujourd’hui, ${date}` : pickup.dayOffset === 1 ? `Demain, ${date}` : date.charAt(0).toUpperCase() + date.slice(1)
  })() : null
  const canSubmit = !submitting && Boolean(slot) && !summary.blocked

  return (
    <div className="eu-app pb-[calc(130px+env(safe-area-inset-bottom))]" style={style}>
      {header}
      <form onSubmit={submit} noValidate className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-5">

        {/* ── Récapitulatif ── */}
        <section className="eu-reveal rounded-[24px] bg-white shadow-[var(--eu-shadow-card)]" aria-labelledby="recap-title">
          <button type="button" onClick={() => setRecapOpen(o => !o)} aria-expanded={recapOpen} className="flex w-full items-center gap-3 p-4 text-left">
            <span className="grid size-11 place-items-center rounded-2xl bg-cream"><BagIcon size={20} /></span>
            <span className="min-w-0 flex-1">
              <span id="recap-title" className="block text-[16px] font-semibold">Votre commande</span>
              <span className="block text-[14px] text-muted">{summary.count} article{summary.count > 1 ? 's' : ''} · {formatPrice(summary.total)}</span>
            </span>
            <ChevronDownIcon size={20} className={`transition-transform duration-300 ${recapOpen ? 'rotate-180' : ''}`} />
          </button>
          {(recapOpen || summary.blocked) && (
            <div className="border-t border-line px-4 pt-3 pb-4" style={{ animation: 'eu-fade-in .25s ease both' }}>
              <ul className="flex flex-col gap-3">
                {summary.rows.map(row => {
                  const options = row.priced?.chosen.flatMap(c => c.items.map(i => i.name)) || []
                  const menu = row.line.selection.menu && row.priced ? [row.priced.side?.name, row.priced.drink?.name].filter(Boolean) : []
                  const image = row.product?.image_url || row.line.snapshot.imageUrl
                  return (
                    <li key={row.line.key} className="flex gap-3">
                      {image && <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-sand"><FoodImage src={image} alt="" sizes="48px" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium"><span className="eu-num">{row.line.quantity}×</span> {row.product?.name || row.line.snapshot.name}</span>
                        {menu.length > 0 && <span className="block text-[13px] text-muted">Formule · {menu.join(' · ')}</span>}
                        {options.length > 0 && <span className="block text-[13px] text-muted">{options.join(' · ')}</span>}
                        {row.status !== 'ok' && <span className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-danger"><AlertIcon size={14} /> À corriger dans le panier</span>}
                      </span>
                      <span className="eu-num shrink-0 text-[15px] font-medium">{row.status === 'ok' ? formatPrice(row.lineTotal) : '—'}</span>
                    </li>
                  )
                })}
              </ul>
              <Link href={`${backHref}?panier=1`} className="eu-press mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-cream px-4 text-[14px] font-semibold">
                <EditIcon size={16} /> Modifier le panier
              </Link>
            </div>
          )}
        </section>

        {/* ── Retrait ── */}
        <section ref={slotsRef} className="eu-reveal rounded-[24px] bg-white p-4 shadow-[var(--eu-shadow-card)] sm:p-5" style={{ '--i': 1 } as React.CSSProperties} aria-labelledby="pickup-title">
          <h2 id="pickup-title" className="flex items-center gap-2 text-[17px] font-semibold"><ClockIcon size={19} className="text-brand-text" /> Retrait</h2>
          {restaurant.address && (
            <a href={mapsUrl(restaurant.address)} target="_blank" rel="noopener noreferrer" className="eu-press mt-3 flex items-center gap-3 rounded-2xl bg-cream p-3">
              <PinIcon size={18} className="shrink-0 text-brand-text" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{restaurant.name}</span>
                <span className="block truncate text-[13px] text-muted">{restaurant.address}</span>
              </span>
              <span className="text-[13px] font-semibold">Itinéraire</span>
            </a>
          )}

          {!pickup ? (
            <div className="mt-4 rounded-2xl bg-warning/10 p-4 text-[14px] text-warning">
              <p className="font-semibold">Aucun créneau de retrait disponible</p>
              <p className="mt-1">Le restaurant n’accepte pas de commande sur les 7 prochains jours. {restaurant.phone ? `Contactez-le au ${restaurant.phone}.` : ''}</p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-[14px] font-semibold">{dayTitle}</p>
              {pickup.dayOffset > 0 && (
                <p className="mt-1 text-[13px] text-muted">Le restaurant est fermé d’ici là : votre commande sera prête {pickup.dayLabel}.</p>
              )}
              {slotExpired && chosenSlot && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-warning/10 px-3 py-2 text-[13px] font-medium text-warning" role="status">
                  <AlertIcon size={15} className="mt-px shrink-0" />
                  Le créneau de {formatParisTime(chosenSlot)} n’est plus disponible : {slot ? `nous avons sélectionné ${formatParisTime(slot)}.` : 'choisissez-en un autre.'}
                </p>
              )}
              <div className="mt-3 flex flex-col gap-4" role="radiogroup" aria-label="Heure de retrait">
                {services.map(service => {
                  const list = service.slots
                  return (
                    <div key={service.label}>
                      {services.length > 1 && <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">{service.label}</p>}
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {list.map(s => {
                          const selected = s === slot
                          const first = s === pickup.slots[0]
                          return (
                            <button
                              key={s}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setChosenSlot(s)}
                              className={`eu-press relative flex h-12 flex-col items-center justify-center rounded-2xl text-[15px] font-semibold ${selected ? 'bg-ink text-cream' : 'bg-cream text-ink hover:bg-sand/60'}`}
                            >
                              <span className="eu-num">{formatParisTime(s)}</span>
                              {first && <span className={`text-[10px] leading-none font-medium ${selected ? 'text-cream/70' : 'text-muted'}`}>au plus tôt</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              {pickup.slots.length > 12 && (
                <button type="button" onClick={() => setShowAllSlots(v => !v)} className="eu-press mt-3 h-10 rounded-full px-3 text-[14px] font-semibold underline-offset-4 hover:underline">
                  {showAllSlots ? 'Moins de créneaux' : `Voir les ${pickup.slots.length - 12} autres créneaux`}
                </button>
              )}
            </>
          )}
        </section>

        {/* ── Coordonnées ── */}
        <section className="eu-reveal rounded-[24px] bg-white p-4 shadow-[var(--eu-shadow-card)] sm:p-5" style={{ '--i': 2 } as React.CSSProperties} aria-labelledby="contact-title">
          <h2 id="contact-title" className="text-[17px] font-semibold">Vos coordonnées</h2>
          <p className="mt-0.5 text-[13px] text-muted">Pour préparer votre commande et vous envoyer la confirmation.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Prénom" name="firstName" autoComplete="given-name" value={form.firstName} error={fieldError('firstName')}
              inputRef={el => { inputs.current.firstName = el }}
              onChange={v => { setForm(f => ({ ...f, firstName: v })); setServerFieldError(null) }} onBlur={() => setTouched(t => ({ ...t, firstName: true }))} />
            <Field label="Nom" name="lastName" autoComplete="family-name" value={form.lastName} error={fieldError('lastName')}
              inputRef={el => { inputs.current.lastName = el }}
              onChange={v => { setForm(f => ({ ...f, lastName: v })); setServerFieldError(null) }} onBlur={() => setTouched(t => ({ ...t, lastName: true }))} />
            <div className="col-span-2">
              <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} error={fieldError('email')}
                hint="La confirmation et le lien de suivi arrivent ici."
                inputRef={el => { inputs.current.email = el }}
                onChange={v => { setForm(f => ({ ...f, email: v })); setServerFieldError(null) }} onBlur={() => setTouched(t => ({ ...t, email: true }))} />
            </div>
            <div className="col-span-2">
              <Field label="Téléphone" optional name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} error={fieldError('phone')}
                hint="Utile au restaurant en cas d’imprévu."
                inputRef={el => { inputs.current.phone = el }}
                onChange={v => { setForm(f => ({ ...f, phone: v })); setServerFieldError(null) }} onBlur={() => setTouched(t => ({ ...t, phone: true }))} />
            </div>
          </div>
        </section>

        {/* ── Paiement ── */}
        <section className="eu-reveal rounded-[24px] bg-white p-4 shadow-[var(--eu-shadow-card)] sm:p-5" style={{ '--i': 3 } as React.CSSProperties} aria-labelledby="payment-title">
          <h2 id="payment-title" className="text-[17px] font-semibold">Paiement</h2>
          <div className="mt-3 flex items-center gap-3 rounded-2xl p-3.5 shadow-[inset_0_0_0_2px_var(--eu-ink)]" role="radio" aria-checked="true">
            <span className="grid size-11 place-items-center rounded-2xl bg-cream"><CardIcon size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Sur place, au retrait</span>
              <span className="block text-[13px] text-muted">Vous réglez directement au comptoir du restaurant.</span>
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink"><CheckIcon size={15} strokeWidth={2.6} /></span>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between"><span className="text-muted">Sous-total</span><span className="eu-num">{formatPrice(summary.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Frais de service</span><span>Aucun</span></div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-semibold">Total à régler sur place</span>
              <span className="eu-num text-[22px] font-bold tracking-tight">{formatPrice(summary.total)}</span>
            </div>
          </div>
        </section>

        {serverError && (
          <div className="rounded-[20px] bg-danger/8 p-4 text-[14px] text-danger shadow-[inset_0_0_0_1px_rgba(180,35,24,0.25)]" role="alert" style={{ animation: 'eu-fade-up .3s var(--eu-ease-out) both' }}>
            <p className="flex items-start gap-2 font-semibold"><AlertIcon size={17} className="mt-px shrink-0" />{serverError.message}</p>
            {serverError.items && serverError.items.length > 0 && (
              <ul className="mt-2 ml-6 list-disc space-y-0.5 text-[13px]">
                {serverError.items.map(i => (
                  <li key={i.productId}>
                    <strong>{products.find(p => p.id === i.productId)?.name || cart.lines.find(l => l.productId === i.productId)?.snapshot.name || 'Article'}</strong> : {i.message}
                  </li>
                ))}
              </ul>
            )}
            {serverError.code === 'ITEMS_INVALID' && (
              <Link href={`${backHref}?panier=1`} className="eu-press mt-3 inline-flex h-10 items-center rounded-full bg-white px-4 font-semibold text-ink">Revoir mon panier</Link>
            )}
            {serverError.code === 'OUTDATED_CLIENT' && (
              <button type="button" onClick={() => window.location.reload()} className="eu-press mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 font-semibold text-ink"><RefreshIcon size={16} /> Recharger</button>
            )}
          </div>
        )}

        <p className="px-2 text-center text-[12.5px] leading-relaxed text-muted">
          En confirmant, vous passez commande auprès de {restaurant.name}. Retrait prévu {slot ? formatPickup(slot, now).toLowerCase() : '—'}.
        </p>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/90 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={submitting}
            className="eu-press mx-auto flex h-[58px] w-full max-w-xl items-center justify-between rounded-2xl bg-brand px-5 text-[16px] font-semibold text-brand-ink disabled:bg-sand disabled:text-muted"
          >
            {submitting ? (
              <span className="flex w-full items-center justify-center gap-2.5"><Spinner /> Envoi au restaurant…</span>
            ) : (
              <>
                <span>Confirmer la commande</span>
                <span className="eu-num">{formatPrice(summary.total)}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, name, value, onChange, onBlur, error, hint, optional, type = 'text', inputMode, autoComplete, inputRef }: {
  label: string; name: CustomerField; value: string; onChange: (v: string) => void; onBlur: () => void
  error?: string; hint?: string; optional?: boolean; type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete: string
  inputRef: (el: HTMLInputElement | null) => void
}) {
  const id = `field-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[14px] font-medium">
        {label}
        {optional && <span className="text-[12px] font-normal text-muted">facultatif</span>}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`h-[52px] w-full rounded-2xl bg-cream px-4 text-[16px] transition-shadow outline-none placeholder:text-muted/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_var(--eu-ink)] ${error ? 'shadow-[inset_0_0_0_2px_var(--eu-danger)]' : ''}`}
      />
      {error
        ? <p id={`${id}-error`} className="mt-1.5 text-[13px] font-medium text-danger">{error}</p>
        : hint && <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-muted">{hint}</p>}
    </div>
  )
}
