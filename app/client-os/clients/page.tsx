'use client'

/**
 * Liste des clients — recherche, filtres, deux densités d'affichage.
 * L'objectif est de retrouver un dossier en moins de trois secondes.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DOSSIER_STATUS, DOSSIER_STATUS_ORDER } from '@/lib/client-os/constants'
import { matchesQuery, progressOf } from '@/lib/client-os/compute'
import { useWorkspace } from '@/lib/client-os/store'
import type { Client, DossierStatus } from '@/lib/client-os/types'
import { ClientCard, ClientRow } from '../_components/client-card'
import { Card, Empty, Icon, Select } from '../_components/ui'

type Filter = 'tous' | DossierStatus
type SortKey = 'activite' | 'deadline' | 'progression' | 'nom'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  ...DOSSIER_STATUS_ORDER.map((status) => ({
    key: status as Filter,
    label: DOSSIER_STATUS[status].label,
  })),
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'activite', label: 'Dernière activité' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'progression', label: 'Progression' },
  { value: 'nom', label: 'Nom' },
]

function sortClients(clients: Client[], key: SortKey): Client[] {
  const sorted = [...clients]
  if (key === 'nom') return sorted.sort((a, b) => a.company.name.localeCompare(b.company.name, 'fr'))
  if (key === 'progression') return sorted.sort((a, b) => progressOf(b) - progressOf(a))
  if (key === 'deadline') {
    return sorted.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })
  }
  return sorted.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
}

export default function ClientsPage() {
  const { clients, ready } = useWorkspace()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('tous')
  const [sort, setSort] = useState<SortKey>('activite')
  const [dense, setDense] = useState(false)

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['tous', clients.length]])
    DOSSIER_STATUS_ORDER.forEach((status) => {
      map.set(status, clients.filter((client) => client.status === status).length)
    })
    return map
  }, [clients])

  const visible = useMemo(() => {
    const filtered = clients.filter(
      (client) => (filter === 'tous' || client.status === filter) && matchesQuery(client, query),
    )
    return sortClients(filtered, sort)
  }, [clients, filter, query, sort])

  return (
    <div className="cos-page">
      <header className="cos-page-head">
        <div>
          <p className="cos-eyebrow">Portefeuille</p>
          <h1 className="cos-title">Clients</h1>
          <p className="cos-subtitle">
            Chaque client possède son dossier complet, du premier appel à la livraison.
          </p>
        </div>
        <Link href="/client-os/clients/new" className="cos-btn cos-btn--primary">
          <Icon name="plus" size={15} />
          Nouveau client
        </Link>
      </header>

      <div className="cos-stack cos-stack-12" style={{ marginBottom: 20 }}>
        <div className="cos-inline cos-inline-8">
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cos-ink-4)',
                display: 'flex',
              }}
            >
              <Icon name="search" size={15} />
            </span>
            <input
              className="cos-input"
              style={{ paddingLeft: 34 }}
              placeholder="Rechercher une entreprise, un contact…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher un client"
            />
          </div>

          <div style={{ width: 178 }}>
            <Select
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={SORTS}
              label="Trier par"
            />
          </div>

          <button
            type="button"
            className="cos-btn cos-btn--secondary cos-btn--icon cos-push"
            onClick={() => setDense((value) => !value)}
            aria-label={dense ? 'Affichage en cartes' : 'Affichage en liste'}
            title={dense ? 'Affichage en cartes' : 'Affichage en liste'}
          >
            <Icon name={dense ? 'dashboard' : 'menu'} size={15} />
          </button>
        </div>

        <div className="cos-inline cos-inline-6" role="tablist" aria-label="Filtrer par statut">
          {FILTERS.map((entry) => {
            const active = filter === entry.key
            const count = counts.get(entry.key) ?? 0
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={active}
                className="cos-tag"
                onClick={() => setFilter(entry.key)}
                style={active ? { background: '#111110', color: '#fff', borderColor: '#111110' } : undefined}
              >
                {entry.label}
                <span className="cos-num" style={{ opacity: 0.6, fontSize: 11 }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {!ready ? (
        <Card>
          <Empty title="Chargement du portefeuille…" />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            title={query ? `Aucun résultat pour « ${query} »` : 'Aucun client dans cette vue'}
            text={
              query
                ? 'Essayez le nom de l’entreprise, du contact ou du projet.'
                : 'Changez de filtre ou créez un nouveau dossier client.'
            }
            action={
              <Link href="/client-os/clients/new" className="cos-btn cos-btn--secondary">
                <Icon name="plus" size={15} />
                Nouveau client
              </Link>
            }
          />
        </Card>
      ) : dense ? (
        <Card pad={false}>
          <div className="cos-rows">
            {visible.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        </Card>
      ) : (
        <div className="cos-grid cos-grid--cards">
          {visible.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
