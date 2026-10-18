'use client'

import type { OptionGroup, Product } from '@/lib/eatup/types'
import type { CartRow, CartSummary } from '@/lib/eatup/cart'
import { issueMessage } from '@/lib/eatup/pricing'
import { formatPrice } from '@/lib/eatup/money'
import { AlertIcon, BagIcon, ChevronRightIcon, CloseIcon, EditIcon, InfoIcon, PlusIcon } from './icons'
import { FoodImage } from './food-image'
import { Sheet } from './sheet'
import { Stepper } from './ui'

type CartSheetProps = {
  open: boolean
  onClose: () => void
  summary: CartSummary
  groupsByProduct: Record<string, OptionGroup[]>
  restaurantName: string
  pickupLabel: string | null
  onQuantity: (key: string, quantity: number) => void
  onEdit: (row: CartRow) => void
  onCheckout: () => void
  /** Boissons disponibles proposées quand le panier n'en contient aucune (ni formule). */
  suggestions: Product[]
  onSuggestion: (product: Product, source: HTMLElement) => void
}

export function CartSheet({ open, onClose, summary, groupsByProduct, restaurantName, pickupLabel, onQuantity, onEdit, onCheckout, suggestions, onSuggestion }: CartSheetProps) {
  const titleId = 'eu-cart-title'
  const empty = summary.rows.length === 0
  const canCheckout = !empty && !summary.blocked && Boolean(pickupLabel)

  const footer = empty ? undefined : (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[15px] text-muted">Total · {summary.count} article{summary.count > 1 ? 's' : ''}</span>
        <span className="eu-num text-[22px] font-bold tracking-tight">{formatPrice(summary.total)}</span>
      </div>
      {summary.blocked && (
        <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-danger" role="alert">
          <AlertIcon size={16} /> Corrigez les articles signalés pour continuer.
        </p>
      )}
      {!pickupLabel && (
        <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-warning">
          <InfoIcon size={16} /> Aucun créneau de retrait disponible pour le moment.
        </p>
      )}
      <button
        type="button"
        onClick={onCheckout}
        disabled={!canCheckout}
        className="eu-press flex h-[56px] w-full items-center justify-between rounded-2xl bg-brand px-5 text-[16px] font-semibold text-brand-ink disabled:bg-sand disabled:text-muted"
      >
        <span>Commander</span>
        <span className="flex items-center gap-1">
          <span className="eu-num">{formatPrice(summary.total)}</span>
          <ChevronRightIcon size={18} />
        </span>
      </button>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId} footer={footer}>
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">Votre panier</h2>
            <p className="mt-0.5 text-[14px] text-muted">
              {restaurantName}{pickupLabel ? ` · retrait dès ${pickupLabel}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="eu-press grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--eu-line)]" aria-label="Fermer le panier">
            <CloseIcon size={20} />
          </button>
        </div>

        {empty ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="relative grid size-24 place-items-center rounded-full bg-sand/70">
              <BagIcon size={40} strokeWidth={1.5} />
              <span className="absolute top-3 right-3 size-4 rounded-full bg-brand ring-4 ring-cream" />
            </div>
            <p className="mt-5 font-display text-[21px] font-bold">Votre panier est vide</p>
            <p className="mt-1.5 max-w-[260px] text-[15px] text-muted">Parcourez la carte et ajoutez vos envies, on s’occupe du reste.</p>
            <button type="button" onClick={onClose} className="eu-press mt-6 h-12 rounded-full bg-ink px-6 text-[15px] font-semibold text-cream">
              Voir la carte
            </button>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2.5">
            {summary.rows.map(row => (
              <CartRowItem
                key={row.line.key}
                row={row}
                groups={groupsByProduct[row.line.productId] || []}
                onQuantity={q => onQuantity(row.line.key, q)}
                onEdit={() => onEdit(row)}
              />
            ))}
          </ul>
        )}

        {!empty && suggestions.length > 0 && (
          <section className="mt-5" aria-labelledby="eu-suggest-title">
            <h3 id="eu-suggest-title" className="text-[15px] font-semibold">Une boisson avec ça ?</h3>
            <div className="eu-no-scrollbar -mx-5 mt-2.5 flex gap-2.5 overflow-x-auto px-5 pb-1">
              {suggestions.map(drink => (
                <button
                  key={drink.id}
                  type="button"
                  onClick={e => onSuggestion(drink, e.currentTarget)}
                  className="eu-press flex w-[132px] shrink-0 flex-col overflow-hidden rounded-[18px] bg-white text-left shadow-[var(--eu-shadow-card)]"
                  aria-label={`Ajouter ${drink.name}, ${formatPrice(drink.price)}`}
                >
                  <span className="relative block h-[84px] w-full bg-sand">
                    {drink.image_url && <FoodImage src={drink.image_url} alt="" sizes="132px" />}
                    <span className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-brand text-brand-ink ring-2 ring-white"><PlusIcon size={17} strokeWidth={2.2} /></span>
                  </span>
                  <span className="block px-3 pt-2 pb-2.5">
                    <span className="line-clamp-2 text-[14px] leading-snug font-medium">{drink.name}</span>
                    <span className="eu-num block text-[13px] text-muted">{formatPrice(drink.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {!empty && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 text-[13px] leading-snug text-muted">
            <InfoIcon size={16} className="mt-px shrink-0" />
            Paiement sur place, directement au restaurant, au moment du retrait.
          </p>
        )}
      </div>
    </Sheet>
  )
}

function CartRowItem({ row, groups, onQuantity, onEdit }: { row: CartRow; groups: OptionGroup[]; onQuantity: (q: number) => void; onEdit: () => void }) {
  const { line, priced, product } = row
  // Produit retiré de la carte ou passé « indisponible » : seule action possible, le retirer.
  const gone = row.status === 'missing' || Boolean(priced?.issues.some(i => i.kind === 'product-unavailable'))
  const configurable = !gone && Boolean(product && (groups.length > 0 || priced?.menu))
  const options = priced?.chosen.flatMap(c => c.items.map(i => i.name)) || []
  const menuParts = priced && line.selection.menu ? [priced.side?.name, priced.drink?.name].filter(Boolean) : []
  const image = product?.image_url || line.snapshot.imageUrl

  return (
    <li className="rounded-[20px] bg-white p-3 shadow-[var(--eu-shadow-card)]" style={{ animation: 'eu-fade-up .35s var(--eu-ease-out) both' }}>
      <div className="flex gap-3">
        {image && (
          <div className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-sand">
            <FoodImage src={image} alt="" sizes="60px" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-snug font-semibold">{product?.name || line.snapshot.name}</p>
            {row.status !== 'missing' && (
              <p className={`eu-num shrink-0 text-[15px] font-semibold ${row.status === 'ok' ? '' : 'text-muted line-through'}`}>{formatPrice(row.lineTotal)}</p>
            )}
          </div>
          {line.selection.menu && menuParts.length > 0 && (
            <p className="mt-0.5 text-[13px] text-muted">Formule · {menuParts.join(' · ')}</p>
          )}
          {options.length > 0 && <p className="mt-0.5 text-[13px] text-muted">{options.join(' · ')}</p>}
          {row.status === 'invalid' && priced && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-danger">
              <AlertIcon size={15} className="mt-px shrink-0" />{issueMessage(priced.issues[0], groups)}
            </p>
          )}
          {row.status === 'missing' && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-danger">
              <AlertIcon size={15} className="mt-px shrink-0" />Ce produit n’est plus proposé.
            </p>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {configurable ? (
          <button type="button" onClick={onEdit} className="eu-press flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink hover:bg-cream">
            <EditIcon size={16} /> Modifier
          </button>
        ) : <span />}
        {gone
          ? <button type="button" onClick={() => onQuantity(0)} className="eu-press h-9 rounded-full bg-cream px-4 text-[14px] font-semibold">Retirer</button>
          : <Stepper size="sm" value={line.quantity} onChange={onQuantity} label={`Quantité de ${product?.name || line.snapshot.name}`} removable min={0} />}
      </div>
    </li>
  )
}
