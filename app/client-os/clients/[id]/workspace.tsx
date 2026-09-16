'use client'

/**
 * Espace client — l'écran où l'on passe le plus de temps.
 *
 * L'en-tête reste visible en permanence : nom, statut, phase, progression et
 * deadline ne doivent jamais demander de remonter. Le reste est réparti en
 * sept onglets plutôt qu'en une page interminable.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { patchClient } from '@/lib/client-os/actions'
import { DOSSIER_STATUS, DOSSIER_STATUS_ORDER, SOLUTION_TYPES } from '@/lib/client-os/constants'
import {
  actionsOf,
  deliveryProgressOf,
  isStepDone,
  missingResourcesOf,
  openCorrectionsOf,
  phaseLabelOf,
  progressOf,
  stepDoneAt,
} from '@/lib/client-os/compute'
import { deadlineLabel, formatDate, relativeFromNow } from '@/lib/client-os/format'
import { useClient } from '@/lib/client-os/store'
import type { DossierStatus } from '@/lib/client-os/types'
import { AdminPanel } from '../../_components/panels/admin'
import { BriefPanel } from '../../_components/panels/brief'
import { DeliveryPanel } from '../../_components/panels/delivery'
import { NotesPanel } from '../../_components/panels/notes'
import { OverviewPanel } from '../../_components/panels/overview'
import { ProjectPanel } from '../../_components/panels/project'
import { TrackingPanel } from '../../_components/panels/tracking'
import { Avatar, Card, Empty, Icon, Pill, Progress, Select } from '../../_components/ui'

const TABS = [
  { key: 'vue', label: 'Vue d’ensemble' },
  { key: 'brief', label: 'Brief' },
  { key: 'projet', label: 'Projet' },
  { key: 'suivi', label: 'Suivi' },
  { key: 'admin', label: 'Administratif' },
  { key: 'livraison', label: 'Livraison' },
  { key: 'notes', label: 'Notes' },
] as const

type TabKey = (typeof TABS)[number]['key']

function isTab(value: string | null): value is TabKey {
  return TABS.some((entry) => entry.key === value)
}

export function ClientWorkspace({ id }: { id: string }) {
  const { client, update, ready } = useClient(id)
  const searchParams = useSearchParams()

  // L'onglet actif est lu dans l'URL plutôt que dupliqué dans un état local :
  // les liens profonds du dashboard et les boutons précédent / suivant du
  // navigateur fonctionnent sans synchronisation à maintenir.
  const requested = searchParams.get('tab')
  const tab: TabKey = isTab(requested) ? requested : 'vue'

  const badges = useMemo(() => {
    if (!client) return {} as Partial<Record<TabKey, number>>
    const delivery = deliveryProgressOf(client)
    return {
      projet: missingResourcesOf(client).length,
      suivi: openCorrectionsOf(client).length,
      admin: actionsOf(client).filter((action) => action.tab === 'admin').length,
      livraison: delivery.ready && !client.timeline.find((s) => s.key === 'livraison')?.done ? 1 : 0,
    } as Partial<Record<TabKey, number>>
  }, [client])

  if (!ready) {
    return (
      <div className="cos-page">
        <Card style={{ marginTop: 40 }}>
          <Empty title="Chargement du dossier…" />
        </Card>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="cos-page">
        <Card style={{ marginTop: 40 }}>
          <Empty
            title="Dossier introuvable"
            text="Ce client n’existe pas ou a été supprimé."
            action={
              <Link href="/client-os/clients" className="cos-btn cos-btn--secondary">
                <Icon name="arrowLeft" size={15} />
                Retour aux clients
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const progress = progressOf(client)
  const delivered = isStepDone(client, 'livraison')
  const status = DOSSIER_STATUS[client.status]
  const contactName = [client.contact.firstName, client.contact.lastName].filter(Boolean).join(' ')
  const solutions = client.analysis.solutionTypes.map((type) => SOLUTION_TYPES[type])

  // `replaceState` est intégré au routeur Next : l'URL suit sans rechargement
  // ni aller-retour serveur, et `useSearchParams` se met à jour.
  function selectTab(next: TabKey) {
    window.history.replaceState(null, '', `/client-os/clients/${id}?tab=${next}`)
  }

  return (
    <>
      <div className="cos-client-head">
        <div className="cos-client-head-inner">
          <Link
            href="/client-os/clients"
            className="cos-inline cos-inline-6 cos-meta"
            style={{ marginBottom: 14 }}
          >
            <Icon name="arrowLeft" size={13} />
            Clients
          </Link>

          <div className="cos-client-identity">
            <Avatar name={client.company.name} size="lg" />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="cos-client-name">{client.company.name}</h1>
              <p className="cos-meta" style={{ marginTop: 3 }}>
                {contactName || 'Contact à renseigner'}
                {client.contact.role ? ` · ${client.contact.role}` : ''}
                {client.projectName ? ` · ${client.projectName}` : ''}
              </p>
              <div className="cos-inline cos-inline-6" style={{ marginTop: 9 }}>
                <Pill tone={status.tone} dot pulse={client.status === 'production'}>
                  {status.label}
                </Pill>
                <Pill tone="neutral">{phaseLabelOf(client)}</Pill>
                {solutions.slice(0, 2).map((label) => (
                  <span key={label} className="cos-tag" style={{ fontSize: 11.5, padding: '3px 9px' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="cos-stack cos-stack-8" style={{ width: 210, flexShrink: 0 }}>
              <Select
                label="Statut du dossier"
                value={client.status}
                onChange={(next) => update((c) => patchClient(c, { status: next as DossierStatus }))}
                options={DOSSIER_STATUS_ORDER.map((value) => ({
                  value,
                  label: DOSSIER_STATUS[value].label,
                }))}
              />
              <input
                type="date"
                className="cos-input cos-num"
                value={client.deadline ?? ''}
                aria-label="Deadline"
                onChange={(event) => update((c) => patchClient(c, { deadline: event.target.value || null }))}
              />
            </div>
          </div>

          <div className="cos-inline cos-inline-14" style={{ marginTop: 18 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Progress value={progress} tone={progress === 100 ? 'success' : undefined} />
            </div>
            <span className="cos-num" style={{ fontSize: 13.5, fontWeight: 600 }}>
              {progress} %
            </span>
            <span className="cos-meta">
              {delivered
                ? `Livré le ${formatDate(stepDoneAt(client, 'livraison'))}`
                : client.deadline
                  ? `${formatDate(client.deadline)} · ${deadlineLabel(client.deadline)}`
                  : 'Pas de deadline'}
            </span>
            <span className="cos-meta cos-push">Activité {relativeFromNow(client.lastActivityAt)}</span>
          </div>

          <div className="cos-tabs" role="tablist" aria-label="Sections du dossier">
            {TABS.map((entry) => {
              const badge = badges[entry.key] ?? 0
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.key}
                  className="cos-tab"
                  onClick={() => selectTab(entry.key)}
                >
                  {entry.label}
                  {badge > 0 ? <span className="cos-tab-badge">{badge}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cos-page" style={{ paddingTop: 28 }}>
        {tab === 'vue' ? <OverviewPanel client={client} /> : null}
        {tab === 'brief' ? <BriefPanel client={client} update={update} /> : null}
        {tab === 'projet' ? <ProjectPanel client={client} update={update} /> : null}
        {tab === 'suivi' ? <TrackingPanel client={client} update={update} /> : null}
        {tab === 'admin' ? <AdminPanel client={client} update={update} /> : null}
        {tab === 'livraison' ? <DeliveryPanel client={client} update={update} /> : null}
        {tab === 'notes' ? <NotesPanel client={client} update={update} /> : null}
      </div>
    </>
  )
}
