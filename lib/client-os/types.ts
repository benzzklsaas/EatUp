/**
 * BK Labs — Client OS · Modèle de données
 * ---------------------------------------
 * Une seule source de vérité pour le domaine métier.
 *
 * Le modèle est volontairement « base de données ready » : chaque entité a un
 * `id` stable, des dates ISO, et des relations par identifiant. Le passage d'un
 * stockage local (V1) à Postgres / Supabase (V2) se fait sans réécrire l'UI —
 * voir `lib/client-os/schema.sql` pour le schéma SQL correspondant.
 */

/** Date seule, format `YYYY-MM-DD`. */
export type ISODate = string
/** Horodatage complet, format ISO 8601. */
export type ISODateTime = string
/** Montant en euros. */
export type Euro = number

/* ------------------------------------------------------------------ */
/* Cycle de vie                                                        */
/* ------------------------------------------------------------------ */

/** Statut du dossier — sert aussi de filtre dans la liste des clients. */
export type DossierStatus =
  | 'prospect'
  | 'actif'
  | 'attente_client'
  | 'production'
  | 'livre'
  | 'maintenance'

/** Type de solution vendue. */
export type SolutionType =
  | 'site_vitrine'
  | 'ecommerce'
  | 'app_mobile'
  | 'saas'
  | 'automatisation'
  | 'outil_interne'
  | 'refonte'
  | 'autre'

/** Les 12 étapes du process BK Labs, du premier euro à la livraison. */
export type StepKey =
  | 'acompte'
  | 'cadrage'
  | 'contenus'
  | 'conception'
  | 'design_valide'
  | 'developpement'
  | 'v1'
  | 'retours'
  | 'corrections'
  | 'validation_finale'
  | 'solde'
  | 'livraison'

export type TimelineStep = {
  key: StepKey
  done: boolean
  doneAt: ISODate | null
}

/* ------------------------------------------------------------------ */
/* Blocs de la fiche client                                            */
/* ------------------------------------------------------------------ */

export type Contact = {
  firstName: string
  lastName: string
  role: string
  phone: string
  email: string
}

export type CompanyInfo = {
  name: string
  sector: string
  employees: string
  area: string
  website: string
  socials: string
  address: string
}

/** Premier appel / découverte — champs libres, réponses longues. */
export type Discovery = {
  callDate: ISODate | null
  reason: string
  need: string
  currentSituation: string
  currentTools: string
  problems: string
  mainGoal: string
  secondaryGoals: string
  expectedOutcome: string
}

/** Analyse BK Labs — le diagnostic interne, pas les mots du client. */
export type Analysis = {
  diagnostic: string
  mainProblem: string
  opportunities: string
  solution: string
  justification: string
  solutionTypes: SolutionType[]
  solutionTypeOther: string
}

export type ScopeItem = { id: string; label: string }

/** Périmètre — ce qui est vendu, et surtout ce qui ne l'est pas. */
export type Scope = {
  deliverables: ScopeItem[]
  features: ScopeItem[]
  screens: ScopeItem[]
  exclusions: ScopeItem[]
}

export type ResourceStatus = 'recu' | 'attente' | 'manquant'

export type ResourceItem = {
  id: string
  label: string
  status: ResourceStatus
  note: string
}

export type MainAction =
  | 'appeler'
  | 'formulaire'
  | 'acheter'
  | 'rdv'
  | 'devis'
  | 'telecharger'
  | 'inscription'
  | 'autre'

export type CreativeDirection = {
  brandImage: string
  style: string
  colors: string
  references: string
  likedSites: string
  avoidSites: string
  targetAudience: string
  mainUserProfile: string
  mainAction: MainAction | null
  mainActionOther: string
}

export type CorrectionStatus = 'a_faire' | 'en_cours' | 'termine'
export type Priority = 'basse' | 'normale' | 'haute'

export type Correction = {
  id: string
  area: string
  description: string
  status: CorrectionStatus
  priority: Priority
  createdAt: ISODate
}

export type Validation = {
  v1SentAt: ISODate | null
  v1Comment: string
  clientFeedback: string
  corrections: Correction[]
}

export type Admin = {
  total: Euro
  deposit: Euro
  depositReceivedAt: ISODate | null
  balance: Euro
  balanceReceivedAt: ISODate | null
  contractSigned: boolean
  contractSignedAt: ISODate | null
  maintenanceActive: boolean
  maintenanceMonthly: Euro
  hostingActive: boolean
  hostingYearly: Euro
  invoices: Invoice[]
}

export type ChecklistItem = {
  id: string
  label: string
  done: boolean
}

export type OpportunityStatus = 'identifiee' | 'proposee' | 'signee' | 'refusee'

export type Opportunity = {
  id: string
  label: string
  status: OpportunityStatus
}

/** Après livraison — la partie que les agences oublient toujours. */
export type FollowUp = {
  j1Done: boolean
  j1At: ISODate | null
  j7Done: boolean
  j7At: ISODate | null
  reviewRequested: boolean
  reviewReceived: boolean
  opportunities: Opportunity[]
}

export type Note = {
  id: string
  body: string
  createdAt: ISODateTime
  authorId: string
}

export type HistoryStatus = 'fait' | 'en_cours' | 'prevu'

export type HistoryEvent = {
  id: string
  date: ISODate
  step: string
  action: string
  ownerId: string
  status: HistoryStatus
  /** `true` si l'événement a été généré par l'app plutôt que saisi à la main. */
  auto?: boolean
  /** Clé de rattachement (ex. `step:design_valide`) pour pouvoir le retirer. */
  ref?: string
}

/* ------------------------------------------------------------------ */
/* Entité principale                                                   */
/* ------------------------------------------------------------------ */

export type Client = {
  id: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  lastActivityAt: ISODateTime

  /** Responsable BK Labs du dossier. */
  ownerId: string

  company: CompanyInfo
  contact: Contact

  /** Intitulé commercial du projet — ex. « Site vitrine premium ». */
  projectName: string
  status: DossierStatus
  deadline: ISODate | null

  discovery: Discovery
  analysis: Analysis
  scope: Scope
  resources: ResourceItem[]
  creative: CreativeDirection
  timeline: TimelineStep[]
  validation: Validation
  admin: Admin
  delivery: ChecklistItem[]
  followUp: FollowUp
  notes: Note[]
  history: HistoryEvent[]
}

/* ------------------------------------------------------------------ */
/* Préparé pour la V2 (multi-utilisateurs, documents, tâches…)         */
/* ------------------------------------------------------------------ */

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  initials: string
}

export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'retard'

export type Invoice = {
  id: string
  number: string
  label: string
  amount: Euro
  status: InvoiceStatus
  issuedAt: ISODate | null
  dueAt: ISODate | null
  paidAt: ISODate | null
}

/** Non utilisé en V1 — la table et le type existent pour la suite. */
export type Document = {
  id: string
  clientId: string
  name: string
  kind: 'contrat' | 'facture' | 'brief' | 'design' | 'autre'
  url: string
  uploadedAt: ISODateTime
  uploadedBy: string
}

/** Non utilisé en V1 — préparé pour le module tâches / calendrier. */
export type Task = {
  id: string
  clientId: string
  title: string
  done: boolean
  dueAt: ISODate | null
  assigneeId: string | null
}

/** Non utilisé en V1 — préparé pour les commentaires collaboratifs. */
export type Comment = {
  id: string
  entityType: 'client' | 'correction' | 'task'
  entityId: string
  body: string
  authorId: string
  createdAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Racine du stockage                                                  */
/* ------------------------------------------------------------------ */

export type Workspace = {
  /** Version du schéma — permet les migrations de données locales. */
  version: number
  users: User[]
  clients: Client[]
  updatedAt: ISODateTime
}
