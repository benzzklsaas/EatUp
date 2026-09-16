'use client'

/**
 * Vue d'ensemble — la réponse à « où en est ce projet, et quoi faire ? ».
 */

import {
  actionsOf,
  collectedOf,
  currentStepOf,
  deliveryProgressOf,
  missingResourcesOf,
  openCorrectionsOf,
  outstandingOf,
  progressOf,
  SEVERITY_LABEL,
  type ActionSeverity,
} from '@/lib/client-os/compute'
import { PROJECT_STEPS } from '@/lib/client-os/constants'
import { deadlineLabel, formatDate, formatMoney, relativeFromNow } from '@/lib/client-os/format'
import { Card, Empty, Icon, Pill, Progress, Rail, Section } from '../ui'
import type { PanelProps } from './shared'

const SEVERITY_TONE: Record<ActionSeverity, 'danger' | 'warn' | 'neutral' | 'success'> = {
  critique: 'danger',
  important: 'warn',
  a_suivre: 'neutral',
  pret: 'success',
}

export function OverviewPanel({ client }: Pick<PanelProps, 'client'>) {
  const progress = progressOf(client)
  const actions = actionsOf(client)
  const step = currentStepOf(client)
  const delivery = deliveryProgressOf(client)
  const missing = missingResourcesOf(client)
  const corrections = openCorrectionsOf(client)
  const outstanding = outstandingOf(client)
  const collected = collectedOf(client)

  const railStates = client.timeline.map((entry, index) => {
    if (entry.done) return 'done' as const
    const first = client.timeline.findIndex((item) => !item.done)
    return index === first ? ('current' as const) : ('todo' as const)
  })

  return (
    <div className="cos-panel cos-split">
      <div>
        <Section title="Prochaine action" hint="Ce qui bloque ou attend une décision sur ce dossier.">
          <Card pad={false}>
            {actions.length === 0 ? (
              <Empty
                title="Rien ne bloque"
                text={step ? `Étape suivante : ${step.label}.` : 'Projet livré et clôturé.'}
              />
            ) : (
              <div className="cos-rows">
                {actions.map((action) => (
                  <div key={action.id} className="cos-row">
                    <div className="cos-row-main">
                      <p className="cos-row-title">{action.title}</p>
                      <p className="cos-row-sub">{action.detail}</p>
                    </div>
                    <Pill tone={SEVERITY_TONE[action.severity]} dot>
                      {SEVERITY_LABEL[action.severity]}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Section>

        <Section title="Avancement" hint={`${progress} % — ${step ? step.phase : 'Livré'}`}>
          <Card>
            <Rail states={railStates} />
            <div
              className="cos-inline cos-inline-8"
              style={{ justifyContent: 'space-between', marginTop: 16 }}
            >
              <span className="cos-meta">
                {client.timeline.filter((entry) => entry.done).length} / {PROJECT_STEPS.length} étapes
              </span>
              <span className="cos-num" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.04em' }}>
                {progress} %
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Progress value={progress} tall tone={progress === 100 ? 'success' : undefined} />
            </div>

            {step ? (
              <p className="cos-meta" style={{ marginTop: 14 }}>
                <span className="cos-meta-strong">En cours — {step.label}.</span> {step.hint}
              </p>
            ) : null}
          </Card>
        </Section>

        <Section title="Points de vigilance">
          <div className="cos-grid cos-grid--2">
            <Card>
              <p className="cos-stat-label">Contenus manquants</p>
              <p className="cos-stat-value cos-stat-value--sm">{missing.length}</p>
              <p className="cos-stat-foot">
                {missing.length === 0
                  ? 'Tous les contenus sont arrivés.'
                  : missing.map((item) => item.label).join(', ')}
              </p>
            </Card>
            <Card>
              <p className="cos-stat-label">Corrections ouvertes</p>
              <p className="cos-stat-value cos-stat-value--sm">{corrections.length}</p>
              <p className="cos-stat-foot">
                {corrections.length === 0
                  ? 'Aucune demande en attente.'
                  : `Dont ${corrections.filter((item) => item.priority === 'haute').length} en priorité haute.`}
              </p>
            </Card>
          </div>
        </Section>
      </div>

      <div className="cos-stack cos-stack-12">
        <Card>
          <p className="cos-section-title" style={{ marginBottom: 14 }}>
            Administratif
          </p>
          <div className="cos-stack cos-stack-10">
            <Line label="Montant total" value={formatMoney(client.admin.total)} />
            <Line label="Encaissé" value={formatMoney(collected)} />
            <Line
              label="En attente"
              value={formatMoney(outstanding)}
              tone={outstanding > 0 ? 'danger' : undefined}
            />
          </div>
          <div className="cos-divider" style={{ margin: '14px 0' }} />
          <div className="cos-inline cos-inline-6">
            <Pill tone={client.admin.depositReceivedAt ? 'success' : 'warn'} dot>
              Acompte {client.admin.depositReceivedAt ? 'reçu' : 'en attente'}
            </Pill>
            <Pill tone={client.admin.balanceReceivedAt ? 'success' : 'warn'} dot>
              Solde {client.admin.balanceReceivedAt ? 'reçu' : 'en attente'}
            </Pill>
            <Pill tone={client.admin.contractSigned ? 'success' : 'danger'} dot>
              Contrat {client.admin.contractSigned ? 'signé' : 'non signé'}
            </Pill>
          </div>
        </Card>

        <Card>
          <p className="cos-section-title" style={{ marginBottom: 14 }}>
            Contact
          </p>
          <div className="cos-stack cos-stack-10">
            <Line
              label="Interlocuteur"
              value={
                [client.contact.firstName, client.contact.lastName].filter(Boolean).join(' ') || '—'
              }
            />
            <Line label="Fonction" value={client.contact.role || '—'} />
            <Line
              label="Téléphone"
              value={
                client.contact.phone ? (
                  <a href={`tel:${client.contact.phone.replace(/\s/g, '')}`} style={{ textDecoration: 'underline' }}>
                    {client.contact.phone}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Line
              label="Email"
              value={
                client.contact.email ? (
                  <a href={`mailto:${client.contact.email}`} style={{ textDecoration: 'underline' }}>
                    {client.contact.email}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </div>
        </Card>

        <Card>
          <p className="cos-section-title" style={{ marginBottom: 14 }}>
            Dates clés
          </p>
          <div className="cos-stack cos-stack-10">
            <Line label="Premier appel" value={formatDate(client.discovery.callDate)} />
            <Line label="Deadline" value={formatDate(client.deadline)} />
            <Line label="Échéance" value={deadlineLabel(client.deadline)} />
            <Line label="Dernière activité" value={relativeFromNow(client.lastActivityAt)} />
          </div>
        </Card>

        <Card>
          <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
            <p className="cos-section-title">Checklist de livraison</p>
            <span className="cos-num cos-meta">
              {delivery.done}/{delivery.total}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Progress value={(delivery.done / Math.max(1, delivery.total)) * 100} tone={delivery.ready ? 'success' : undefined} />
          </div>
          {delivery.ready ? (
            <p
              className="cos-inline cos-inline-6"
              style={{ marginTop: 12, color: 'var(--cos-success)', fontSize: 13, fontWeight: 550 }}
            >
              <Icon name="rocket" size={14} /> Projet prêt à être livré
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: 'danger'
}) {
  return (
    <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between' }}>
      <span className="cos-meta">{label}</span>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          textAlign: 'right',
          color: tone === 'danger' ? 'var(--cos-danger)' : 'var(--cos-ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
