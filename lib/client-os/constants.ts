/**
 * BK Labs — Client OS · Référentiels
 * ----------------------------------
 * Libellés, options et gabarits de checklists. Tout ce qui est « métier figé »
 * vit ici pour qu'une évolution du process BK Labs se fasse en un seul endroit.
 */

import type {
  CorrectionStatus,
  DossierStatus,
  MainAction,
  Priority,
  ResourceStatus,
  SolutionType,
  StepKey,
} from './types'

/* ------------------------------------------------------------------ */
/* Statuts de dossier                                                  */
/* ------------------------------------------------------------------ */

export const DOSSIER_STATUS: Record<
  DossierStatus,
  { label: string; short: string; tone: 'neutral' | 'info' | 'warn' | 'progress' | 'success' | 'muted' }
> = {
  prospect: { label: 'Prospect', short: 'Prospect', tone: 'neutral' },
  actif: { label: 'Client actif', short: 'Actif', tone: 'info' },
  attente_client: { label: 'En attente client', short: 'Attente client', tone: 'warn' },
  production: { label: 'En production', short: 'Production', tone: 'progress' },
  livre: { label: 'Livré', short: 'Livré', tone: 'success' },
  maintenance: { label: 'Maintenance', short: 'Maintenance', tone: 'muted' },
}

export const DOSSIER_STATUS_ORDER: DossierStatus[] = [
  'prospect',
  'actif',
  'attente_client',
  'production',
  'livre',
  'maintenance',
]

/* ------------------------------------------------------------------ */
/* Types de solution                                                   */
/* ------------------------------------------------------------------ */

export const SOLUTION_TYPES: Record<SolutionType, string> = {
  site_vitrine: 'Site vitrine',
  ecommerce: 'E-commerce',
  app_mobile: 'Application mobile',
  saas: 'Logiciel / SaaS',
  automatisation: 'Automatisation',
  outil_interne: 'Outil interne',
  refonte: 'Refonte',
  autre: 'Autre',
}

export const SOLUTION_TYPE_ORDER: SolutionType[] = [
  'site_vitrine',
  'ecommerce',
  'app_mobile',
  'saas',
  'automatisation',
  'outil_interne',
  'refonte',
  'autre',
]

/* ------------------------------------------------------------------ */
/* Planning — les 12 étapes                                            */
/* ------------------------------------------------------------------ */

/**
 * Chaque étape porte un poids : une progression honnête ne peut pas traiter
 * « acompte reçu » et « développement » de la même façon. La somme fait 100.
 * `phase` est le libellé affiché quand cette étape est l'étape en cours.
 */
export const PROJECT_STEPS: {
  key: StepKey
  label: string
  phase: string
  weight: number
  hint: string
}[] = [
  { key: 'acompte', label: 'Acompte reçu', phase: 'Acompte en attente', weight: 5, hint: 'Rien ne démarre avant l’acompte.' },
  { key: 'cadrage', label: 'Cadrage', phase: 'Cadrage', weight: 15, hint: 'Périmètre, objectifs et livrables verrouillés.' },
  { key: 'contenus', label: 'Contenus reçus', phase: 'Collecte des contenus', weight: 15, hint: 'Textes, images, accès — le blocage n°1 des projets.' },
  { key: 'conception', label: 'Conception', phase: 'Conception', weight: 15, hint: 'Arborescence, wireframes, direction créative.' },
  { key: 'design_valide', label: 'Design validé', phase: 'Validation du design', weight: 15, hint: 'Validation écrite du client avant le développement.' },
  { key: 'developpement', label: 'Développement', phase: 'Développement', weight: 15, hint: 'Intégration et fonctionnalités.' },
  { key: 'v1', label: 'V1 présentée', phase: 'Présentation V1', weight: 5, hint: 'Première version envoyée au client.' },
  { key: 'retours', label: 'Retours client', phase: 'Retours client', weight: 3, hint: 'Les retours sont consignés dans Validation.' },
  { key: 'corrections', label: 'Corrections', phase: 'Corrections', weight: 5, hint: 'Toutes les demandes traitées.' },
  { key: 'validation_finale', label: 'Validation finale', phase: 'Validation finale', weight: 3, hint: 'Accord écrit du client pour la mise en ligne.' },
  { key: 'solde', label: 'Solde reçu', phase: 'Solde en attente', weight: 2, hint: 'Le solde se règle avant la livraison.' },
  { key: 'livraison', label: 'Livraison', phase: 'Livraison', weight: 2, hint: 'Mise en ligne et transmission des accès.' },
]

export const STEP_BY_KEY = new Map(PROJECT_STEPS.map((s) => [s.key, s]))

/* ------------------------------------------------------------------ */
/* Contenus & ressources                                               */
/* ------------------------------------------------------------------ */

export const RESOURCE_TEMPLATE = [
  'Logo',
  'Charte graphique',
  'Photos',
  'Vidéos',
  'Textes',
  'Coordonnées',
  'Tarifs',
  'Témoignages',
  'Mentions légales',
  'Accès au domaine',
  'Accès aux outils existants',
] as const

export const RESOURCE_STATUS: Record<
  ResourceStatus,
  { label: string; tone: 'success' | 'warn' | 'danger' }
> = {
  recu: { label: 'Reçu', tone: 'success' },
  attente: { label: 'En attente', tone: 'warn' },
  manquant: { label: 'Manquant', tone: 'danger' },
}

/* ------------------------------------------------------------------ */
/* Direction créative                                                  */
/* ------------------------------------------------------------------ */

export const MAIN_ACTIONS: Record<MainAction, string> = {
  appeler: 'Appeler',
  formulaire: 'Envoyer un formulaire',
  acheter: 'Acheter',
  rdv: 'Prendre rendez-vous',
  devis: 'Demander un devis',
  telecharger: 'Télécharger',
  inscription: 'S’inscrire',
  autre: 'Autre',
}

export const MAIN_ACTION_ORDER: MainAction[] = [
  'appeler',
  'formulaire',
  'acheter',
  'rdv',
  'devis',
  'telecharger',
  'inscription',
  'autre',
]

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export const CORRECTION_STATUS: Record<
  CorrectionStatus,
  { label: string; tone: 'warn' | 'info' | 'success' }
> = {
  a_faire: { label: 'À faire', tone: 'warn' },
  en_cours: { label: 'En cours', tone: 'info' },
  termine: { label: 'Terminé', tone: 'success' },
}

export const PRIORITIES: Record<Priority, { label: string }> = {
  basse: { label: 'Basse' },
  normale: { label: 'Normale' },
  haute: { label: 'Haute' },
}

export const PRIORITY_ORDER: Priority[] = ['haute', 'normale', 'basse']

/* ------------------------------------------------------------------ */
/* Livraison                                                           */
/* ------------------------------------------------------------------ */

export const DELIVERY_TEMPLATE = [
  'Desktop vérifié',
  'Mobile vérifié',
  'Tablette vérifiée',
  'Liens vérifiés',
  'Formulaires vérifiés',
  'Emails vérifiés',
  'Images optimisées',
  'SEO de base',
  'Favicon',
  'Metadata',
  'Performance',
  'Domaine',
  'Hébergement',
  'Sauvegarde',
  'Accès transmis au client',
] as const

/* ------------------------------------------------------------------ */
/* Après livraison                                                     */
/* ------------------------------------------------------------------ */

export const OPPORTUNITY_TEMPLATE = [
  'Maintenance',
  'Hébergement',
  'SEO',
  'Nouvelle fonctionnalité',
  'Nouvelle page',
  'Application',
  'Automatisation',
] as const

export const OPPORTUNITY_STATUS = {
  identifiee: { label: 'Identifiée', tone: 'neutral' },
  proposee: { label: 'Proposée', tone: 'info' },
  signee: { label: 'Signée', tone: 'success' },
  refusee: { label: 'Refusée', tone: 'muted' },
} as const

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = 'bklabs.client-os.workspace'
export const SCHEMA_VERSION = 1

export const PRODUCT_NAME = 'Client OS'
export const PRODUCT_OWNER = 'BK Labs'
export const PRODUCT_TAGLINE = 'From first call to final delivery.'
