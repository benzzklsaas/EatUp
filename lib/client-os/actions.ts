/**
 * BK Labs — Client OS · Mutations métier
 * --------------------------------------
 * Des fonctions pures `Client → Client`. Aucune ne touche au stockage : elles
 * sont passées à `updateClient` qui se charge de persister.
 *
 * C'est ici qu'est centralisée l'alimentation automatique de l'historique :
 * cocher une étape ou encaisser un solde écrit la ligne de timeline
 * correspondante, sans que l'utilisateur ait à y penser.
 */

import { PROJECT_STEPS, STEP_BY_KEY } from './constants'
import { makeId } from './factory'
import { nowISO, today } from './format'
import type {
  Admin,
  ChecklistItem,
  Client,
  Correction,
  CorrectionStatus,
  CreativeDirection,
  Discovery,
  HistoryEvent,
  HistoryStatus,
  Opportunity,
  OpportunityStatus,
  Priority,
  ResourceStatus,
  Scope,
  StepKey,
} from './types'

/* ------------------------------------------------------------------ */
/* Historique                                                          */
/* ------------------------------------------------------------------ */

function withEvent(
  client: Client,
  input: { step: string; action: string; ref?: string; status?: HistoryStatus },
): Client {
  const event: HistoryEvent = {
    id: makeId('evt'),
    date: today(),
    step: input.step,
    action: input.action,
    ownerId: client.ownerId,
    status: input.status ?? 'fait',
    auto: true,
    ref: input.ref,
  }
  const history = input.ref
    ? client.history.filter((entry) => entry.ref !== input.ref)
    : client.history
  return { ...client, history: [...history, event] }
}

function withoutEvent(client: Client, ref: string): Client {
  return { ...client, history: client.history.filter((entry) => entry.ref !== ref) }
}

export function addHistoryEvent(
  client: Client,
  input: { date: string; step: string; action: string; status: HistoryStatus },
): Client {
  return {
    ...client,
    history: [
      ...client.history,
      { id: makeId('evt'), ownerId: client.ownerId, auto: false, ...input },
    ],
  }
}

export function removeHistoryEvent(client: Client, id: string): Client {
  return { ...client, history: client.history.filter((entry) => entry.id !== id) }
}

/* ------------------------------------------------------------------ */
/* Identité du dossier                                                 */
/* ------------------------------------------------------------------ */

export function patchClient(client: Client, patch: Partial<Client>): Client {
  return { ...client, ...patch }
}

export function patchCompany(client: Client, patch: Partial<Client['company']>): Client {
  return { ...client, company: { ...client.company, ...patch } }
}

export function patchContact(client: Client, patch: Partial<Client['contact']>): Client {
  return { ...client, contact: { ...client.contact, ...patch } }
}

export function patchDiscovery(client: Client, patch: Partial<Discovery>): Client {
  return { ...client, discovery: { ...client.discovery, ...patch } }
}

export function patchAnalysis(client: Client, patch: Partial<Client['analysis']>): Client {
  return { ...client, analysis: { ...client.analysis, ...patch } }
}

export function patchCreative(client: Client, patch: Partial<CreativeDirection>): Client {
  return { ...client, creative: { ...client.creative, ...patch } }
}

export function patchValidation(client: Client, patch: Partial<Client['validation']>): Client {
  return { ...client, validation: { ...client.validation, ...patch } }
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

/**
 * Coche ou décoche une étape. Cocher écrit l'événement d'historique
 * correspondant ; décocher le retire.
 */
export function toggleStep(client: Client, key: StepKey): Client {
  const step = STEP_BY_KEY.get(key)
  const current = client.timeline.find((entry) => entry.key === key)
  if (!step || !current) return client

  const nextDone = !current.done
  const timeline = client.timeline.map((entry) =>
    entry.key === key ? { ...entry, done: nextDone, doneAt: nextDone ? today() : null } : entry,
  )
  const next = { ...client, timeline }
  const ref = `step:${key}`

  return nextDone
    ? withEvent(next, { step: step.label, action: `${step.label} — validé`, ref })
    : withoutEvent(next, ref)
}

/** Coche toutes les étapes jusqu'à `key` incluse — utile pour rattraper un retard de saisie. */
export function completeUpTo(client: Client, key: StepKey): Client {
  const target = PROJECT_STEPS.findIndex((step) => step.key === key)
  if (target < 0) return client
  return PROJECT_STEPS.slice(0, target + 1).reduce((acc, step) => {
    const entry = acc.timeline.find((item) => item.key === step.key)
    return entry?.done ? acc : toggleStep(acc, step.key)
  }, client)
}

/* ------------------------------------------------------------------ */
/* Périmètre                                                           */
/* ------------------------------------------------------------------ */

export type ScopeBucket = keyof Scope

export function addScopeItem(client: Client, bucket: ScopeBucket, label: string): Client {
  const clean = label.trim()
  if (!clean) return client
  return {
    ...client,
    scope: { ...client.scope, [bucket]: [...client.scope[bucket], { id: makeId('scp'), label: clean }] },
  }
}

export function removeScopeItem(client: Client, bucket: ScopeBucket, id: string): Client {
  return {
    ...client,
    scope: { ...client.scope, [bucket]: client.scope[bucket].filter((item) => item.id !== id) },
  }
}

export function renameScopeItem(client: Client, bucket: ScopeBucket, id: string, label: string): Client {
  return {
    ...client,
    scope: {
      ...client.scope,
      [bucket]: client.scope[bucket].map((item) => (item.id === id ? { ...item, label } : item)),
    },
  }
}

/* ------------------------------------------------------------------ */
/* Contenus & ressources                                               */
/* ------------------------------------------------------------------ */

export function setResourceStatus(client: Client, id: string, status: ResourceStatus): Client {
  return {
    ...client,
    resources: client.resources.map((item) => (item.id === id ? { ...item, status } : item)),
  }
}

export function setResourceNote(client: Client, id: string, note: string): Client {
  return {
    ...client,
    resources: client.resources.map((item) => (item.id === id ? { ...item, note } : item)),
  }
}

export function addResource(client: Client, label: string): Client {
  const clean = label.trim()
  if (!clean) return client
  return {
    ...client,
    resources: [...client.resources, { id: makeId('res'), label: clean, status: 'attente', note: '' }],
  }
}

export function removeResource(client: Client, id: string): Client {
  return { ...client, resources: client.resources.filter((item) => item.id !== id) }
}

/* ------------------------------------------------------------------ */
/* Validation & corrections                                            */
/* ------------------------------------------------------------------ */

export function addCorrection(
  client: Client,
  input: { area: string; description: string; priority: Priority },
): Client {
  const description = input.description.trim()
  if (!description) return client
  const correction: Correction = {
    id: makeId('cor'),
    area: input.area.trim(),
    description,
    priority: input.priority,
    status: 'a_faire',
    createdAt: today(),
  }
  return {
    ...client,
    validation: { ...client.validation, corrections: [...client.validation.corrections, correction] },
  }
}

export function patchCorrection(client: Client, id: string, patch: Partial<Correction>): Client {
  return {
    ...client,
    validation: {
      ...client.validation,
      corrections: client.validation.corrections.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    },
  }
}

const CORRECTION_CYCLE: CorrectionStatus[] = ['a_faire', 'en_cours', 'termine']

/** Fait avancer une correction d'un cran — un clic au lieu d'un menu. */
export function cycleCorrectionStatus(client: Client, id: string): Client {
  const correction = client.validation.corrections.find((item) => item.id === id)
  if (!correction) return client
  const index = CORRECTION_CYCLE.indexOf(correction.status)
  const next = CORRECTION_CYCLE[(index + 1) % CORRECTION_CYCLE.length]
  return patchCorrection(client, id, { status: next })
}

export function removeCorrection(client: Client, id: string): Client {
  return {
    ...client,
    validation: {
      ...client.validation,
      corrections: client.validation.corrections.filter((item) => item.id !== id),
    },
  }
}

export function sendV1(client: Client): Client {
  const next = patchValidation(client, { v1SentAt: today() })
  return withEvent(next, { step: 'V1', action: 'V1 présentée au client', ref: 'v1:sent' })
}

/* ------------------------------------------------------------------ */
/* Administratif                                                       */
/* ------------------------------------------------------------------ */

export function patchAdmin(client: Client, patch: Partial<Admin>): Client {
  const admin = { ...client.admin, ...patch }
  // Le solde suit toujours le total moins l'acompte, sauf saisie explicite.
  if (patch.total !== undefined || patch.deposit !== undefined) {
    if (patch.balance === undefined) admin.balance = Math.max(0, admin.total - admin.deposit)
  }
  return { ...client, admin }
}

export function toggleDepositReceived(client: Client): Client {
  const received = Boolean(client.admin.depositReceivedAt)
  const next = patchAdmin(client, { depositReceivedAt: received ? null : today() })
  return received
    ? withoutEvent(next, 'admin:deposit')
    : withEvent(next, { step: 'Acompte', action: `Acompte reçu`, ref: 'admin:deposit' })
}

export function toggleBalanceReceived(client: Client): Client {
  const received = Boolean(client.admin.balanceReceivedAt)
  const next = patchAdmin(client, { balanceReceivedAt: received ? null : today() })
  return received
    ? withoutEvent(next, 'admin:balance')
    : withEvent(next, { step: 'Solde', action: `Solde reçu`, ref: 'admin:balance' })
}

export function toggleContractSigned(client: Client): Client {
  const signed = client.admin.contractSigned
  const next = patchAdmin(client, {
    contractSigned: !signed,
    contractSignedAt: signed ? null : today(),
  })
  return signed
    ? withoutEvent(next, 'admin:contract')
    : withEvent(next, { step: 'Contrat', action: 'Contrat signé', ref: 'admin:contract' })
}

/* ------------------------------------------------------------------ */
/* Livraison & suivi                                                   */
/* ------------------------------------------------------------------ */

export function toggleDeliveryItem(client: Client, id: string): Client {
  const delivery: ChecklistItem[] = client.delivery.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  )
  const next = { ...client, delivery }
  const complete = delivery.every((item) => item.done)
  return complete
    ? withEvent(next, { step: 'Livraison', action: 'Checklist de livraison complète', ref: 'delivery:ready' })
    : withoutEvent(next, 'delivery:ready')
}

export function setDeliveryAll(client: Client, done: boolean): Client {
  const delivery = client.delivery.map((item) => ({ ...item, done }))
  const next = { ...client, delivery }
  return done
    ? withEvent(next, { step: 'Livraison', action: 'Checklist de livraison complète', ref: 'delivery:ready' })
    : withoutEvent(next, 'delivery:ready')
}

export function patchFollowUp(client: Client, patch: Partial<Client['followUp']>): Client {
  return { ...client, followUp: { ...client.followUp, ...patch } }
}

export function toggleFollowUpCall(client: Client, which: 'j1' | 'j7'): Client {
  if (which === 'j1') {
    const done = !client.followUp.j1Done
    return patchFollowUp(client, { j1Done: done, j1At: done ? today() : null })
  }
  const done = !client.followUp.j7Done
  return patchFollowUp(client, { j7Done: done, j7At: done ? today() : null })
}

export function setOpportunityStatus(client: Client, id: string, status: OpportunityStatus): Client {
  return {
    ...client,
    followUp: {
      ...client.followUp,
      opportunities: client.followUp.opportunities.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    },
  }
}

export function addOpportunity(client: Client, label: string): Client {
  const clean = label.trim()
  if (!clean) return client
  const opportunity: Opportunity = { id: makeId('opp'), label: clean, status: 'identifiee' }
  return {
    ...client,
    followUp: { ...client.followUp, opportunities: [...client.followUp.opportunities, opportunity] },
  }
}

/* ------------------------------------------------------------------ */
/* Notes internes                                                      */
/* ------------------------------------------------------------------ */

export function addNote(client: Client, body: string): Client {
  const clean = body.trim()
  if (!clean) return client
  return {
    ...client,
    notes: [
      { id: makeId('note'), body: clean, createdAt: nowISO(), authorId: client.ownerId },
      ...client.notes,
    ],
  }
}

export function removeNote(client: Client, id: string): Client {
  return { ...client, notes: client.notes.filter((note) => note.id !== id) }
}
