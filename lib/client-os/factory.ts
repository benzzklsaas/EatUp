/**
 * BK Labs — Client OS · Fabrique de dossiers
 * ------------------------------------------
 * Un dossier client est toujours créé complet : toutes les sections existent
 * dès la première seconde, même vides. L'UI n'a donc jamais à gérer de champ
 * absent, et l'onboarding ne remplit qu'une petite partie de la structure.
 */

import {
  DELIVERY_TEMPLATE,
  OPPORTUNITY_TEMPLATE,
  PROJECT_STEPS,
  RESOURCE_TEMPLATE,
} from './constants'
import { nowISO } from './format'
import type {
  ChecklistItem,
  Client,
  DossierStatus,
  ISODate,
  Opportunity,
  ResourceItem,
  SolutionType,
  TimelineStep,
} from './types'

/** Identifiant court, lisible dans une URL, sans dépendance externe. */
export function makeId(prefix = 'id'): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}_${random}`
}

export function emptyTimeline(): TimelineStep[] {
  return PROJECT_STEPS.map((step) => ({ key: step.key, done: false, doneAt: null }))
}

export function emptyResources(): ResourceItem[] {
  return RESOURCE_TEMPLATE.map((label) => ({
    id: makeId('res'),
    label,
    status: 'attente' as const,
    note: '',
  }))
}

export function emptyDelivery(): ChecklistItem[] {
  return DELIVERY_TEMPLATE.map((label) => ({ id: makeId('del'), label, done: false }))
}

export function emptyOpportunities(): Opportunity[] {
  return OPPORTUNITY_TEMPLATE.map((label) => ({
    id: makeId('opp'),
    label,
    status: 'identifiee' as const,
  }))
}

export type NewClientInput = {
  id?: string
  companyName: string
  sector?: string
  employees?: string
  area?: string
  website?: string
  socials?: string
  address?: string
  firstName?: string
  lastName?: string
  role?: string
  phone?: string
  email?: string
  projectName?: string
  solutionTypes?: SolutionType[]
  status?: DossierStatus
  deadline?: ISODate | null
  total?: number
  deposit?: number
  reason?: string
  mainGoal?: string
  expectedOutcome?: string
  ownerId?: string
}

/** Construit un dossier complet à partir du strict minimum saisi. */
export function createClient(input: NewClientInput): Client {
  const now = nowISO()
  const total = input.total ?? 0
  const deposit = input.deposit ?? (total ? Math.round(total * 0.4) : 0)

  return {
    id: input.id ?? makeId('cli'),
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    ownerId: input.ownerId ?? 'usr_bk',

    company: {
      name: input.companyName.trim(),
      sector: input.sector ?? '',
      employees: input.employees ?? '',
      area: input.area ?? '',
      website: input.website ?? '',
      socials: input.socials ?? '',
      address: input.address ?? '',
    },
    contact: {
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      role: input.role ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
    },

    projectName: input.projectName ?? '',
    status: input.status ?? 'prospect',
    deadline: input.deadline ?? null,

    discovery: {
      callDate: null,
      reason: input.reason ?? '',
      need: '',
      currentSituation: '',
      currentTools: '',
      problems: '',
      mainGoal: input.mainGoal ?? '',
      secondaryGoals: '',
      expectedOutcome: input.expectedOutcome ?? '',
    },
    analysis: {
      diagnostic: '',
      mainProblem: '',
      opportunities: '',
      solution: '',
      justification: '',
      solutionTypes: input.solutionTypes ?? [],
      solutionTypeOther: '',
    },
    scope: {
      deliverables: [],
      features: [],
      screens: [],
      exclusions: [],
    },
    resources: emptyResources(),
    creative: {
      brandImage: '',
      style: '',
      colors: '',
      references: '',
      likedSites: '',
      avoidSites: '',
      targetAudience: '',
      mainUserProfile: '',
      mainAction: null,
      mainActionOther: '',
    },
    timeline: emptyTimeline(),
    validation: {
      v1SentAt: null,
      v1Comment: '',
      clientFeedback: '',
      corrections: [],
    },
    admin: {
      total,
      deposit,
      depositReceivedAt: null,
      balance: Math.max(0, total - deposit),
      balanceReceivedAt: null,
      contractSigned: false,
      contractSignedAt: null,
      maintenanceActive: false,
      maintenanceMonthly: 0,
      hostingActive: false,
      hostingYearly: 0,
      invoices: [],
    },
    delivery: emptyDelivery(),
    followUp: {
      j1Done: false,
      j1At: null,
      j7Done: false,
      j7At: null,
      reviewRequested: false,
      reviewReceived: false,
      opportunities: emptyOpportunities(),
    },
    notes: [],
    history: [
      {
        id: makeId('evt'),
        date: now.slice(0, 10),
        step: 'Création',
        action: 'Dossier créé dans Client OS',
        ownerId: input.ownerId ?? 'usr_bk',
        status: 'fait',
      },
    ],
  }
}
