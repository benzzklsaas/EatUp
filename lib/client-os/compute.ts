/**
 * BK Labs — Client OS · Moteur de lecture
 * ---------------------------------------
 * Toute la « lecture » du produit est ici : progression, phase en cours,
 * blocages, prochaine action, indicateurs du dashboard.
 *
 * Aucune de ces valeurs n'est stockée — elles sont dérivées de l'état du
 * dossier. Un seul endroit à corriger quand la règle métier change, et aucune
 * donnée incohérente possible en base.
 */

import { PROJECT_STEPS, STEP_BY_KEY } from './constants'
import { daysSince, daysUntil } from './format'
import type { Client, DossierStatus, StepKey } from './types'

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

const TOTAL_WEIGHT = PROJECT_STEPS.reduce((sum, step) => sum + step.weight, 0)

/** Progression pondérée 0–100. */
export function progressOf(client: Client): number {
  const done = client.timeline.reduce(
    (sum, step) => (step.done ? sum + (STEP_BY_KEY.get(step.key)?.weight ?? 0) : sum),
    0,
  )
  return Math.round((done / TOTAL_WEIGHT) * 100)
}

/** Première étape non cochée — l'endroit exact où en est le projet. */
export function currentStepOf(client: Client) {
  const pending = client.timeline.find((step) => !step.done)
  if (!pending) return null
  return STEP_BY_KEY.get(pending.key) ?? null
}

/** Libellé de phase affiché à côté du statut — ex. « Développement ». */
export function phaseLabelOf(client: Client): string {
  const step = currentStepOf(client)
  if (!step) return 'Livré'
  return step.phase
}

export function isStepDone(client: Client, key: StepKey): boolean {
  return client.timeline.find((step) => step.key === key)?.done ?? false
}

export function stepDoneAt(client: Client, key: StepKey): string | null {
  return client.timeline.find((step) => step.key === key)?.doneAt ?? null
}

/* ------------------------------------------------------------------ */
/* Argent                                                              */
/* ------------------------------------------------------------------ */

/** Montant signé mais pas encore encaissé. */
export function outstandingOf(client: Client): number {
  if (client.status === 'prospect') return 0
  const deposit = client.admin.depositReceivedAt ? 0 : client.admin.deposit
  const balance = client.admin.balanceReceivedAt ? 0 : client.admin.balance
  return deposit + balance
}

export function collectedOf(client: Client): number {
  const deposit = client.admin.depositReceivedAt ? client.admin.deposit : 0
  const balance = client.admin.balanceReceivedAt ? client.admin.balance : 0
  return deposit + balance
}

/** Revenu récurrent mensualisé (maintenance + hébergement lissé). */
export function recurringOf(client: Client): number {
  const maintenance = client.admin.maintenanceActive ? client.admin.maintenanceMonthly : 0
  const hosting = client.admin.hostingActive ? client.admin.hostingYearly / 12 : 0
  return maintenance + hosting
}

/* ------------------------------------------------------------------ */
/* Contenus, corrections, livraison                                    */
/* ------------------------------------------------------------------ */

export function missingResourcesOf(client: Client) {
  return client.resources.filter((item) => item.status === 'manquant')
}

export function pendingResourcesOf(client: Client) {
  return client.resources.filter((item) => item.status === 'attente')
}

export function openCorrectionsOf(client: Client) {
  return client.validation.corrections.filter((item) => item.status !== 'termine')
}

export function deliveryProgressOf(client: Client): { done: number; total: number; ready: boolean } {
  const done = client.delivery.filter((item) => item.done).length
  const total = client.delivery.length
  return { done, total, ready: total > 0 && done === total }
}

/* ------------------------------------------------------------------ */
/* Actions & blocages                                                  */
/* ------------------------------------------------------------------ */

export type ActionSeverity = 'critique' | 'important' | 'a_suivre' | 'pret'

export const SEVERITY_RANK: Record<ActionSeverity, number> = {
  critique: 0,
  pret: 1,
  important: 2,
  a_suivre: 3,
}

export const SEVERITY_LABEL: Record<ActionSeverity, string> = {
  critique: 'Critique',
  pret: 'Prêt',
  important: 'Important',
  a_suivre: 'À suivre',
}

export type ClientAction = {
  id: string
  clientId: string
  clientName: string
  severity: ActionSeverity
  title: string
  detail: string
  /** Onglet de la fiche client à ouvrir pour traiter l'action. */
  tab: string
}

const LIVE_STATUSES: DossierStatus[] = ['actif', 'attente_client', 'production']

/**
 * Ce qui bloque, ce qui coûte de l'argent, ce qui attend une action.
 * L'ordre des règles reflète la priorité réelle d'une agence : l'argent et les
 * engagements de date d'abord, le confort ensuite.
 */
export function actionsOf(client: Client): ClientAction[] {
  const actions: ClientAction[] = []
  const add = (
    id: string,
    severity: ActionSeverity,
    title: string,
    detail: string,
    tab: string,
  ) => {
    actions.push({
      id: `${client.id}:${id}`,
      clientId: client.id,
      clientName: client.company.name,
      severity,
      title,
      detail,
      tab,
    })
  }

  const progress = progressOf(client)
  const delivery = deliveryProgressOf(client)
  const delivered = isStepDone(client, 'livraison')

  // — Argent —
  if (client.status !== 'prospect' && client.admin.deposit > 0 && !client.admin.depositReceivedAt) {
    add('acompte', 'critique', 'Acompte non reçu', 'Le projet ne doit pas avancer avant encaissement.', 'admin')
  }
  if (delivery.ready && client.admin.balance > 0 && !client.admin.balanceReceivedAt) {
    add('solde', 'critique', 'Solde non reçu', 'Le solde se règle avant la mise en ligne.', 'admin')
  }
  if (client.status !== 'prospect' && !client.admin.contractSigned) {
    add('contrat', 'important', 'Contrat non signé', 'Aucun document ne sécurise le périmètre.', 'admin')
  }

  // — Dates —
  const remaining = daysUntil(client.deadline)
  if (remaining !== null && !delivered && client.status !== 'maintenance') {
    if (remaining < 0) {
      add('retard', 'critique', `Deadline dépassée de ${Math.abs(remaining)} j`, 'Reprogrammer ou prévenir le client aujourd’hui.', 'suivi')
    } else if (remaining <= 7 && progress < 85) {
      add('echeance', 'important', `Livraison dans ${remaining} j`, `Projet à ${progress} % — l’échéance est serrée.`, 'suivi')
    }
  }

  // — Contenus —
  const missing = missingResourcesOf(client)
  if (missing.length > 0 && !isStepDone(client, 'livraison')) {
    add(
      'contenus',
      'important',
      `${missing.length} élément${missing.length > 1 ? 's' : ''} manquant${missing.length > 1 ? 's' : ''}`,
      missing.map((item) => item.label).join(', '),
      'projet',
    )
  }

  // — Corrections —
  const open = openCorrectionsOf(client)
  if (open.length > 0) {
    const urgent = open.some((item) => item.priority === 'haute')
    add(
      'corrections',
      urgent ? 'important' : 'a_suivre',
      `${open.length} correction${open.length > 1 ? 's' : ''} en cours`,
      urgent ? 'Dont au moins une en priorité haute.' : 'Retours client à traiter.',
      'suivi',
    )
  }

  // — Relances —
  if (client.status === 'attente_client') {
    const waiting = daysSince(client.lastActivityAt) ?? 0
    if (waiting >= 3) {
      add('relance', 'important', `Sans réponse depuis ${waiting} j`, 'Relancer le client pour débloquer le projet.', 'vue')
    }
  }
  if (client.status === 'prospect') {
    const age = daysSince(client.createdAt) ?? 0
    if (age >= 3) {
      add('prospect', 'important', `Prospect ouvert depuis ${age} j`, 'Envoyer la proposition ou clôturer le dossier.', 'brief')
    }
  }

  // — Livraison —
  if (delivery.ready && !delivered) {
    add('pret', 'pret', 'Projet prêt à être livré 🚀', 'Checklist finale complète — reste la mise en ligne.', 'livraison')
  }
  if (!delivery.ready && isStepDone(client, 'validation_finale') && !delivered) {
    add(
      'checklist',
      'a_suivre',
      `Checklist de livraison ${delivery.done}/${delivery.total}`,
      'Vérifications finales avant mise en ligne.',
      'livraison',
    )
  }

  // — Après livraison —
  if (delivered) {
    const since = daysSince(stepDoneAt(client, 'livraison')) ?? 0
    if (!client.followUp.j1Done) {
      add('j1', 'a_suivre', 'Suivi J+1 à faire', 'Un appel le lendemain change la perception du projet.', 'livraison')
    } else if (!client.followUp.j7Done && since >= 7) {
      add('j7', 'a_suivre', 'Suivi J+7 à faire', 'Vérifier que tout tourne une semaine après.', 'livraison')
    }
    if (!client.followUp.reviewRequested) {
      add('avis', 'a_suivre', 'Avis client non demandé', 'Le meilleur moment, c’est juste après la livraison.', 'livraison')
    }
  }

  return actions.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** La seule phrase qui compte sur une carte client. */
export function nextActionOf(client: Client): { label: string; severity: ActionSeverity | null } {
  const actions = actionsOf(client).filter((action) => action.severity !== 'pret')
  if (actions.length > 0) return { label: actions[0].title, severity: actions[0].severity }

  const ready = actionsOf(client).find((action) => action.severity === 'pret')
  if (ready) return { label: ready.title, severity: 'pret' }

  const step = currentStepOf(client)
  if (!step) return { label: 'Projet livré — rien à faire', severity: null }
  return { label: `Étape suivante : ${step.label}`, severity: null }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type Kpis = {
  prospects: number
  clientsActifs: number
  projetsEnCours: number
  projetsLivres: number
  attenteClient: number
  caEnCours: number
  paiementsEnAttente: number
  recurrentMensuel: number
}

export function kpisOf(clients: Client[]): Kpis {
  const live = clients.filter((client) => LIVE_STATUSES.includes(client.status))

  return {
    prospects: clients.filter((client) => client.status === 'prospect').length,
    clientsActifs: clients.filter((client) => client.status !== 'prospect' && client.status !== 'livre').length,
    projetsEnCours: live.length,
    projetsLivres: clients.filter((client) => isStepDone(client, 'livraison')).length,
    attenteClient: clients.filter((client) => client.status === 'attente_client').length,
    caEnCours: live.reduce((sum, client) => sum + client.admin.total, 0),
    paiementsEnAttente: clients.reduce((sum, client) => sum + outstandingOf(client), 0),
    recurrentMensuel: Math.round(clients.reduce((sum, client) => sum + recurringOf(client), 0)),
  }
}

/** Échéances à venir, du plus urgent au plus lointain. */
export function upcomingDeadlines(clients: Client[], limit = 6) {
  return clients
    .filter((client) => client.deadline && !isStepDone(client, 'livraison'))
    .map((client) => ({
      client,
      days: daysUntil(client.deadline) ?? 0,
      progress: progressOf(client),
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
}

/** Le fil « qu'est-ce que je dois faire maintenant ? ». */
export function priorityFeed(clients: Client[], limit = 8): ClientAction[] {
  return clients
    .flatMap((client) => actionsOf(client))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, limit)
}

/** Projets en cours, les plus avancés d'abord. */
export function activeProjects(clients: Client[]) {
  return clients
    .filter((client) => LIVE_STATUSES.includes(client.status))
    .map((client) => ({ client, progress: progressOf(client) }))
    .sort((a, b) => b.progress - a.progress)
}

/* ------------------------------------------------------------------ */
/* Recherche & filtres                                                 */
/* ------------------------------------------------------------------ */

export function matchesQuery(client: Client, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    client.company.name,
    client.company.sector,
    client.contact.firstName,
    client.contact.lastName,
    client.contact.email,
    client.projectName,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}
