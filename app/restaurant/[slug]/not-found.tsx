import Link from 'next/link'
import { SearchIcon } from '@/components/eatup/icons'

export default function RestaurantNotFound() {
  return (
    <div className="eu-app grid place-items-center px-6 py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full bg-sand/70"><SearchIcon size={32} /></span>
        <h1 className="mt-6 font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">Restaurant introuvable</h1>
        <p className="mt-2 text-[15px] text-muted">Ce lien ne correspond à aucun restaurant. Vérifiez l’adresse transmise par le restaurant.</p>
        <Link href="/" className="eu-press mt-7 flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-semibold text-cream">
          Découvrir EatUp
        </Link>
      </div>
    </div>
  )
}
