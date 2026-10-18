'use client'

import type { Product } from '@/lib/eatup/types'
import type { MenuOffer } from '@/lib/eatup/pricing'
import { formatPrice } from '@/lib/eatup/money'
import { PlusIcon } from './icons'
import { FoodImage } from './food-image'
import { Tag } from './ui'

type ProductCardProps = {
  product: Product
  offer: MenuOffer | null
  available: boolean
  /** true si le produit demande des choix (options ou formule) avant l'ajout. */
  configurable: boolean
  inCart: number
  index: number
  onOpen: (product: Product) => void
  onQuickAdd: (product: Product, source: HTMLElement) => void
}

export function ProductCard({ product, offer, available, configurable, inCart, index, onOpen, onQuickAdd }: ProductCardProps) {
  const image = product.image_url
  return (
    <article
      className={`eu-reveal relative rounded-[22px] bg-white shadow-[var(--eu-shadow-card)] ${available ? '' : 'opacity-75'}`}
      style={{ '--i': Math.min(index, 8) } as React.CSSProperties}
    >
      {available ? (
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="eu-press flex w-full items-stretch gap-4 rounded-[22px] p-3.5 text-left hover:shadow-[inset_0_0_0_1px_var(--eu-line)]"
        >
          <CardText product={product} offer={offer} inCart={inCart} hasImage={Boolean(image)} />
          {image && <CardImage src={image} alt="" />}
        </button>
      ) : (
        <div className="flex w-full items-stretch gap-4 p-3.5">
          <CardText product={product} offer={null} inCart={0} hasImage={Boolean(image)} soldOut />
          {image && <CardImage src={image} alt="" />}
        </div>
      )}

      {available && (
        <button
          type="button"
          onClick={e => onQuickAdd(product, e.currentTarget)}
          className={`eu-press absolute grid size-11 place-items-center rounded-full bg-brand text-brand-ink shadow-[0_6px_16px_-6px_rgba(23,23,23,0.45)] ring-4 ring-white ${image ? 'right-2 bottom-2' : 'right-3.5 bottom-3.5'}`}
          aria-label={configurable ? `Personnaliser ${product.name}` : `Ajouter ${product.name} au panier`}
        >
          <PlusIcon size={22} strokeWidth={2.2} />
          {inCart > 0 && (
            <span key={inCart} className="eu-badge-pop eu-num absolute -top-1.5 -left-1.5 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] leading-5 font-bold text-cream">
              {inCart}
            </span>
          )}
        </button>
      )}
    </article>
  )
}

function CardText({ product, offer, inCart, hasImage, soldOut }: { product: Product; offer: MenuOffer | null; inCart: number; hasImage: boolean; soldOut?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col py-0.5 ${hasImage ? '' : 'pr-14'}`}>
      <h3 className="text-[16px] leading-snug font-semibold text-ink">{product.name}</h3>
      {product.description && (
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-muted">{product.description}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-2.5">
        <span className={`eu-num text-[16px] font-semibold ${soldOut ? 'text-muted line-through' : ''}`}>{formatPrice(product.price)}</span>
        {soldOut && <Tag tone="danger">Victime de son succès</Tag>}
        {offer?.available && <Tag>Formule {formatPrice(offer.price)}</Tag>}
        {inCart > 0 && <span className="sr-only">, {inCart} dans le panier</span>}
      </div>
    </div>
  )
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative size-[112px] shrink-0 self-center overflow-hidden rounded-[18px] bg-sand sm:size-[124px]">
      <FoodImage src={src} alt={alt} sizes="124px" />
    </div>
  )
}
