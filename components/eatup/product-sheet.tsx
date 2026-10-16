'use client'

import { useMemo, useRef, useState } from 'react'
import type { OptionGroup, Product, Selection } from '@/lib/eatup/types'
import {
  emptySelection, getMenuOffer, issueMessage, priceSelection, toggleOption,
  drinkSupplement, sidePrice, type SelectionIssue,
} from '@/lib/eatup/pricing'
import { formatExtra, formatPrice, round2 } from '@/lib/eatup/money'
import { MAX_LINE_QUANTITY } from '@/lib/eatup/cart'
import { CheckIcon, CloseIcon } from './icons'
import { FoodImage } from './food-image'
import { Sheet } from './sheet'
import { Stepper, Tag } from './ui'

export type SheetRequest = {
  /** Change à chaque ouverture : réinitialise l'état interne de la fiche. */
  session: number
  product: Product
  edit?: { lineKey: string; selection: Selection; quantity: number }
}

type ProductSheetProps = {
  request: SheetRequest | null
  open: boolean
  groupsByProduct: Record<string, OptionGroup[]>
  products: Product[]
  onClose: () => void
  onConfirm: (product: Product, selection: Selection, quantity: number, editKey?: string) => void
}

export function ProductSheet({ request, open, groupsByProduct, products, onClose, onConfirm }: ProductSheetProps) {
  const titleId = 'eu-product-title'
  if (!request) return null
  return (
    <ProductSheetBody
      key={request.session}
      request={request}
      open={open}
      groups={groupsByProduct[request.product.id] || []}
      products={products}
      onClose={onClose}
      onConfirm={onConfirm}
      titleId={titleId}
    />
  )
}

function ProductSheetBody({
  request, open, groups, products, onClose, onConfirm, titleId,
}: Omit<ProductSheetProps, 'request' | 'groupsByProduct'> & { request: SheetRequest; groups: OptionGroup[]; titleId: string }) {
  const { product, edit } = request
  const offer = useMemo(() => getMenuOffer(product, products), [product, products])
  const [selection, setSelection] = useState<Selection>(() => edit?.selection ?? { ...emptySelection(), menu: Boolean(offer?.available) })
  const [quantity, setQuantity] = useState(edit?.quantity ?? 1)
  const [attempted, setAttempted] = useState(false)
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null)
  const [done, setDone] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const priced = priceSelection(product, groups, selection, products)
  const total = round2(priced.unitPrice * quantity)

  const issueFor = (sectionId: string): SelectionIssue | undefined => priced.issues.find(i =>
    ('groupId' in i && i.groupId === sectionId)
    || (sectionId === 'menu-drink' && i.kind === 'menu-drink')
    || (sectionId === 'menu-side' && i.kind === 'menu-side'))
  const errorFor = (sectionId: string) => {
    if (!attempted) return null
    const issue = issueFor(sectionId)
    return issue ? issueMessage(issue, groups) : null
  }

  function submit() {
    if (done) return
    if (!priced.ok) {
      setAttempted(true)
      const first = priced.issues[0]
      const target = first.kind === 'menu-drink' ? 'menu-drink'
        : first.kind === 'menu-side' ? 'menu-side'
          : 'groupId' in first && first.groupId ? first.groupId : null
      if (target) {
        setShake(s => ({ id: target, n: (s?.n || 0) + 1 }))
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        sectionRefs.current[target]?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
      }
      return
    }
    setDone(true)
    onConfirm(product, selection, quantity, edit?.lineKey)
    window.setTimeout(onClose, 420)
  }

  const remaining = priced.issues.filter(i => i.kind === 'group-min' || i.kind === 'menu-drink' || i.kind === 'menu-side').length
  const blocking = priced.issues.find(i => i.kind === 'product-unavailable' || i.kind === 'menu-unavailable' || i.kind === 'option-unavailable' || i.kind === 'option-unknown')

  const media = product.image_url ? (
    <div className="relative aspect-[4/3] max-h-[44vh] w-full overflow-hidden bg-sand sm:aspect-[16/10]">
      <FoodImage src={product.image_url} alt={product.name} sizes="(min-width: 640px) 540px, 100vw" preload />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/30 to-transparent" />
    </div>
  ) : null

  const footer = (
    <div>
      {attempted && !priced.ok && (
        <p id="eu-sheet-hint" className="mb-2 text-center text-[13px] font-medium text-danger" role="alert">
          {blocking ? issueMessage(blocking, groups) : remaining > 1 ? `Il reste ${remaining} choix obligatoires.` : 'Il reste un choix obligatoire.'}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Stepper value={quantity} onChange={v => setQuantity(Math.max(1, Math.min(MAX_LINE_QUANTITY, v)))} label="Quantité" max={MAX_LINE_QUANTITY} />
        <button
          type="button"
          onClick={submit}
          aria-describedby={attempted && !priced.ok ? 'eu-sheet-hint' : undefined}
          className={`eu-press relative flex h-[54px] min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden rounded-2xl px-5 text-[16px] font-semibold ${done ? 'bg-ink text-cream' : 'bg-brand text-brand-ink'} ${!priced.ok && !done ? 'opacity-90' : ''}`}
        >
          {done ? (
            <span className="flex w-full items-center justify-center gap-2" style={{ animation: 'eu-fade-in .2s ease both' }}>
              <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink" style={{ animation: 'eu-pop-in .35s var(--eu-ease-spring) both' }}>
                <CheckIcon size={16} strokeWidth={2.6} />
              </span>
              {edit ? 'Mis à jour' : 'Ajouté au panier'}
            </span>
          ) : (
            <>
              <span className="truncate">{edit ? 'Mettre à jour' : 'Ajouter'}</span>
              <span className="eu-num shrink-0">{formatPrice(total)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId} media={media} footer={footer}>
      <button
        type="button"
        onClick={onClose}
        className={`eu-press absolute top-3 right-3 z-30 grid size-10 place-items-center rounded-full ${media ? 'bg-white/95 text-ink shadow-md' : 'bg-white text-ink shadow-[inset_0_0_0_1px_var(--eu-line)]'}`}
        aria-label="Fermer"
      >
        <CloseIcon size={20} />
      </button>

      <div className={`px-5 pb-6 ${media ? 'pt-5' : 'pt-8'}`}>
        <h2 id={titleId} className="pr-12 font-display text-[26px] leading-[1.1] font-bold tracking-[-0.02em]">{product.name}</h2>
        {product.description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{product.description}</p>}
        <p className="eu-num mt-3 text-[17px] font-semibold">{formatPrice(product.price)}</p>

        {offer && (
          <fieldset className="mt-6">
            <legend className="mb-3 text-[17px] font-semibold">Seul ou en formule ?</legend>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
              <FormulaTile
                selected={!selection.menu}
                onSelect={() => setSelection(s => ({ ...s, menu: false }))}
                title="Plat seul"
                price={formatPrice(product.price)}
              />
              <FormulaTile
                selected={selection.menu}
                disabled={!offer.available}
                onSelect={() => setSelection(s => ({ ...s, menu: true }))}
                title="En formule"
                badge={offer.available ? 'Recommandé' : undefined}
                subtitle={offer.available ? offer.label : 'Indisponible : plus de boissons'}
                price={formatExtra(offer.extra)}
              />
            </div>
          </fieldset>
        )}

        {groups.map(group => {
          const chosen = selection.options[group.id] || []
          const single = group.max_choices === 1
          return (
            <ChoiceSection
              key={group.id}
              id={group.id}
              refCallback={el => { sectionRefs.current[group.id] = el }}
              title={group.name}
              required={group.min_choices > 0}
              rule={single ? '1 choix' : group.min_choices > 1 ? `${group.min_choices} à ${group.max_choices} choix` : `Jusqu’à ${group.max_choices} choix`}
              counter={!single ? `${chosen.length}/${group.max_choices}` : undefined}
              error={errorFor(group.id)}
              shakeKey={shake?.id === group.id ? shake.n : 0}
            >
              {group.items.map(item => {
                const unavailable = item.is_available === false
                return (
                  <ChoiceRow
                    key={item.id}
                    type={single ? 'radio' : 'checkbox'}
                    selected={chosen.includes(item.id)}
                    disabled={unavailable}
                    label={item.name}
                    price={item.extra_price > 0 ? formatExtra(item.extra_price) : undefined}
                    note={unavailable ? 'Indisponible' : undefined}
                    onToggle={() => setSelection(s => toggleOption(s, group, item))}
                  />
                )
              })}
            </ChoiceSection>
          )
        })}

        {selection.menu && offer?.available && offer.requiresSide && (
          <ChoiceSection
            id="menu-side"
            refCallback={el => { sectionRefs.current['menu-side'] = el }}
            title="Votre accompagnement"
            required
            rule="1 choix"
            error={errorFor('menu-side')}
            shakeKey={shake?.id === 'menu-side' ? shake.n : 0}
          >
            {offer.sides.map(side => (
              <ChoiceRow
                key={side.id}
                type="radio"
                selected={selection.sideId === side.id}
                label={side.name}
                price={sidePrice(side) > 0 ? formatExtra(sidePrice(side)) : 'Inclus'}
                onToggle={() => setSelection(s => ({ ...s, sideId: side.id }))}
              />
            ))}
          </ChoiceSection>
        )}

        {selection.menu && offer?.available && (
          <ChoiceSection
            id="menu-drink"
            refCallback={el => { sectionRefs.current['menu-drink'] = el }}
            title="Votre boisson"
            required
            rule="1 choix"
            error={errorFor('menu-drink')}
            shakeKey={shake?.id === 'menu-drink' ? shake.n : 0}
          >
            {offer.drinks.map(drink => (
              <ChoiceRow
                key={drink.id}
                type="radio"
                selected={selection.drinkId === drink.id}
                label={drink.name}
                price={drinkSupplement(drink) > 0 ? formatExtra(drinkSupplement(drink)) : 'Incluse'}
                onToggle={() => setSelection(s => ({ ...s, drinkId: drink.id }))}
              />
            ))}
          </ChoiceSection>
        )}

        {priced.unitPrice !== Number(product.price) && (
          <p className="eu-num mt-6 rounded-2xl bg-white px-4 py-3 text-[14px] text-muted shadow-[inset_0_0_0_1px_var(--eu-line)]">
            Prix unitaire avec vos choix : <strong className="font-semibold text-ink">{formatPrice(priced.unitPrice)}</strong>
          </p>
        )}
      </div>
    </Sheet>
  )
}

function FormulaTile({ selected, disabled, onSelect, title, subtitle, price, badge }: {
  selected: boolean; disabled?: boolean; onSelect: () => void; title: string; subtitle?: string | null; price: string; badge?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`eu-press relative flex min-h-[86px] flex-col items-start justify-between rounded-2xl bg-white p-3.5 text-left disabled:opacity-50 ${selected ? 'shadow-[inset_0_0_0_2px_var(--eu-ink)]' : 'shadow-[inset_0_0_0_1px_var(--eu-line)]'}`}
    >
      {badge && <span className="absolute -top-2 right-3"><Tag tone="ink">{badge}</Tag></span>}
      <span className="text-[15px] font-semibold">{title}</span>
      {subtitle && <span className="mt-0.5 text-[12.5px] leading-snug text-muted">{subtitle}</span>}
      <span className={`eu-num mt-2 text-[15px] font-semibold ${selected ? 'text-brand-text' : ''}`}>{price}</span>
    </button>
  )
}

function ChoiceSection({ id, refCallback, title, required, rule, counter, error, shakeKey, children }: {
  id: string; refCallback: (el: HTMLElement | null) => void; title: string; required: boolean; rule: string
  counter?: string; error: string | null; shakeKey: number; children: React.ReactNode
}) {
  return (
    <fieldset ref={refCallback} className="mt-7 scroll-mt-6" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="w-full">
        <span className="flex w-full items-center gap-2">
          <span className="text-[17px] font-semibold">{title}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {counter && <span className="eu-num text-[12px] font-medium text-muted">{counter}</span>}
            <Tag tone={required ? (error ? 'danger' : 'brand') : 'sand'}>{required ? 'Obligatoire' : 'Facultatif'}</Tag>
          </span>
        </span>
      </legend>
      <p className="mt-1 text-[13px] text-muted">{rule}</p>
      {error && <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-danger">{error}</p>}
      <div key={shakeKey} className={`mt-3 flex flex-col gap-2 rounded-2xl ${shakeKey ? 'eu-shake' : ''} ${error ? 'ring-2 ring-danger/70 ring-offset-4 ring-offset-cream' : ''}`}>
        {children}
      </div>
    </fieldset>
  )
}

function ChoiceRow({ type, selected, disabled, label, price, note, onToggle }: {
  type: 'radio' | 'checkbox'; selected: boolean; disabled?: boolean; label: string; price?: string; note?: string; onToggle: () => void
}) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`eu-press flex min-h-[54px] w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'shadow-[inset_0_0_0_2px_var(--eu-ink)]' : 'shadow-[inset_0_0_0_1px_var(--eu-line)]'}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-[22px] shrink-0 place-items-center transition-colors ${type === 'radio' ? 'rounded-full' : 'rounded-[7px]'} ${selected ? 'bg-brand text-brand-ink' : 'bg-white shadow-[inset_0_0_0_1.5px_rgba(23,23,23,0.28)]'}`}
      >
        {selected && (type === 'radio'
          ? <span className="size-2 rounded-full bg-brand-ink" style={{ animation: 'eu-pop-in .25s var(--eu-ease-spring) both' }} />
          : <CheckIcon size={15} strokeWidth={2.6} style={{ animation: 'eu-pop-in .25s var(--eu-ease-spring) both' }} />)}
      </span>
      <span className={`min-w-0 flex-1 text-[15px] ${selected ? 'font-semibold' : ''} ${disabled ? 'line-through' : ''}`}>{label}</span>
      {note && <span className="text-[12px] font-medium text-muted">{note}</span>}
      {price && !note && <span className={`eu-num shrink-0 text-[14px] ${price.startsWith('+') ? 'font-semibold' : 'text-muted'}`}>{price}</span>}
    </button>
  )
}
