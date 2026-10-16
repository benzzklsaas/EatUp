'use client'

import { RefreshIcon } from '@/components/eatup/icons'

export default function RestaurantError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="eu-app grid place-items-center px-6 py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="relative grid size-20 place-items-center rounded-full bg-sand/70 text-3xl" aria-hidden="true">
          🍳
          <span className="absolute top-2 right-2 size-3.5 rounded-full bg-brand ring-4 ring-cream" />
        </div>
        <h1 className="mt-6 font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">Le menu n’a pas pu être chargé</h1>
        <p className="mt-2 text-[15px] text-muted">
          La connexion semble instable. Votre panier est conservé sur cet appareil : réessayez dans un instant.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="eu-press mt-7 flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-cream"
        >
          <RefreshIcon size={18} /> Réessayer
        </button>
      </div>
    </div>
  )
}
