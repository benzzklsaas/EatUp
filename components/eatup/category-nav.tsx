'use client'

import { useEffect, useRef } from 'react'
import { CloseIcon, SearchIcon } from './icons'

export type NavCategory = { id: string; name: string; emoji: string | null; count: number }

type CategoryNavProps = {
  categories: NavCategory[]
  active: string | null
  onSelect: (id: string) => void
  searchEnabled: boolean
  searching: boolean
  query: string
  onSearchOpen: () => void
  onSearchClose: () => void
  onQueryChange: (q: string) => void
}

export function CategoryNav({
  categories, active, onSelect, searchEnabled, searching, query, onSearchOpen, onSearchClose, onQueryChange,
}: CategoryNavProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  // Garde la catégorie active visible dans la barre horizontale.
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`)
    const box = scroller.current
    if (!el || !box) return
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
  }, [active])

  useEffect(() => {
    if (searching) input.current?.focus()
  }, [searching])

  return (
    <nav
      aria-label="Catégories du menu"
      className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cream/80"
    >
      <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-2 px-3">
        {searching ? (
          <div className="flex w-full items-center gap-2" style={{ animation: 'eu-fade-in .2s ease both' }}>
            <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-white px-4 shadow-[inset_0_0_0_1px_var(--eu-line)]">
              <SearchIcon size={18} className="shrink-0 text-muted" />
              <span className="sr-only">Rechercher un plat</span>
              <input
                ref={input}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="Rechercher un plat, un ingrédient…"
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/80"
              />
              {query && (
                <button type="button" onClick={() => onQueryChange('')} className="grid size-7 place-items-center rounded-full bg-sand" aria-label="Effacer la recherche">
                  <CloseIcon size={14} />
                </button>
              )}
            </label>
            <button type="button" onClick={onSearchClose} className="eu-press h-11 rounded-full px-3 text-[15px] font-semibold">
              Annuler
            </button>
          </div>
        ) : (
          <>
            {searchEnabled && (
              <button
                type="button"
                onClick={onSearchOpen}
                className="eu-press grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--eu-line)]"
                aria-label="Rechercher dans le menu"
              >
                <SearchIcon size={19} />
              </button>
            )}
            <div ref={scroller} className="eu-no-scrollbar -mr-3 flex flex-1 gap-1.5 overflow-x-auto scroll-smooth py-2 pr-3">
              {categories.map(cat => {
                const isActive = cat.id === active
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-cat={cat.id}
                    onClick={() => onSelect(cat.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`eu-press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap ${isActive ? 'bg-ink text-cream' : 'bg-transparent text-ink/75 hover:bg-white'}`}
                  >
                    {cat.emoji && <span aria-hidden="true" className="text-[15px]">{cat.emoji}</span>}
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
