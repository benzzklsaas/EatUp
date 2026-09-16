'use client'

/**
 * Notes internes & historique.
 *
 * Les notes ne sortent jamais du dossier : c'est l'endroit où l'on écrit ce
 * qu'on ne met pas dans un mail. L'historique, lui, se remplit tout seul au
 * fil des étapes cochées et des paiements encaissés.
 */

import { useMemo, useState } from 'react'
import { addHistoryEvent, addNote, removeHistoryEvent, removeNote } from '@/lib/client-os/actions'
import { formatFullDate, formatShortDate, relativeFromNow, today } from '@/lib/client-os/format'
import type { HistoryStatus } from '@/lib/client-os/types'
import { Card, Empty, Icon, Pill, Section } from '../ui'
import type { PanelProps } from './shared'

const HISTORY_STATUS: Record<HistoryStatus, { label: string; tone: 'success' | 'info' | 'muted' }> = {
  fait: { label: 'Fait', tone: 'success' },
  en_cours: { label: 'En cours', tone: 'info' },
  prevu: { label: 'Prévu', tone: 'muted' },
}

export function NotesPanel({ client, update }: PanelProps) {
  const [draft, setDraft] = useState('')

  const history = useMemo(
    () => [...client.history].sort((a, b) => b.date.localeCompare(a.date)),
    [client.history],
  )

  function submitNote(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    const body = draft
    update((c) => addNote(c, body))
    setDraft('')
  }

  return (
    <div className="cos-panel cos-split">
      <div>
        <Section title="Notes internes BK Labs" hint="Points importants, risques, décisions, prochaines actions.">
          <Card style={{ marginBottom: 12 }}>
            <form onSubmit={submitNote}>
              <textarea
                className="cos-textarea"
                placeholder="Ce qu’il faut se rappeler sur ce dossier…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submitNote(event)
                }}
              />
              <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                <span className="cos-meta">
                  <span className="cos-kbd" style={{ marginLeft: 0 }}>⌘⏎</span> pour enregistrer
                </span>
                <button type="submit" className="cos-btn cos-btn--primary cos-btn--sm" disabled={!draft.trim()}>
                  <Icon name="plus" size={14} />
                  Ajouter la note
                </button>
              </div>
            </form>
          </Card>

          {client.notes.length === 0 ? (
            <Card>
              <Empty
                title="Aucune note"
                text="Les notes sont datées automatiquement et restent internes à BK Labs."
              />
            </Card>
          ) : (
            <div className="cos-stack cos-stack-8">
              {client.notes.map((note) => (
                <Card key={note.id}>
                  <div className="cos-inline cos-inline-8" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="cos-meta cos-num">{formatFullDate(note.createdAt)}</span>
                    <span className="cos-inline cos-inline-8">
                      <span className="cos-meta">{relativeFromNow(note.createdAt)}</span>
                      <button
                        type="button"
                        className="cos-btn cos-btn--ghost cos-btn--icon"
                        onClick={() => update((c) => removeNote(c, note.id))}
                        aria-label="Supprimer la note"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{note.body}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Historique" hint="Alimenté automatiquement par les étapes et les paiements.">
        <Card>
          <HistoryForm onAdd={(input) => update((c) => addHistoryEvent(c, input))} />
        </Card>

        <Card style={{ marginTop: 12 }}>
          {history.length === 0 ? (
            <Empty title="Aucun événement" />
          ) : (
            <div className="cos-timeline">
              {history.map((entry) => (
                <div key={entry.id} className={`cos-timeline-item cos-timeline-item--${entry.status}`}>
                  <span className="cos-timeline-date">{formatShortDate(entry.date)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cos-inline cos-inline-6">
                      <span style={{ fontSize: 13.5, fontWeight: 550 }}>{entry.step}</span>
                      {entry.status !== 'fait' ? (
                        <Pill tone={HISTORY_STATUS[entry.status].tone}>
                          {HISTORY_STATUS[entry.status].label}
                        </Pill>
                      ) : null}
                    </div>
                    <p className="cos-meta" style={{ marginTop: 1 }}>
                      {entry.action}
                    </p>
                  </div>
                  {!entry.auto ? (
                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost cos-btn--icon"
                      onClick={() => update((c) => removeHistoryEvent(c, entry.id))}
                      aria-label="Supprimer l’événement"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>
    </div>
  )
}

function HistoryForm({
  onAdd,
}: {
  onAdd: (input: { date: string; step: string; action: string; status: HistoryStatus }) => void
}) {
  const [date, setDate] = useState(today())
  const [step, setStep] = useState('')
  const [action, setAction] = useState('')
  const [status, setStatus] = useState<HistoryStatus>('fait')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!step.trim() || !action.trim()) return
    onAdd({ date, step: step.trim(), action: action.trim(), status })
    setStep('')
    setAction('')
    setStatus('fait')
  }

  return (
    <form onSubmit={submit} className="cos-stack cos-stack-8">
      <p className="cos-field-label">Ajouter un événement</p>
      <div className="cos-inline cos-inline-6">
        <input
          type="date"
          className="cos-input cos-num"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          style={{ width: 150 }}
          aria-label="Date de l’événement"
        />
        <input
          className="cos-input"
          placeholder="Étape"
          value={step}
          onChange={(event) => setStep(event.target.value)}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Étape"
        />
      </div>
      <input
        className="cos-input"
        placeholder="Action — ex. Maquette V1 envoyée"
        value={action}
        onChange={(event) => setAction(event.target.value)}
        aria-label="Action"
      />
      <div className="cos-inline cos-inline-6">
        {(Object.keys(HISTORY_STATUS) as HistoryStatus[]).map((value) => (
          <button
            key={value}
            type="button"
            className="cos-tag"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            style={status === value ? { background: '#111110', color: '#fff', borderColor: '#111110' } : undefined}
          >
            {HISTORY_STATUS[value].label}
          </button>
        ))}
        <button
          type="submit"
          className="cos-btn cos-btn--secondary cos-btn--sm cos-push"
          disabled={!step.trim() || !action.trim()}
        >
          Ajouter
        </button>
      </div>
    </form>
  )
}
