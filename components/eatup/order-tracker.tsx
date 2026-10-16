'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { PublicOrder } from '@/lib/eatup/server/orders'
import { formatPickup, formatParisTime } from '@/lib/eatup/schedule'
import { formatPrice } from '@/lib/eatup/money'
import { brandStyle } from '@/lib/eatup/brand'
import { mapsUrl } from './restaurant-hero'
import { CheckIcon, ChefIcon, ChevronLeftIcon, CopyIcon, PhoneIcon, PinIcon, ReceiptIcon, BagIcon, AlertIcon } from './icons'

// Chaque étape correspond à une valeur réelle de orders.status, modifiée par le restaurant
// depuis son tableau de bord. Rien n'avance tout seul.
const STEPS = [
  { key: 'pending', label: 'Transmise', desc: 'Le restaurant a reçu votre commande.' },
  { key: 'preparing', label: 'En préparation', desc: 'Votre commande est en cuisine.' },
  { key: 'ready', label: 'Prête', desc: 'Elle vous attend au comptoir.' },
  { key: 'completed', label: 'Récupérée', desc: 'Bon appétit !' },
] as const

const HEADLINES: Record<string, { title: string; text: string }> = {
  pending: { title: 'Commande transmise', text: 'Le restaurant va lancer la préparation. Cette page se met à jour toute seule.' },
  preparing: { title: 'En préparation', text: 'Votre commande est en cuisine. On vous prévient ici dès qu’elle est prête.' },
  ready: { title: 'Prête à récupérer !', text: 'Présentez votre numéro au comptoir.' },
  completed: { title: 'Commande récupérée', text: 'Merci et bon appétit !' },
  cancelled: { title: 'Commande annulée', text: 'Le restaurant a annulé cette commande. Contactez-le pour en savoir plus.' },
}

const POLL_MS = 20_000

type Props = { initial: PublicOrder; serverNow: string }

export function OrderTracker({ initial, serverNow }: Props) {
  const searchParams = useSearchParams()
  const [data, setData] = useState(initial)
  const [checkedAt, setCheckedAt] = useState(() => new Date(serverNow))
  const [now, setNow] = useState(() => new Date(serverNow))
  const [celebrate] = useState(() => searchParams.get('nouvelle') === '1')
  const [firstName, setFirstName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [statusPulse, setStatusPulse] = useState(0)
  const [offline, setOffline] = useState(false)
  const { order, items, restaurant } = data
  const status = order.status
  const final = status === 'completed' || status === 'cancelled'
  const previousStatus = useRef(status)

  // Le paramètre ?nouvelle=1 ne sert qu'à l'animation d'arrivée : retiré de l'URL (pas de replay au rechargement).
  useEffect(() => {
    if (searchParams.get('nouvelle') === '1') window.history.replaceState(null, '', window.location.pathname)
  }, [searchParams])

  useEffect(() => {
    const read = () => {
      try { setFirstName(window.sessionStorage.getItem(`eatup_order_name_${order.order_number}`)) } catch { /* indisponible */ }
    }
    const raf = requestAnimationFrame(read)
    return () => cancelAnimationFrame(raf)
  }, [order.order_number])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.order_number)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const next = (await res.json()) as PublicOrder
      setData(next)
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setCheckedAt(new Date())
      setNow(new Date())
    }
  }, [order.order_number])

  // Temps réel (Supabase) + interrogation de secours tant que la commande n'est pas terminée.
  useEffect(() => {
    if (final) return
    const supabase = createClient()
    const channel = supabase
      .channel(`suivi-${order.order_number}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_number=eq.${order.order_number}` }, () => { void refresh() })
      .subscribe()
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [final, order.order_number, refresh])

  // Changement de statut réel : mise en avant visuelle et titre d'onglet explicite.
  useEffect(() => {
    if (previousStatus.current === status) return
    previousStatus.current = status
    const raf = requestAnimationFrame(() => setStatusPulse(n => n + 1))
    return () => cancelAnimationFrame(raf)
  }, [status])
  useEffect(() => {
    const head = HEADLINES[status]?.title || 'Suivi de commande'
    document.title = `${status === 'ready' ? '✅ ' : ''}${head} · ${restaurant.name}`
  }, [status, restaurant.name])

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(order.order_number)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* presse-papiers indisponible */ }
  }

  const stepIndex = Math.max(0, STEPS.findIndex(s => s.key === status))
  const headline = HEADLINES[status] || HEADLINES.pending
  const paymentLabel = order.payment_method === 'cash'
    ? `À régler sur place : ${formatPrice(order.total_price)}`
    : order.payment_status === 'paid' ? 'Payé en ligne' : 'Paiement en ligne en cours de confirmation'
  const style = useMemo(() => brandStyle(restaurant.accent_color), [restaurant.accent_color])

  return (
    <div className="eu-app pb-16" style={style}>
      <header className="mx-auto flex max-w-xl items-center gap-3 px-3 pt-3">
        {restaurant.slug && (
          <Link href={`/restaurant/${restaurant.slug}`} className="eu-press grid size-11 place-items-center rounded-full hover:bg-white" aria-label="Retour à la carte">
            <ChevronLeftIcon size={22} />
          </Link>
        )}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink">
            {restaurant.logo_url
              // eslint-disable-next-line @next/next/no-img-element -- logo de petite taille, fond noir conservé
              ? <img src={restaurant.logo_url} alt="" className="size-full object-contain p-0.5 mix-blend-screen" />
              : <span className="font-display text-[15px] font-bold text-cream">{restaurant.name.charAt(0)}</span>}
          </span>
          <p className="truncate text-[15px] font-semibold">{restaurant.name}</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-4">
        {/* ── Écran signature ── */}
        <section
          key={statusPulse}
          className={`relative overflow-hidden rounded-[30px] bg-ink px-6 pt-9 pb-7 text-center text-cream shadow-[var(--eu-shadow-float)] ${statusPulse ? 'eu-bump' : ''}`}
          aria-live="polite"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 size-[360px] -translate-x-1/2 rounded-full bg-brand/30 blur-[80px]" aria-hidden="true" />
          <StatusEmblem status={status} celebrate={celebrate && !statusPulse} />
          <h1 className="relative mt-6 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance">
            {celebrate && status === 'pending' && !statusPulse ? (firstName ? `Merci ${firstName} !` : 'Commande envoyée !') : headline.title}
          </h1>
          <p className="relative mx-auto mt-2 max-w-[320px] text-[15px] leading-relaxed text-cream/85">
            {celebrate && status === 'pending' && !statusPulse ? 'Votre commande est enregistrée et transmise au restaurant.' : headline.text}
          </p>

          <div className="relative mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/8 py-2 pr-2 pl-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            <span className="text-left">
              <span className="block text-[11px] font-semibold tracking-[0.12em] text-cream/80 uppercase">N° de commande</span>
              <span className="eu-num block font-mono text-[22px] font-bold tracking-[0.06em]">{order.order_number}</span>
            </span>
            <button type="button" onClick={copyNumber} className="eu-press grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/15" aria-label="Copier le numéro de commande">
              {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            </button>
          </div>
        </section>

        {/* ── Progression réelle ── */}
        {status !== 'cancelled' ? (
          <section className="rounded-[24px] bg-white p-5 shadow-[var(--eu-shadow-card)]" aria-labelledby="progress-title">
            <div className="flex items-center justify-between">
              <h2 id="progress-title" className="text-[17px] font-semibold">Suivi</h2>
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                {!final && !offline && (
                  <span className="relative grid size-2 place-items-center">
                    <span className="absolute size-2 rounded-full bg-success" style={{ animation: 'eu-live 1.8s ease-out infinite' }} />
                    <span className="relative size-2 rounded-full bg-success" />
                  </span>
                )}
                {offline ? 'Hors connexion · nouvel essai automatique' : final ? 'Terminé' : `En direct · vérifié à ${formatParisTime(checkedAt)}`}
              </span>
            </div>
            <ol className="mt-5 flex flex-col">
              {STEPS.map((step, i) => {
                const done = i < stepIndex || (i === stepIndex && step.key === 'completed')
                const current = i === stepIndex && step.key !== 'completed'
                return (
                  <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span className="absolute top-8 bottom-0 left-[15px] w-[2px] overflow-hidden rounded-full bg-sand" aria-hidden="true">
                        <span className="block w-full origin-top bg-brand transition-transform duration-700 ease-out" style={{ height: '100%', transform: `scaleY(${i < stepIndex ? 1 : 0})` }} />
                      </span>
                    )}
                    <span
                      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-500 ${done ? 'bg-brand text-brand-ink' : current ? 'bg-ink text-cream' : 'bg-sand text-muted'}`}
                    >
                      {current && <span className="absolute inset-0 rounded-full bg-ink" style={{ animation: 'eu-live 2s ease-out infinite' }} aria-hidden="true" />}
                      {done ? <CheckIcon size={16} strokeWidth={2.6} /> : <span className="eu-num relative text-[13px] font-bold">{i + 1}</span>}
                    </span>
                    <span className="pt-1">
                      <span className={`block text-[15px] font-semibold ${!done && !current ? 'text-muted' : ''}`}>{step.label}</span>
                      {(current || done) && <span className="block text-[13.5px] text-muted">{step.desc}</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        ) : (
          <section className="flex gap-3 rounded-[24px] bg-danger/8 p-5 text-danger" role="status">
            <AlertIcon size={20} className="mt-0.5 shrink-0" />
            <p className="text-[15px]">Cette commande a été annulée par le restaurant.{restaurant.phone ? ` Vous pouvez le joindre au ${restaurant.phone}.` : ''}</p>
          </section>
        )}

        {/* ── Retrait ── */}
        <section className="rounded-[24px] bg-white p-5 shadow-[var(--eu-shadow-card)]" aria-labelledby="pickup-title">
          <h2 id="pickup-title" className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">Retrait</h2>
          <p className="mt-1 font-display text-[24px] leading-tight font-bold tracking-[-0.01em]">{formatPickup(order.pickup_time, now)}</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[14.5px]">
            <li className="flex gap-3"><BagIcon size={18} className="mt-0.5 shrink-0 text-brand-text" />Présentez le numéro <strong className="eu-num font-mono">{order.order_number}</strong> au comptoir.</li>
            <li className="flex gap-3"><ReceiptIcon size={18} className="mt-0.5 shrink-0 text-brand-text" />{paymentLabel}</li>
          </ul>
          {(restaurant.address || restaurant.phone) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {restaurant.address && (
                <a href={mapsUrl(restaurant.address)} target="_blank" rel="noopener noreferrer" className="eu-press flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-cream px-3.5 py-2 text-[14px] font-medium">
                  <PinIcon size={18} className="shrink-0 text-brand-text" /><span className="truncate">{restaurant.address}</span>
                </a>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`} className="eu-press flex min-h-11 items-center gap-2 rounded-2xl bg-cream px-3.5 py-2 text-[14px] font-medium">
                  <PhoneIcon size={18} className="text-brand-text" /> Appeler
                </a>
              )}
            </div>
          )}
        </section>

        {/* ── Détail ── */}
        {items.length > 0 && (
          <section className="rounded-[24px] bg-white p-5 shadow-[var(--eu-shadow-card)]" aria-labelledby="items-title">
            <h2 id="items-title" className="text-[17px] font-semibold">Votre commande</h2>
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {items.map((item, i) => (
                <li key={i} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                  <span className="eu-num w-7 shrink-0 text-[15px] font-semibold text-muted">{item.quantity}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{item.product_name}</span>
                    {item.options && <span className="block text-[13px] text-muted">{item.options}</span>}
                  </span>
                  <span className="eu-num shrink-0 text-[15px]">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">Total</span>
              <span className="eu-num text-[20px] font-bold">{formatPrice(order.total_price)}</span>
            </div>
          </section>
        )}

        {restaurant.slug && (
          <Link href={`/restaurant/${restaurant.slug}`} className="eu-press mx-auto mt-2 flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-cream">
            <ChefIcon size={18} /> Retour à la carte
          </Link>
        )}
        <p className="text-center text-[12.5px] text-muted">
          Un email de confirmation vous a été envoyé · <span className="font-display font-bold text-ink">eat<span className="text-brand-text">up</span></span>
        </p>
      </main>
    </div>
  )
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const distance = 74 + (i % 3) * 18
  return { dx: `${Math.round(Math.cos(angle) * distance)}px`, dy: `${Math.round(Math.sin(angle) * distance)}px`, brand: i % 2 === 0, size: i % 3 === 0 ? 8 : 6 }
})

/** Emblème de statut ; à l'arrivée d'une nouvelle commande, coche dessinée + éclats (une seule fois). */
function StatusEmblem({ status, celebrate }: { status: string; celebrate: boolean }) {
  const icon = status === 'preparing' ? <ChefIcon size={34} />
    : status === 'cancelled' ? <AlertIcon size={34} />
      : status === 'ready' || status === 'completed' ? <BagIcon size={34} />
        : null
  return (
    <div className="relative mx-auto grid size-[92px] place-items-center">
      {celebrate && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-brand" style={{ animation: 'eu-ring 1.1s .15s var(--eu-ease-out) both' }} aria-hidden="true" />
          <span className="absolute inset-0 rounded-full border border-cream/40" style={{ animation: 'eu-ring 1.3s .3s var(--eu-ease-out) both' }} aria-hidden="true" />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`absolute top-1/2 left-1/2 rounded-full ${p.brand ? 'bg-brand' : 'bg-cream'}`}
              style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, '--dx': p.dx, '--dy': p.dy, animation: `eu-particle .9s ${0.25 + (i % 4) * 0.03}s cubic-bezier(0.16, 1, 0.3, 1) both` } as React.CSSProperties}
            />
          ))}
        </>
      )}
      <span
        className={`relative grid size-[92px] place-items-center rounded-full ${status === 'cancelled' ? 'bg-white/10 text-cream' : 'bg-brand text-brand-ink'}`}
        style={celebrate ? { animation: 'eu-pop-in .55s var(--eu-ease-spring) both' } : undefined}
      >
        {status === 'ready' && <span className="absolute inset-0 rounded-full bg-brand" style={{ animation: 'eu-live 1.8s ease-out infinite' }} aria-hidden="true" />}
        {icon ? <span className="relative">{icon}</span> : (
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="relative">
            <path
              d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="22" strokeDashoffset={celebrate ? 22 : 0}
              style={celebrate ? { animation: 'eu-draw .5s .35s var(--eu-ease-out) forwards' } : undefined}
            />
          </svg>
        )}
      </span>
    </div>
  )
}
