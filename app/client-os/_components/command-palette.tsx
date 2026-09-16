'use client'

/**
 * Palette de commandes (⌘K).
 * Retrouver un client doit prendre moins d'une seconde, sans quitter le clavier.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DOSSIER_STATUS } from '@/lib/client-os/constants'
import { matchesQuery, progressOf } from '@/lib/client-os/compute'
import { useWorkspace } from '@/lib/client-os/store'
import { Avatar, Icon } from './ui'

type Entry = {
  id: string
  label: string
  hint: string
  href: string
  kind: 'client' | 'action'
  name?: string
}

/**
 * Le composant est monté à l'ouverture et démonté à la fermeture : la
 * recherche repart toujours vierge, sans état à réinitialiser à la main.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { clients } = useWorkspace()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo<Entry[]>(() => {
    const clientEntries: Entry[] = clients
      .filter((client) => matchesQuery(client, query))
      .map((client) => ({
        id: client.id,
        kind: 'client',
        name: client.company.name,
        label: client.company.name,
        hint: `${DOSSIER_STATUS[client.status].label} · ${progressOf(client)} %`,
        href: `/client-os/clients/${client.id}`,
      }))

    const allActions: Entry[] = [
      { id: 'new', kind: 'action', label: 'Nouveau client', hint: 'Onboarding en 5 étapes', href: '/client-os/clients/new' },
      { id: 'dashboard', kind: 'action', label: 'Dashboard', hint: 'Vue d’ensemble', href: '/client-os' },
      { id: 'clients', kind: 'action', label: 'Tous les clients', hint: 'Liste et filtres', href: '/client-os/clients' },
    ]
    const actions = allActions.filter((entry) =>
      entry.label.toLowerCase().includes(query.trim().toLowerCase()),
    )

    return [...clientEntries, ...actions]
  }, [clients, query])

  // Garde l'élément sélectionné visible quand on navigue au clavier.
  useEffect(() => {
    const node = listRef.current?.querySelector('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function go(entry: Entry) {
    onClose()
    router.push(entry.href)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => (entries.length ? (value + 1) % entries.length : 0))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => (entries.length ? (value - 1 + entries.length) % entries.length : 0))
    }
    if (event.key === 'Enter' && entries[cursor]) {
      event.preventDefault()
      go(entries[cursor])
    }
  }

  return (
    <div
      className="cos-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="cos-palette" role="dialog" aria-modal="true" aria-label="Recherche rapide">
        <input
          autoFocus
          className="cos-palette-input"
          placeholder="Rechercher un client, une action…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setCursor(0)
          }}
          onKeyDown={onKeyDown}
        />

        <div className="cos-palette-list" ref={listRef}>
          {entries.length === 0 ? (
            <p className="cos-meta" style={{ padding: '18px 12px' }}>
              Aucun résultat pour « {query} ».
            </p>
          ) : (
            entries.map((entry, index) => (
              <button
                key={`${entry.kind}-${entry.id}`}
                type="button"
                className="cos-palette-item"
                data-active={index === cursor}
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(entry)}
              >
                {entry.kind === 'client' && entry.name ? (
                  <Avatar name={entry.name} size="sm" />
                ) : (
                  <span
                    className="cos-avatar cos-avatar--sm cos-avatar--t0"
                    style={{ display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name={entry.id === 'new' ? 'plus' : 'arrowRight'} size={13} />
                  </span>
                )}
                <span className="cos-truncate" style={{ flex: 1 }}>
                  {entry.label}
                </span>
                <span className="cos-meta">{entry.hint}</span>
              </button>
            ))
          )}
        </div>

        <div className="cos-palette-foot">
          <span className="cos-kbd" style={{ marginLeft: 0 }}>↑↓</span> naviguer ·{' '}
          <span className="cos-kbd" style={{ marginLeft: 0 }}>⏎</span> ouvrir ·{' '}
          <span className="cos-kbd" style={{ marginLeft: 0 }}>esc</span> fermer
        </div>
      </div>
    </div>
  )
}
