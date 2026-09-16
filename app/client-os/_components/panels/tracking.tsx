'use client'

/**
 * Suivi — planning du projet et gestion des retours.
 * Cocher une étape alimente automatiquement l'historique du dossier.
 */

import { useState } from 'react'
import {
  addCorrection,
  cycleCorrectionStatus,
  patchValidation,
  removeCorrection,
  sendV1,
  toggleStep,
} from '@/lib/client-os/actions'
import { CORRECTION_STATUS, PRIORITIES, PRIORITY_ORDER, PROJECT_STEPS } from '@/lib/client-os/constants'
import { openCorrectionsOf, progressOf } from '@/lib/client-os/compute'
import { formatDate } from '@/lib/client-os/format'
import type { Priority } from '@/lib/client-os/types'
import { Card, EditableText, Empty, Icon, Pill, Progress, Rail, Section } from '../ui'
import type { PanelProps } from './shared'

export function TrackingPanel({ client, update }: PanelProps) {
  const progress = progressOf(client)
  const firstPending = client.timeline.findIndex((entry) => !entry.done)
  const open = openCorrectionsOf(client)

  const railStates = client.timeline.map((entry, index) =>
    entry.done ? ('done' as const) : index === firstPending ? ('current' as const) : ('todo' as const),
  )

  return (
    <div className="cos-panel">
      <Section title="Planning du projet" hint="Cocher une étape met à jour la progression et l’historique.">
        <Card style={{ marginBottom: 12 }}>
          <Rail states={railStates} />
          <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <span className="cos-meta">
              {client.timeline.filter((entry) => entry.done).length} étapes sur {PROJECT_STEPS.length}
            </span>
            <span className="cos-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.045em' }}>
              {progress} %
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Progress value={progress} tall tone={progress === 100 ? 'success' : undefined} />
          </div>
        </Card>

        <Card pad={false}>
          <div className="cos-rows">
            {PROJECT_STEPS.map((step, index) => {
              const entry = client.timeline.find((item) => item.key === step.key)
              const done = entry?.done ?? false
              const current = index === firstPending

              return (
                <button
                  key={step.key}
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  className={`cos-step${done ? ' cos-step--done' : ''}${current ? ' cos-step--current' : ''}`}
                  onClick={() => update((c) => toggleStep(c, step.key))}
                >
                  <span className="cos-step-index">
                    {done ? <Icon name="check" size={11} /> : index + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cos-step-title" style={{ display: 'block' }}>
                      {step.label}
                    </span>
                    <span className="cos-step-hint" style={{ display: 'block' }}>
                      {step.hint}
                    </span>
                  </span>
                  <span className="cos-inline cos-inline-8" style={{ flexShrink: 0 }}>
                    {current ? <Pill tone="info">En cours</Pill> : null}
                    <span
                      className="cos-num cos-meta"
                      style={{ width: 104, textAlign: 'right', whiteSpace: 'nowrap' }}
                    >
                      {entry?.doneAt ? formatDate(entry.doneAt) : `${step.weight} %`}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </Section>

      <Section title="Validation" hint="La V1, les retours du client, et ce qu’il reste à corriger.">
        <div className="cos-split">
          <Card pad={false}>
            <div className="cos-inline cos-inline-8" style={{ padding: '16px 18px', justifyContent: 'space-between' }}>
              <div>
                <p className="cos-section-title">V1</p>
                <p className="cos-meta">
                  {client.validation.v1SentAt
                    ? `Envoyée le ${formatDate(client.validation.v1SentAt)}`
                    : 'Pas encore envoyée'}
                </p>
              </div>
              {!client.validation.v1SentAt ? (
                <button
                  type="button"
                  className="cos-btn cos-btn--secondary cos-btn--sm"
                  onClick={() => update((c) => sendV1(c))}
                >
                  Marquer comme envoyée
                </button>
              ) : (
                <input
                  type="date"
                  className="cos-input"
                  style={{ width: 160 }}
                  value={client.validation.v1SentAt}
                  aria-label="Date d’envoi de la V1"
                  onChange={(event) =>
                    update((c) => patchValidation(c, { v1SentAt: event.target.value || null }))
                  }
                />
              )}
            </div>

            <div style={{ padding: '0 18px 18px' }}>
              <div className="cos-field">
                <span className="cos-field-label">Commentaire d’envoi</span>
                <EditableText
                  label="Commentaire d’envoi"
                  multiline
                  value={client.validation.v1Comment}
                  onChange={(next) => update((c) => patchValidation(c, { v1Comment: next }))}
                />
              </div>
              <div className="cos-field" style={{ marginBottom: 0 }}>
                <span className="cos-field-label">Retours client</span>
                <EditableText
                  label="Retours client"
                  multiline
                  value={client.validation.clientFeedback}
                  onChange={(next) => update((c) => patchValidation(c, { clientFeedback: next }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <p className="cos-section-title" style={{ marginBottom: 4 }}>
              Demandes de correction
            </p>
            <p className="cos-meta" style={{ marginBottom: 14 }}>
              {open.length === 0
                ? 'Aucune demande ouverte.'
                : `${open.length} demande${open.length > 1 ? 's' : ''} en cours.`}
            </p>
            <CorrectionForm onAdd={(input) => update((c) => addCorrection(c, input))} />
          </Card>
        </div>

        <Card pad={false} style={{ marginTop: 12 }}>
          {client.validation.corrections.length === 0 ? (
            <Empty
              title="Aucune correction"
              text="Les retours du client se consignent ici, un par ligne, avec un statut et une priorité."
            />
          ) : (
            <div className="cos-rows">
              {client.validation.corrections.map((correction, index) => {
                const status = CORRECTION_STATUS[correction.status]
                return (
                  <div key={correction.id} className="cos-row">
                    <span className="cos-num cos-meta" style={{ width: 20, flexShrink: 0 }}>
                      {index + 1}
                    </span>

                    <div className="cos-row-main">
                      <p className="cos-row-title">
                        {correction.area ? `${correction.area} → ` : ''}
                        {correction.description}
                      </p>
                      <p className="cos-row-sub cos-num">Créée le {formatDate(correction.createdAt)}</p>
                    </div>

                    {correction.priority !== 'normale' ? (
                      <Pill tone={correction.priority === 'haute' ? 'danger' : 'muted'}>
                        {PRIORITIES[correction.priority].label}
                      </Pill>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => update((c) => cycleCorrectionStatus(c, correction.id))}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      aria-label={`${correction.description} — ${status.label}, changer le statut`}
                      title="Cliquer pour faire avancer"
                    >
                      <Pill tone={status.tone} dot>
                        {status.label}
                      </Pill>
                    </button>

                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost cos-btn--icon"
                      onClick={() => update((c) => removeCorrection(c, correction.id))}
                      aria-label="Supprimer la correction"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </Section>
    </div>
  )
}

function CorrectionForm({
  onAdd,
}: {
  onAdd: (input: { area: string; description: string; priority: Priority }) => void
}) {
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('normale')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!description.trim()) return
    onAdd({ area, description, priority })
    setArea('')
    setDescription('')
    setPriority('normale')
  }

  return (
    <form onSubmit={submit} className="cos-stack cos-stack-8">
      <input
        className="cos-input"
        placeholder="Zone — ex. Page accueil"
        value={area}
        onChange={(event) => setArea(event.target.value)}
        aria-label="Zone concernée"
      />
      <input
        className="cos-input"
        placeholder="Demande — ex. modifier le titre"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        aria-label="Description de la demande"
      />
      <div className="cos-inline cos-inline-6">
        {PRIORITY_ORDER.map((value) => (
          <button
            key={value}
            type="button"
            className="cos-tag"
            aria-pressed={priority === value}
            onClick={() => setPriority(value)}
            style={
              priority === value
                ? { background: '#111110', color: '#fff', borderColor: '#111110' }
                : undefined
            }
          >
            {PRIORITIES[value].label}
          </button>
        ))}
        <button type="submit" className="cos-btn cos-btn--primary cos-btn--sm cos-push" disabled={!description.trim()}>
          <Icon name="plus" size={14} />
          Ajouter
        </button>
      </div>
    </form>
  )
}
