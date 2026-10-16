'use client'

import { MinusIcon, PlusIcon, TrashIcon } from './icons'

type StepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  /** Remplace « − » par une corbeille quand la prochaine pression supprime l'article. */
  removable?: boolean
  size?: 'md' | 'sm'
}

export function Stepper({ value, onChange, min = 1, max = 50, label, removable, size = 'md' }: StepperProps) {
  const dim = size === 'sm' ? 'size-9' : 'size-11'
  const canDecrease = removable ? value > 0 : value > min
  const showTrash = removable && value <= 1
  return (
    <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--eu-line)]" role="group" aria-label={label}>
      <button
        type="button"
        className={`eu-press grid ${dim} place-items-center rounded-full text-ink hover:bg-cream disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={showTrash ? 'Retirer du panier' : 'Diminuer la quantité'}
      >
        {showTrash ? <TrashIcon size={18} /> : <MinusIcon size={18} />}
      </button>
      <span className="eu-num min-w-8 text-center text-[16px] font-semibold" aria-live="polite">{value}</span>
      <button
        type="button"
        className={`eu-press grid ${dim} place-items-center rounded-full bg-ink text-cream disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Augmenter la quantité"
      >
        <PlusIcon size={18} />
      </button>
    </div>
  )
}

export function Tag({ children, tone = 'sand' }: { children: React.ReactNode; tone?: 'sand' | 'brand' | 'ink' | 'danger' }) {
  const tones = {
    sand: 'bg-sand/70 text-ink',
    brand: 'bg-brand/15 text-brand-text',
    ink: 'bg-ink text-cream',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  )
}
