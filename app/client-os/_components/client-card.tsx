'use client'

/**
 * Carte client — réutilisée sur le dashboard et dans la liste.
 * Elle doit répondre en un coup d'œil : où en est-on, et quoi faire ensuite.
 */

import Link from 'next/link'
import { DOSSIER_STATUS, PROJECT_STEPS } from '@/lib/client-os/constants'
import { isStepDone, nextActionOf, phaseLabelOf, progressOf } from '@/lib/client-os/compute'
import { daysUntil, formatDate, relativeFromNow } from '@/lib/client-os/format'
import type { Client } from '@/lib/client-os/types'
import { Avatar, Pill, Progress, Rail } from './ui'

const SEVERITY_TONE = {
  critique: 'danger',
  important: 'warn',
  a_suivre: 'neutral',
  pret: 'success',
} as const

export function ClientCard({ client }: { client: Client }) {
  const progress = progressOf(client)
  const status = DOSSIER_STATUS[client.status]
  const next = nextActionOf(client)
  const remaining = daysUntil(client.deadline)
  const delivered = isStepDone(client, 'livraison')
  const late = remaining !== null && remaining < 0 && !delivered

  const railStates = client.timeline.map((step, index) => {
    if (step.done) return 'done' as const
    const firstPending = client.timeline.findIndex((entry) => !entry.done)
    return index === firstPending ? ('current' as const) : ('todo' as const)
  })

  return (
    <Link href={`/client-os/clients/${client.id}`} className="cos-card cos-card--link">
      <div style={{ padding: '18px 18px 16px' }}>
        <div className="cos-inline cos-inline-10" style={{ alignItems: 'flex-start' }}>
          <Avatar name={client.company.name} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="cos-row-title" style={{ fontSize: 15 }}>
              {client.company.name}
            </p>
            <p className="cos-row-sub">{client.projectName || 'Projet à définir'}</p>
          </div>
          <Pill tone={status.tone} dot pulse={client.status === 'production'}>
            {status.short}
          </Pill>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginBottom: 7 }}>
            <span className="cos-meta cos-meta-strong">{phaseLabelOf(client)}</span>
            <span className="cos-num cos-meta cos-meta-strong">{progress} %</span>
          </div>
          <Progress value={progress} tone={progress === 100 ? 'success' : undefined} />
          <div style={{ marginTop: 11 }}>
            <Rail states={railStates} />
          </div>
        </div>
      </div>

      <div
        className="cos-inline cos-inline-8"
        style={{
          padding: '11px 18px',
          borderTop: '1px solid var(--cos-line)',
          justifyContent: 'space-between',
        }}
      >
        <span
          className="cos-truncate"
          style={{
            fontSize: 12.5,
            color: next.severity ? `var(--cos-${SEVERITY_TONE[next.severity]})` : 'var(--cos-ink-3)',
            fontWeight: next.severity === 'critique' ? 550 : 400,
          }}
        >
          {next.label}
        </span>
        <span className="cos-meta cos-num" style={{ flexShrink: 0, color: late ? 'var(--cos-danger)' : undefined }}>
          {client.deadline && !delivered ? formatDate(client.deadline) : relativeFromNow(client.lastActivityAt)}
        </span>
      </div>
    </Link>
  )
}

/** Variante compacte en ligne, pour les listes denses. */
export function ClientRow({ client }: { client: Client }) {
  const progress = progressOf(client)
  const status = DOSSIER_STATUS[client.status]
  const next = nextActionOf(client)
  const remaining = daysUntil(client.deadline)
  const delivered = isStepDone(client, 'livraison')
  const late = remaining !== null && remaining < 0 && !delivered
  const currentStep = PROJECT_STEPS.find(
    (step) => step.key === client.timeline.find((entry) => !entry.done)?.key,
  )

  return (
    <Link href={`/client-os/clients/${client.id}`} className="cos-row cos-row--link">
      <Avatar name={client.company.name} size="sm" />

      <div className="cos-row-main">
        <p className="cos-row-title">{client.company.name}</p>
        <p className="cos-row-sub">
          {client.projectName || 'Projet à définir'}
          {currentStep ? ` · ${currentStep.phase}` : ' · Livré'}
        </p>
      </div>

      <div style={{ width: 118, flexShrink: 0 }} className="cos-inline cos-inline-8">
        <div style={{ flex: 1 }}>
          <Progress value={progress} />
        </div>
        <span className="cos-num cos-meta" style={{ width: 34, textAlign: 'right' }}>
          {progress} %
        </span>
      </div>

      <div style={{ width: 132, flexShrink: 0 }} className="cos-truncate">
        <span
          className="cos-meta"
          style={{ color: next.severity === 'critique' ? 'var(--cos-danger)' : undefined }}
        >
          {next.label}
        </span>
      </div>

      <span
        className="cos-meta cos-num"
        style={{ width: 92, flexShrink: 0, textAlign: 'right', color: late ? 'var(--cos-danger)' : undefined }}
      >
        {client.deadline && !delivered ? formatDate(client.deadline) : '—'}
      </span>

      <div style={{ width: 106, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <Pill tone={status.tone} dot>
          {status.short}
        </Pill>
      </div>
    </Link>
  )
}
