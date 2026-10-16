'use client'

import { RefreshIcon } from '@/components/eatup/icons'

export default function OrderError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="eu-app grid place-items-center px-6 py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">Suivi momentanément indisponible</h1>
        <p className="mt-2 text-[15px] text-muted">Votre commande n’est pas affectée : elle reste enregistrée auprès du restaurant. Réessayez dans un instant.</p>
        <button type="button" onClick={() => unstable_retry()} className="eu-press mt-7 flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-cream">
          <RefreshIcon size={18} /> Réessayer
        </button>
      </div>
    </div>
  )
}
