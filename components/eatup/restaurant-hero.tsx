'use client'

import { useState } from 'react'
import type { Restaurant } from '@/lib/eatup/types'
import { formatParisTime, type OpenStatus, type PickupDay } from '@/lib/eatup/schedule'
import { CardIcon, CheckIcon, ClockIcon, MegaphoneIcon, PhoneIcon, PinIcon, ShareIcon } from './icons'
import { FoodImage } from './food-image'

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function shortAddress(address: string) {
  return address.split(',').slice(0, 2).join(',').trim() || address
}

type HeroProps = {
  restaurant: Restaurant
  status: OpenStatus
  pickup: PickupDay | null
}

export function RestaurantHero({ restaurant, status, pickup }: HeroProps) {
  const [shared, setShared] = useState(false)

  async function share() {
    const url = window.location.href.split('?')[0]
    try {
      if (navigator.share) await navigator.share({ title: restaurant.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        window.setTimeout(() => setShared(false), 1800)
      }
    } catch { /* partage annulé */ }
  }

  return (
    <header className="relative">
      <div className="relative h-[220px] overflow-hidden bg-ink sm:h-[320px]">
        {restaurant.cover_image_url
          ? <FoodImage src={restaurant.cover_image_url} alt="" sizes="100vw" preload className="scale-[1.02]" />
          : <BrandBackdrop name={restaurant.name} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/0 to-ink/25" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-3xl items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <span className="rounded-full bg-ink/55 px-3 py-1.5 font-display text-[13px] font-bold tracking-tight text-cream backdrop-blur-md">
            eat<span className="text-[var(--eu-orange)]">up</span>
          </span>
          <button
            type="button"
            onClick={share}
            className="eu-press flex h-10 items-center gap-1.5 rounded-full bg-white/90 px-3.5 text-[14px] font-semibold text-ink shadow-sm backdrop-blur-md"
          >
            {shared ? <CheckIcon size={17} /> : <ShareIcon size={17} />}
            {shared ? 'Lien copié' : 'Partager'}
          </button>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl px-4">
        <div className="eu-reveal -mt-16 rounded-[30px] bg-white p-5 shadow-[var(--eu-shadow-float)] sm:p-7">
          <div className="flex items-start gap-4">
            <div className="-mt-12 grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-[24px] bg-ink ring-[5px] ring-white sm:-mt-14 sm:size-[104px]">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo de petite taille, fond noir conservé (blend screen)
                <img src={restaurant.logo_url} alt={`Logo ${restaurant.name}`} className="size-full object-contain p-1.5 mix-blend-screen" />
              ) : (
                <span className="font-display text-[34px] font-extrabold text-cream">{restaurant.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 pt-1">
              <StatusPill status={status} />
            </div>
          </div>

          <h1 className="mt-3 font-display text-[30px] leading-[1.02] font-extrabold tracking-[-0.025em] text-balance sm:text-[40px]">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="mt-2 text-[15px] leading-relaxed text-muted text-pretty">{restaurant.description}</p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-2.5">
            <InfoTile icon={<ClockIcon size={16} />} label="Retrait">
              {pickup ? (
                <>
                  <span className="eu-num">dès {formatParisTime(pickup.slots[0])}</span>
                  <span className="block text-[13px] font-normal text-muted">{pickup.dayLabel}</span>
                </>
              ) : (
                <>
                  <span>Indisponible</span>
                  <span className="block text-[13px] font-normal text-muted">aucun créneau</span>
                </>
              )}
            </InfoTile>
            <InfoTile icon={<CardIcon size={16} />} label="Paiement">
              <span>Sur place</span>
              <span className="block text-[13px] font-normal text-muted">au retrait</span>
            </InfoTile>
          </dl>

          {(restaurant.address || restaurant.phone) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {restaurant.address && (
                <a
                  href={mapsUrl(restaurant.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eu-press flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-cream px-3.5 py-2 text-[14px] font-medium"
                >
                  <PinIcon size={18} className="shrink-0 text-brand-text" />
                  <span className="truncate">{shortAddress(restaurant.address)}</span>
                </a>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
                  className="eu-press flex min-h-11 items-center gap-2 rounded-2xl bg-cream px-3.5 py-2 text-[14px] font-medium"
                  aria-label={`Appeler le restaurant au ${restaurant.phone}`}
                >
                  <PhoneIcon size={18} className="text-brand-text" />
                  Appeler
                </a>
              )}
            </div>
          )}
        </div>

        {restaurant.daily_message && (
          <aside className="eu-reveal mt-3 flex gap-3 rounded-[22px] bg-ink p-4 text-cream" style={{ '--i': 1 } as React.CSSProperties}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
              <MegaphoneIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-cream/60 uppercase">Message du jour</p>
              <p className="mt-0.5 text-[15px] leading-snug">{restaurant.daily_message}</p>
            </div>
          </aside>
        )}
      </div>
    </header>
  )
}

function StatusPill({ status }: { status: OpenStatus }) {
  if (status.isOpen) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-[13px] font-semibold text-success">
        <span className="relative grid size-2 place-items-center">
          <span className="absolute inline-flex size-2 rounded-full bg-success" style={{ animation: 'eu-live 1.8s ease-out infinite' }} />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        Ouvert{status.closesAt ? ` · jusqu’à ${status.closesAt}` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-start gap-2 rounded-2xl bg-sand/70 px-3 py-2 text-ink">
      <span className="mt-[5px] size-2 shrink-0 rounded-full bg-ink/40" />
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold">Fermé pour le moment</span>
        <span className="block text-[12.5px] text-muted">
          {status.nextOpening ? `Ouvre ${status.nextOpening.label.charAt(0).toLowerCase()}${status.nextOpening.label.slice(1)}` : 'Horaires non communiqués'}
        </span>
      </span>
    </span>
  )
}

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cream p-3.5">
      <dt className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        <span className="text-brand-text" aria-hidden="true">{icon}</span>{label}
      </dt>
      <dd className="mt-1.5 text-[15px] leading-tight font-semibold">{children}</dd>
    </div>
  )
}

/** Écran de marque quand le restaurant n'a pas (encore) de photo de couverture. */
function BrandBackdrop({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden="true">
      <div className="absolute -top-1/3 -right-1/4 size-[520px] rounded-full bg-brand/35 blur-[90px]" />
      <div className="absolute -bottom-1/2 -left-1/4 size-[420px] rounded-full bg-brand/20 blur-[80px]" />
      <p className="absolute -bottom-6 left-4 font-display text-[110px] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-cream/[0.06] sm:text-[160px]">
        {name}
      </p>
    </div>
  )
}
