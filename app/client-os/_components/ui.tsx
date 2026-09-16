'use client'

/**
 * BK Labs — Client OS · Primitives d'interface
 * --------------------------------------------
 * Les briques partagées par tous les écrans. Volontairement peu nombreuses :
 * une carte, une pastille, une progression, un champ éditable, une case à
 * cocher. Tout le reste se compose à partir de ça.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { avatarToneOf, initialsOf } from '@/lib/client-os/format'

/* ------------------------------------------------------------------ */
/* Icônes                                                              */
/* ------------------------------------------------------------------ */

const PATHS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  clients: 'M3 20c0-3 2.7-5 6-5s6 2 6 5M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M16 11a3 3 0 1 0 0-6M17 20c0-2 .6-3.6-.7-4.7',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  check: 'M4 12.5 9 17.5 20 6.5',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  alert: 'M12 8v5M12 17h.01M10.3 3.9 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3.2 1.9',
  euro: 'M17 5.5A6.5 6.5 0 0 0 7.2 10M17 18.5A6.5 6.5 0 0 1 7.2 14M4 10.5h8M4 13.5h8',
  rocket: 'M12 3c3.5 2 5.5 5.5 5.5 9.5L12 18l-5.5-5.5C6.5 8.5 8.5 5 12 3ZM12 11.5v.01M8.5 16 6 21l5-2.5M15.5 16 18 21l-5-2.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  file: 'M6 3h7l5 5v13H6zM13 3v5h5',
  sparkle: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
  external: 'M14 4h6v6M20 4l-8 8M18 14v6H4V6h6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Conteneurs                                                          */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  pad = true,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { pad?: boolean }) {
  return (
    <div className={`cos-card${pad ? ' cos-card--pad' : ''} ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="cos-section">
      <div className="cos-section-head">
        <div>
          <h2 className="cos-section-title">{title}</h2>
          {hint ? <p className="cos-section-hint">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string
  text?: string
  action?: React.ReactNode
}) {
  return (
    <div className="cos-empty">
      <p className="cos-empty-title">{title}</p>
      {text ? <p className="cos-empty-text">{text}</p> : null}
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Signalétique                                                        */
/* ------------------------------------------------------------------ */

export type Tone = 'neutral' | 'muted' | 'info' | 'progress' | 'success' | 'warn' | 'danger'

export function Pill({
  tone = 'neutral',
  dot = false,
  pulse = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  pulse?: boolean
  children: React.ReactNode
}) {
  return (
    <span className={`cos-pill cos-pill--${tone}`}>
      {dot ? <span className={`cos-dot${pulse ? ' cos-dot--pulse' : ''}`} /> : null}
      {children}
    </span>
  )
}

export function Avatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const suffix = size === 'md' ? '' : ` cos-avatar--${size}`
  return (
    <span className={`cos-avatar cos-avatar--t${avatarToneOf(name)}${suffix}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

export function Progress({
  value,
  tall = false,
  tone,
}: {
  value: number
  tall?: boolean
  tone?: 'success' | 'danger'
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className={`cos-progress${tall ? ' cos-progress--tall' : ''}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`cos-progress-fill${tone ? ` cos-progress-fill--${tone}` : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/** Frise compacte « ●━━●━━○ » : l'avancement se lit sans lire de chiffre. */
export function Rail({ states }: { states: ('done' | 'current' | 'todo')[] }) {
  return (
    <div className="cos-rail" aria-hidden="true">
      {states.map((state, index) => (
        <span key={index} style={{ display: 'contents' }}>
          {index > 0 ? (
            <span className={`cos-rail-link${states[index - 1] === 'done' ? ' cos-rail-link--done' : ''}`} />
          ) : null}
          <span
            className={`cos-rail-node${state === 'done' ? ' cos-rail-node--done' : ''}${
              state === 'current' ? ' cos-rail-node--current' : ''
            }`}
          />
        </span>
      ))}
    </div>
  )
}

export function Stat({
  label,
  value,
  foot,
  small = false,
}: {
  label: string
  value: React.ReactNode
  foot?: React.ReactNode
  small?: boolean
}) {
  return (
    <Card pad={false} className="cos-stat">
      <p className="cos-stat-label">{label}</p>
      <p className={`cos-stat-value${small ? ' cos-stat-value--sm' : ''}`}>{value}</p>
      {foot ? <p className="cos-stat-foot">{foot}</p> : null}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Cases à cocher                                                      */
/* ------------------------------------------------------------------ */

export function Check({
  checked,
  onChange,
  children,
  right,
}: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} className="cos-check" onClick={onChange}>
      <span className="cos-check-box">
        <Icon name="check" size={11} />
      </span>
      <span className="cos-check-label">{children}</span>
      {right}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="cos-field">
      <span className="cos-field-label">{label}</span>
      {children}
      {hint ? (
        <p className="cos-meta" style={{ marginTop: 5 }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Champ éditable en place.
 *
 * Tant qu'on ne clique pas, c'est du texte : la fiche reste lisible. Au clic,
 * le champ prend le relais et enregistre à la sortie — pas de bouton
 * « Enregistrer » à chasser sur 40 champs.
 */
export function EditableText({
  value,
  onChange,
  placeholder = 'Non renseigné',
  multiline = false,
  label,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  multiline?: boolean
  label?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [justSaved, setJustSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  useLayoutEffect(() => {
    if (!editing) return
    const node = inputRef.current
    if (!node) return
    node.focus()
    const end = node.value.length
    node.setSelectionRange(end, end)
    if (node instanceof HTMLTextAreaElement) autosize(node)
  }, [editing])

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), 1600)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  function autosize(node: HTMLTextAreaElement) {
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next === value) return
    onChange(next)
    setJustSaved(true)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function start() {
    setDraft(value)
    setEditing(true)
  }

  if (editing) {
    const shared = {
      value: draft,
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          cancel()
        }
        if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commit()
        }
      },
      placeholder,
      'aria-label': label,
    }

    return multiline ? (
      <textarea
        {...shared}
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        className="cos-textarea"
        rows={3}
        onChange={(event) => {
          setDraft(event.target.value)
          autosize(event.target)
        }}
      />
    ) : (
      <input
        {...shared}
        ref={inputRef as React.Ref<HTMLInputElement>}
        className="cos-input"
        onChange={(event) => setDraft(event.target.value)}
      />
    )
  }

  return (
    <div>
      <button
        type="button"
        className={`cos-editable${value ? '' : ' cos-editable--empty'}`}
        onClick={start}
        onFocus={start}
        aria-label={label ? `${label} — modifier` : 'Modifier'}
      >
        {value || placeholder}
      </button>
      {justSaved ? (
        <span className="cos-saved" style={{ marginLeft: 2 }}>
          <Icon name="check" size={10} /> Enregistré
        </span>
      ) : null}
    </div>
  )
}

/** Sélecteur simple, aligné sur le style des champs. */
export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (next: string) => void
  options: { value: string; label: string }[]
  label?: string
}) {
  return (
    <select
      className="cos-input cos-select"
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Groupe de choix visuel — plus rapide qu'un menu déroulant pour 3 à 8 options. */
export function ChoiceGroup({
  options,
  selected,
  onToggle,
  multiple = false,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  multiple?: boolean
}) {
  return (
    <div className="cos-inline cos-inline-6" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={active}
            className="cos-tag"
            onClick={() => onToggle(option.value)}
            style={
              active
                ? { background: '#111110', color: '#fff', borderColor: '#111110' }
                : undefined
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Liste d'éléments ajoutables / supprimables (livrables, fonctionnalités…). */
export function ItemList({
  items,
  onAdd,
  onRemove,
  placeholder,
  tone = 'default',
}: {
  items: { id: string; label: string }[]
  onAdd: (label: string) => void
  onRemove: (id: string) => void
  placeholder: string
  tone?: 'default' | 'excluded'
}) {
  const [draft, setDraft] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const clean = draft.trim()
    if (!clean) return
    onAdd(clean)
    setDraft('')
  }

  return (
    <div className="cos-stack cos-stack-8">
      {items.length > 0 ? (
        <ul className="cos-stack cos-stack-4">
          {items.map((item) => (
            <li key={item.id} className="cos-inline cos-inline-8">
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  color: tone === 'excluded' ? 'var(--cos-ink-4)' : 'var(--cos-ink)',
                  display: 'inline-flex',
                }}
              >
                <Icon name={tone === 'excluded' ? 'close' : 'check'} size={12} />
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13.5,
                  color: tone === 'excluded' ? 'var(--cos-ink-3)' : 'var(--cos-ink)',
                  textDecoration: tone === 'excluded' ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </span>
              <button
                type="button"
                className="cos-btn cos-btn--ghost cos-btn--icon"
                onClick={() => onRemove(item.id)}
                aria-label={`Supprimer ${item.label}`}
              >
                <Icon name="trash" size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cos-meta">Aucun élément.</p>
      )}

      <form onSubmit={submit} className="cos-inline cos-inline-6">
        <input
          className="cos-input"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" className="cos-btn cos-btn--secondary cos-btn--sm" disabled={!draft.trim()}>
          Ajouter
        </button>
      </form>
    </div>
  )
}
