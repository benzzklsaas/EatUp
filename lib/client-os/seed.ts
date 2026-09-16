/**
 * BK Labs — Client OS · Données de démonstration
 * ----------------------------------------------
 * Six dossiers fictifs mais cohérents, couvrant tout le cycle : un prospect,
 * un cadrage qui démarre, un projet bloqué côté client, un projet en
 * développement, une livraison récente et un client en maintenance.
 *
 * Toutes les dates sont relatives à aujourd'hui : la démo ne périme jamais.
 */

import { createClient, makeId, type NewClientInput } from './factory'
import { today } from './format'
import type {
  Client,
  Correction,
  HistoryEvent,
  ISODate,
  Note,
  ResourceStatus,
  ScopeItem,
  StepKey,
  User,
} from './types'

/* ------------------------------------------------------------------ */
/* Utilitaires de construction                                         */
/* ------------------------------------------------------------------ */

/** Date décalée de `offset` jours par rapport à aujourd'hui. */
function d(offset: number): ISODate {
  const base = new Date(`${today()}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() + offset)
  return base.toISOString().slice(0, 10)
}

function ts(offset: number): string {
  return `${d(offset)}T09:30:00.000Z`
}

function item(label: string): ScopeItem {
  return { id: makeId('scp'), label }
}

function items(labels: string[]): ScopeItem[] {
  return labels.map(item)
}

/** Coche les étapes du planning et leur associe une date. */
function completeSteps(client: Client, done: Partial<Record<StepKey, number>>): void {
  client.timeline = client.timeline.map((step) =>
    done[step.key] !== undefined ? { ...step, done: true, doneAt: d(done[step.key]!) } : step,
  )
}

/** Force le statut d'un élément de la checklist contenus. */
function setResource(client: Client, label: string, status: ResourceStatus, note = ''): void {
  const found = client.resources.find((resource) => resource.label === label)
  if (found) {
    found.status = status
    found.note = note
  }
}

function markResources(client: Client, statuses: Record<string, [ResourceStatus, string?]>): void {
  client.resources.forEach((resource) => {
    resource.status = 'recu'
  })
  Object.entries(statuses).forEach(([label, [status, note]]) => setResource(client, label, status, note))
}

/** Retire de la checklist un élément hors périmètre — plutôt que de le
 *  marquer « manquant », ce qui le ferait remonter comme un blocage. */
function dropResources(client: Client, labels: string[]): void {
  client.resources = client.resources.filter((resource) => !labels.includes(resource.label))
}

function completeDelivery(client: Client, count?: number): void {
  const limit = count ?? client.delivery.length
  client.delivery = client.delivery.map((entry, index) => ({ ...entry, done: index < limit }))
}

function note(body: string, offset: number): Note {
  return { id: makeId('note'), body, createdAt: ts(offset), authorId: 'usr_bk' }
}

function event(offset: number, step: string, action: string, status: HistoryEvent['status'] = 'fait'): HistoryEvent {
  return { id: makeId('evt'), date: d(offset), step, action, ownerId: 'usr_bk', status }
}

function correction(
  area: string,
  description: string,
  status: Correction['status'],
  priority: Correction['priority'],
  offset: number,
): Correction {
  return { id: makeId('cor'), area, description, status, priority, createdAt: d(offset) }
}

function build(input: NewClientInput, decorate: (client: Client) => void): Client {
  const client = createClient(input)
  decorate(client)
  client.history.sort((a, b) => a.date.localeCompare(b.date))
  return client
}

/* ------------------------------------------------------------------ */
/* Équipe                                                              */
/* ------------------------------------------------------------------ */

export const SEED_USERS: User[] = [
  { id: 'usr_bk', name: 'Ben Kacel', email: 'ben@bklabs.fr', role: 'owner', initials: 'BK' },
]

/* ------------------------------------------------------------------ */
/* Dossiers                                                            */
/* ------------------------------------------------------------------ */

function dprPeinture(): Client {
  return build(
    {
      id: 'cli_dpr_peinture',
      companyName: 'DPR Peinture',
      sector: 'Peinture & rénovation intérieure',
      employees: '6',
      area: 'Lyon et 30 km alentour',
      website: 'dpr-peinture.fr',
      socials: 'instagram.com/dpr.peinture',
      address: '12 rue des Charmettes, 69006 Lyon',
      firstName: 'Damien',
      lastName: 'Pruvost',
      role: 'Gérant',
      phone: '06 71 44 08 92',
      email: 'damien@dpr-peinture.fr',
      projectName: 'Site vitrine premium',
      solutionTypes: ['site_vitrine'],
      status: 'production',
      deadline: d(8),
      total: 4200,
      deposit: 1680,
    },
    (client) => {
      client.createdAt = ts(-38)
      client.updatedAt = ts(-1)
      client.lastActivityAt = ts(-1)

      client.discovery = {
        callDate: d(-38),
        reason:
          'Recommandé par un confrère. Il perd des chantiers face à des concurrents moins bons mais mieux présentés en ligne.',
        need:
          'Un site vitrine crédible qui montre la qualité des finitions et permet de demander un devis en deux clics.',
        currentSituation:
          'Une page Facebook mise à jour irrégulièrement et une fiche Google sans photos récentes. Aucun site.',
        currentTools: 'Facebook, Google Business Profile, devis manuels sur Word.',
        problems:
          'Aucune preuve de qualité en ligne, devis demandés par téléphone uniquement, pas de trace des chantiers réalisés.',
        mainGoal: 'Générer 5 à 8 demandes de devis qualifiées par mois.',
        secondaryGoals:
          'Rassurer avant le premier rendez-vous, recruter plus facilement, arrêter de répondre 10 fois aux mêmes questions.',
        expectedOutcome:
          'Un site que Damien peut envoyer par SMS après un appel et qui fait gagner la décision à sa place.',
      }

      client.analysis = {
        diagnostic:
          'Problème de perception, pas de demande. Le carnet de commandes existe, mais les chantiers à forte marge partent chez des concurrents mieux présentés.',
        mainProblem:
          'Aucune preuve visuelle exploitable : le travail est excellent, invisible en ligne.',
        opportunities:
          'Portfolio avant / après, page dédiée aux prestations premium, formulaire de devis structuré qui pré-qualifie le chantier.',
        solution:
          'Site vitrine 6 pages, orienté preuve et conversion, avec formulaire de devis en 4 étapes et galerie de chantiers.',
        justification:
          'Un e-commerce ou un outil de gestion n’apporterait rien ici : le blocage est la crédibilité, pas la vente en ligne.',
        solutionTypes: ['site_vitrine'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items([
          'Site vitrine 6 pages responsive',
          'Séance photo de 2 chantiers (prestataire partenaire)',
          'Rédaction des textes des 6 pages',
          'Formation à la mise à jour (1 h en visio)',
        ]),
        features: items([
          'Formulaire de devis en 4 étapes',
          'Galerie avant / après filtrable',
          'Bouton d’appel direct en mobile',
          'Fiche Google connectée',
        ]),
        screens: items(['Accueil', 'Prestations', 'Réalisations', 'À propos', 'Devis', 'Contact']),
        exclusions: items([
          'Rédaction d’articles de blog',
          'Gestion des réseaux sociaux',
          'Campagnes publicitaires',
          'Espace client / suivi de chantier',
        ]),
      }

      markResources(client, {
        'Témoignages': ['attente', '3 clients contactés, 1 réponse reçue'],
      })
      dropResources(client, ['Vidéos'])

      client.creative = {
        brandImage: 'Artisan haut de gamme, précis, propre. Loin de l’image « peintre en bâtiment » classique.',
        style: 'Épuré, beaucoup de blanc, photos plein cadre, typographie affirmée.',
        colors: 'Noir, blanc cassé, un bleu profond en accent (repris du logo).',
        references: 'Sites d’architectes d’intérieur, studios de design italiens.',
        likedSites: 'atelier-vime.com, studiomcgee.com',
        avoidSites: 'Sites d’artisans avec fond dégradé bleu et images de banque d’images.',
        targetAudience: 'Propriétaires de maisons individuelles 40–65 ans, budget rénovation 8–40 k€.',
        mainUserProfile: 'Particulier en pleine rénovation, compare 3 devis, cherche à se rassurer.',
        mainAction: 'devis',
        mainActionOther: '',
      }

      completeSteps(client, {
        acompte: -35,
        cadrage: -31,
        contenus: -22,
        conception: -14,
        design_valide: -6,
      })

      client.validation = {
        v1SentAt: null,
        v1Comment: '',
        clientFeedback: '',
        corrections: [],
      }

      client.admin.depositReceivedAt = d(-35)
      client.admin.contractSigned = true
      client.admin.contractSignedAt = d(-36)
      client.admin.maintenanceActive = true
      client.admin.maintenanceMonthly = 49
      client.admin.hostingActive = true
      client.admin.hostingYearly = 180

      client.notes = [
        note(
          'Damien valide vite mais répond mal aux mails — passer par SMS pour toute validation importante.',
          -30,
        ),
        note(
          'Risque identifié : les photos de chantier sont la clé du projet. Sans elles, le site perd tout son intérêt. Séance photo bloquée au ' +
            d(-22) +
            ', budget inclus dans le forfait.',
          -24,
        ),
        note('Design validé sans aucune retouche. Bon signe pour la suite, on garde le même parti pris sur la V1.', -6),
      ]

      client.history = [
        event(-38, 'Découverte', 'Appel découverte (45 min)'),
        event(-36, 'Proposition', 'Proposition commerciale envoyée — 4 200 €'),
        event(-36, 'Contrat', 'Contrat signé'),
        event(-35, 'Acompte', 'Acompte de 1 680 € reçu'),
        event(-31, 'Cadrage', 'Atelier de cadrage — périmètre verrouillé'),
        event(-22, 'Contenus', 'Séance photo réalisée, textes reçus'),
        event(-14, 'Conception', 'Arborescence et wireframes validés'),
        event(-6, 'Design', 'Maquettes validées sans retouche'),
        event(-1, 'Développement', 'Intégration Accueil et Prestations', 'en_cours'),
        event(8, 'Livraison', 'Mise en ligne prévue', 'prevu'),
      ]
    },
  )
}

function girelElectriques(): Client {
  return build(
    {
      id: 'cli_girel_electriques',
      companyName: 'Girel Électriques',
      sector: 'Électricité générale & domotique',
      employees: '11',
      area: 'Annecy, Haute-Savoie',
      website: 'girel-elec.fr (site WordPress de 2016)',
      socials: 'linkedin.com/company/girel-electriques',
      address: '4 avenue du Rhône, 74000 Annecy',
      firstName: 'Sophie',
      lastName: 'Girel',
      role: 'Co-gérante',
      phone: '06 12 90 33 17',
      email: 's.girel@girel-elec.fr',
      projectName: 'Site vitrine + espace recrutement',
      solutionTypes: ['site_vitrine'],
      status: 'attente_client',
      deadline: d(26),
      total: 3400,
      deposit: 1360,
    },
    (client) => {
      client.createdAt = ts(-27)
      client.updatedAt = ts(-6)
      client.lastActivityAt = ts(-6)

      client.discovery = {
        callDate: d(-27),
        reason: 'Le site actuel date de 2016, ne s’affiche pas correctement sur mobile et n’est plus modifiable.',
        need: 'Un site moderne avec une vraie page recrutement : le vrai sujet, c’est de trouver des électriciens.',
        currentSituation: 'WordPress abandonné, plus d’accès à l’hébergeur, agence d’origine injoignable.',
        currentTools: 'WordPress, Indeed pour le recrutement, Excel pour le suivi des chantiers.',
        problems:
          'Site illisible sur mobile, aucune candidature spontanée, image d’entreprise en décalage avec la réalité (11 salariés, gros chantiers tertiaires).',
        mainGoal: 'Recevoir des candidatures spontanées qualifiées.',
        secondaryGoals: 'Rassurer les donneurs d’ordre tertiaires, récupérer la main sur le domaine.',
        expectedOutcome: 'Un site que les candidats et les architectes prennent au sérieux.',
      }

      client.analysis = {
        diagnostic:
          'Le besoin exprimé est un site. Le besoin réel est le recrutement : chaque poste non pourvu coûte plus cher que le projet entier.',
        mainProblem: 'Aucune vitrine employeur — les candidats ne voient rien de l’entreprise avant de postuler.',
        opportunities:
          'Page « Nous rejoindre » avec parcours des équipes, formulaire de candidature simple, mise en avant des chantiers tertiaires.',
        solution: 'Site vitrine 5 pages avec espace recrutement dédié et récupération du domaine.',
        justification:
          'Investir sur le recrutement rentabilise le projet en un seul recrutement évité chez un cabinet.',
        solutionTypes: ['site_vitrine', 'refonte'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items([
          'Site vitrine 5 pages responsive',
          'Récupération du domaine et de l’hébergement',
          'Migration des contenus utiles de l’ancien site',
        ]),
        features: items([
          'Formulaire de candidature avec dépôt de CV',
          'Page chantiers de référence',
          'Formulaire de contact chantier',
        ]),
        screens: items(['Accueil', 'Expertises', 'Réalisations', 'Nous rejoindre', 'Contact']),
        exclusions: items(['Rédaction des offres d’emploi', 'Diffusion sur les jobboards', 'Suivi de candidatures']),
      }

      markResources(client, {
        'Témoignages': ['manquant', 'À récupérer auprès de 3 donneurs d’ordre'],
        'Photos': ['attente', 'Photos chantier tertiaire promises pour la semaine prochaine'],
        'Accès au domaine': ['attente', 'Transfert OVH lancé, en attente du code AUTH'],
      })
      dropResources(client, ['Vidéos'])

      client.creative = {
        brandImage: 'Entreprise solide, technique, humaine. Ni startup ni artisan isolé.',
        style: 'Sobre, structuré, photos d’équipe réelles, pas d’images d’illustration.',
        colors: 'Bleu nuit et jaune sécurité, repris de la signalétique des véhicules.',
        references: 'Sites de groupes d’ingénierie, pages carrières de PME industrielles.',
        likedSites: 'eiffage.com (page carrières)',
        avoidSites: 'Sites d’électriciens avec éclairs et fonds noirs.',
        targetAudience: 'Candidats électriciens 22–45 ans et donneurs d’ordre tertiaires.',
        mainUserProfile: 'Électricien expérimenté qui regarde l’entreprise avant de postuler.',
        mainAction: 'formulaire',
        mainActionOther: '',
      }

      completeSteps(client, { acompte: -24, cadrage: -19, contenus: -9 })

      client.admin.depositReceivedAt = d(-24)
      client.admin.contractSigned = true
      client.admin.contractSignedAt = d(-25)

      client.notes = [
        note(
          'Sophie est la décisionnaire, mais son associé valide les choix visuels. Toujours envoyer les maquettes aux deux.',
          -19,
        ),
        note(
          'Blocage : arborescence envoyée il y a 6 jours, aucune réponse. Relancer par téléphone, pas par mail — le mail ne fonctionne pas avec eux.',
          -3,
        ),
      ]

      client.history = [
        event(-27, 'Découverte', 'Appel découverte (35 min)'),
        event(-25, 'Proposition', 'Proposition envoyée — 3 400 €'),
        event(-25, 'Contrat', 'Contrat signé'),
        event(-24, 'Acompte', 'Acompte de 1 360 € reçu'),
        event(-19, 'Cadrage', 'Cadrage validé en visio'),
        event(-9, 'Contenus', 'Textes et logos reçus, photos partielles'),
        event(-6, 'Conception', 'Arborescence envoyée pour validation', 'en_cours'),
      ]
    },
  )
}

function croustyNaan(): Client {
  return build(
    {
      id: 'cli_crousty_naan',
      companyName: 'Crousty Naan',
      sector: 'Restauration indienne — 2 établissements',
      employees: '14',
      area: 'Villeurbanne & Lyon 7',
      website: 'croustynaan.fr',
      socials: 'instagram.com/croustynaan',
      address: '88 cours Émile Zola, 69100 Villeurbanne',
      firstName: 'Naveen',
      lastName: 'Rathore',
      role: 'Fondateur',
      phone: '07 82 16 44 50',
      email: 'naveen@croustynaan.fr',
      projectName: 'Refonte digitale + commande en ligne',
      solutionTypes: ['refonte', 'ecommerce'],
      status: 'livre',
      deadline: d(-9),
      total: 5600,
      deposit: 2240,
    },
    (client) => {
      client.createdAt = ts(-96)
      client.updatedAt = ts(-9)
      client.lastActivityAt = ts(-8)

      client.discovery = {
        callDate: d(-96),
        reason: 'Trop de commissions versées aux plateformes de livraison, marge devenue intenable.',
        need: 'Un site de commande en direct, en click & collect, sans intermédiaire.',
        currentSituation: '70 % des commandes passaient par des plateformes à 30 % de commission.',
        currentTools: 'Plateformes de livraison, caisse Zelty, Instagram.',
        problems: 'Marge écrasée, aucune base client, aucune relation directe avec les habitués.',
        mainGoal: 'Basculer 30 % des commandes en direct dans les 6 mois.',
        secondaryGoals: 'Constituer un fichier client, communiquer sur les menus du midi.',
        expectedOutcome: 'Un canal de commande en propre, rentable dès le premier mois.',
      }

      client.analysis = {
        diagnostic:
          'Le produit fonctionne, la distribution coûte trop cher. Chaque point de commission récupéré tombe directement en marge.',
        mainProblem: 'Dépendance totale à des plateformes qui possèdent la relation client.',
        opportunities: 'Commande en ligne en direct, base client exploitable, offres du midi récurrentes.',
        solution: 'Refonte complète du site avec module de commande click & collect et paiement en ligne.',
        justification: 'Le seuil de rentabilité est atteint en environ 40 commandes directes par mois.',
        solutionTypes: ['refonte', 'ecommerce'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items([
          'Refonte complète du site',
          'Module de commande click & collect',
          'Paiement en ligne',
          'Formation des équipes (2 h sur site)',
        ]),
        features: items([
          'Carte en ligne avec options',
          'Créneaux de retrait par établissement',
          'Emails de confirmation automatiques',
          'Tableau de bord des commandes',
        ]),
        screens: items(['Accueil', 'Carte', 'Commande', 'Paiement', 'Confirmation', 'Les deux adresses']),
        exclusions: items(['Livraison à domicile', 'Application mobile native', 'Programme de fidélité']),
      }

      markResources(client, {})

      client.creative = {
        brandImage: 'Généreux, chaleureux, contemporain. Pas de folklore.',
        style: 'Photos produit plein cadre, typographie ronde, contrastes forts.',
        colors: 'Terracotta, crème, vert cardamome.',
        references: 'Marques de street food premium.',
        likedSites: 'dishoom.com',
        avoidSites: 'Sites de restaurants avec carte en PDF et fond de papyrus.',
        targetAudience: 'Actifs 25–45 ans dans un rayon de 15 minutes, commande du midi et du soir.',
        mainUserProfile: 'Habitué pressé qui commande depuis son téléphone entre deux réunions.',
        mainAction: 'acheter',
        mainActionOther: '',
      }

      completeSteps(client, {
        acompte: -93,
        cadrage: -88,
        contenus: -74,
        conception: -62,
        design_valide: -51,
        developpement: -28,
        v1: -24,
        retours: -19,
        corrections: -13,
        validation_finale: -11,
        solde: -10,
        livraison: -9,
      })

      client.validation = {
        v1SentAt: d(-24),
        v1Comment:
          'V1 envoyée avec un parcours de commande complet en test. Demandé un retour groupé sous 5 jours plutôt que des retours au fil de l’eau.',
        clientFeedback:
          'Très bon retour global sur le design. Trois points : le prix des suppléments doit être visible dès la carte, le créneau de retrait doit être proposé par défaut, et il manquait les horaires d’été.',
        corrections: [
          correction('Carte', 'Afficher le prix des suppléments directement sur la carte', 'termine', 'haute', -19),
          correction('Commande', 'Pré-sélectionner le prochain créneau de retrait disponible', 'termine', 'haute', -19),
          correction('Footer', 'Ajouter les horaires d’été des deux établissements', 'termine', 'normale', -18),
        ],
      }

      client.admin.depositReceivedAt = d(-93)
      client.admin.balanceReceivedAt = d(-10)
      client.admin.contractSigned = true
      client.admin.contractSignedAt = d(-94)
      client.admin.maintenanceActive = true
      client.admin.maintenanceMonthly = 79
      client.admin.hostingActive = true
      client.admin.hostingYearly = 240

      completeDelivery(client)

      client.followUp.j1Done = true
      client.followUp.j1At = d(-8)
      client.followUp.j7Done = false
      client.followUp.reviewRequested = false
      client.followUp.opportunities = client.followUp.opportunities.map((opportunity) => {
        if (opportunity.label === 'Maintenance') return { ...opportunity, status: 'signee' as const }
        if (opportunity.label === 'Hébergement') return { ...opportunity, status: 'signee' as const }
        if (opportunity.label === 'SEO') return { ...opportunity, status: 'proposee' as const }
        if (opportunity.label === 'Application') return { ...opportunity, status: 'identifiee' as const }
        return opportunity
      })

      client.notes = [
        note('Naveen décide seul et vite. Ne pas multiplier les options : proposer un parti pris, il tranche.', -88),
        note(
          'Le vrai indicateur du projet n’est pas le site mais le nombre de commandes directes. À suivre au J+30 pour préparer la proposition SEO.',
          -9,
        ),
      ]

      client.history = [
        event(-96, 'Découverte', 'Appel découverte (50 min)'),
        event(-94, 'Proposition', 'Proposition envoyée — 5 600 €'),
        event(-94, 'Contrat', 'Contrat signé'),
        event(-93, 'Acompte', 'Acompte de 2 240 € reçu'),
        event(-88, 'Cadrage', 'Cadrage sur site, carte complète récupérée'),
        event(-74, 'Contenus', 'Séance photo produit réalisée'),
        event(-62, 'Conception', 'Parcours de commande validé'),
        event(-51, 'Design', 'Maquettes validées après une itération'),
        event(-28, 'Développement', 'Module de commande et paiement livrés en recette'),
        event(-24, 'V1', 'V1 présentée en visio'),
        event(-19, 'Retours', 'Retours client reçus — 3 demandes'),
        event(-13, 'Corrections', 'Corrections livrées'),
        event(-11, 'Validation', 'Validation finale écrite'),
        event(-10, 'Solde', 'Solde de 3 360 € reçu'),
        event(-9, 'Livraison', 'Mise en ligne et transmission des accès'),
        event(-8, 'Suivi', 'Appel de suivi J+1'),
      ]
    },
  )
}

function atelierNovak(): Client {
  return build(
    {
      id: 'cli_atelier_novak',
      companyName: 'Atelier Novak',
      sector: 'Menuiserie sur mesure',
      employees: '3',
      area: 'Grand Genève',
      website: '—',
      socials: 'instagram.com/atelier.novak',
      address: '7 chemin des Vignes, 74100 Annemasse',
      firstName: 'Elsa',
      lastName: 'Novak',
      role: 'Fondatrice',
      phone: '06 45 22 71 38',
      email: 'elsa@ateliernovak.fr',
      projectName: 'Outil de devis + vitrine',
      solutionTypes: ['outil_interne', 'site_vitrine'],
      status: 'prospect',
      deadline: null,
      total: 6800,
      deposit: 2720,
    },
    (client) => {
      client.createdAt = ts(-5)
      client.updatedAt = ts(-2)
      client.lastActivityAt = ts(-2)

      client.discovery = {
        callDate: d(-5),
        reason: 'Elle passe ses dimanches à refaire des devis sous Excel et perd des affaires par lenteur de réponse.',
        need: 'Un outil interne qui génère un devis chiffré en quelques minutes, et une vitrine pour montrer les réalisations.',
        currentSituation: 'Devis Excel recopiés à la main, 2 à 3 h par devis, délai de réponse d’une semaine.',
        currentTools: 'Excel, Instagram, carnet papier.',
        problems: 'Délai de réponse trop long, erreurs de chiffrage, aucune traçabilité des devis envoyés.',
        mainGoal: 'Répondre à une demande de devis en moins de 24 h.',
        secondaryGoals: 'Uniformiser la présentation des devis, suivre le taux de signature.',
        expectedOutcome: 'Récupérer les affaires perdues par lenteur — estimé à 3 à 4 chantiers par an.',
      }

      client.analysis = {
        diagnostic:
          'Le vrai sujet est opérationnel avant d’être commercial : sans outil de chiffrage, la vitrine amènera des demandes qu’elle ne saura pas traiter.',
        mainProblem: 'Le chiffrage manuel est le goulot d’étranglement de toute l’activité.',
        opportunities:
          'Bibliothèque de prix réutilisable, devis PDF à la marque, suivi du taux de transformation.',
        solution: 'Phase 1 : outil de devis interne. Phase 2 : vitrine alimentée par les réalisations.',
        justification:
          'Livrer la vitrine d’abord créerait de la demande sans capacité de réponse. L’ordre inverse est le bon.',
        solutionTypes: ['outil_interne', 'site_vitrine'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items(['Proposition commerciale en 2 phases', 'Atelier de cadrage 2 h (inclus si signature)']),
        features: items([
          'Bibliothèque de prix (matériaux, main d’œuvre)',
          'Génération de devis PDF',
          'Suivi des devis envoyés / signés',
        ]),
        screens: items(['Nouveau devis', 'Bibliothèque', 'Historique']),
        exclusions: items(['Comptabilité', 'Facturation', 'Gestion de stock']),
      }

      markResources(client, {
        Logo: ['attente', 'Logo existant, fichier vectoriel à retrouver'],
        'Charte graphique': ['manquant', 'Inexistante — à créer'],
        Photos: ['recu', 'Instagram bien fourni, exploitable'],
        Textes: ['manquant', ''],
        Tarifs: ['attente', 'Grille de prix Excel promise après le prochain appel'],
        Témoignages: ['manquant', ''],
        'Mentions légales': ['manquant', ''],
        'Accès au domaine': ['manquant', 'Pas de domaine réservé'],
        'Accès aux outils existants': ['manquant', ''],
      })
      dropResources(client, ['Vidéos'])

      client.creative = {
        brandImage: 'Atelier d’artisan contemporain, matière brute, travail précis.',
        style: 'Minimal, place à la matière, photos macro du bois.',
        colors: 'Noir, blanc, chêne naturel.',
        references: 'Comptes Instagram d’ébénistes scandinaves.',
        likedSites: '',
        avoidSites: '',
        targetAudience: 'Architectes d’intérieur et particuliers haut de gamme du bassin genevois.',
        mainUserProfile: 'Elsa elle-même pour l’outil ; architecte prescripteur pour la vitrine.',
        mainAction: 'devis',
        mainActionOther: '',
      }

      client.notes = [
        note(
          'Prospect très qualifié mais budget à confirmer. Proposer un découpage en 2 phases pour lever l’objection prix.',
          -5,
        ),
        note('Proposition prête. À envoyer dès validation du découpage en 2 phases.', -2),
      ]

      client.history = [
        event(-5, 'Découverte', 'Appel découverte (40 min)'),
        event(-2, 'Analyse', 'Analyse BK Labs rédigée, proposition préparée'),
        event(0, 'Proposition', 'Proposition commerciale à envoyer', 'prevu'),
      ]
    },
  )
}

function boulangerieSainteCroix(): Client {
  return build(
    {
      id: 'cli_sainte_croix',
      companyName: 'Boulangerie Sainte-Croix',
      sector: 'Boulangerie artisanale',
      employees: '9',
      area: 'Chambéry centre',
      website: '—',
      socials: 'facebook.com/boulangeriesaintecroix',
      address: '3 place Saint-Léger, 73000 Chambéry',
      firstName: 'Mathieu',
      lastName: 'Ferrand',
      role: 'Gérant',
      phone: '06 88 05 12 74',
      email: 'contact@boulangerie-saintecroix.fr',
      projectName: 'Click & collect + précommande',
      solutionTypes: ['ecommerce'],
      status: 'actif',
      deadline: d(45),
      total: 7900,
      deposit: 3160,
    },
    (client) => {
      client.createdAt = ts(-12)
      client.updatedAt = ts(-2)
      client.lastActivityAt = ts(-2)

      client.discovery = {
        callDate: d(-12),
        reason: 'File d’attente ingérable entre 11 h 30 et 13 h, clients qui repartent sans acheter.',
        need: 'Permettre la précommande et le retrait à un créneau choisi.',
        currentSituation: 'Tout se fait au comptoir. Commandes de buffets prises à l’oral sur un carnet.',
        currentTools: 'Caisse enregistreuse, carnet papier, Facebook.',
        problems: 'Perte de chiffre au rush du midi, erreurs sur les commandes de buffets, aucune anticipation de production.',
        mainGoal: 'Absorber le rush du midi sans perdre de clients.',
        secondaryGoals: 'Fiabiliser les commandes de buffets, anticiper la production du matin.',
        expectedOutcome: 'Des commandes préparées à l’avance et une file qui avance.',
      }

      client.analysis = {
        diagnostic:
          'Ce n’est pas un problème d’acquisition : la demande dépasse déjà la capacité de service. Le gain est dans l’étalement des commandes.',
        mainProblem: 'Le pic de midi dépasse la capacité du comptoir et fait fuir des clients déjà acquis.',
        opportunities: 'Précommande, commandes buffets structurées, anticipation de la production.',
        solution: 'Plateforme de commande en ligne avec créneaux de retrait et gestion des commandes buffets.',
        justification: 'Chaque client perdu au rush est un client acquis que l’on ne sert pas — le coût est immédiat.',
        solutionTypes: ['ecommerce'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items([
          'Plateforme de commande en ligne',
          'Back-office de gestion des commandes',
          'Formation de l’équipe (2 h)',
        ]),
        features: items([
          'Créneaux de retrait par tranche de 15 min',
          'Commandes buffets avec délai de 48 h',
          'Paiement en ligne ou sur place',
          'Impression des commandes du matin',
        ]),
        screens: items(['Accueil', 'Carte', 'Panier', 'Créneau', 'Paiement', 'Back-office']),
        exclusions: items(['Livraison', 'Application mobile', 'Carte de fidélité']),
      }

      markResources(client, {
        Logo: ['manquant', 'Seulement une version JPG basse définition — à revectoriser'],
        Photos: ['manquant', 'Séance photo à planifier, aucune photo exploitable'],
        'Charte graphique': ['attente', 'Couleurs de l’enseigne à relever sur place'],
        Tarifs: ['attente', 'Grille tarifaire complète promise pour la fin de semaine'],
        Témoignages: ['recu', ''],
      })
      dropResources(client, ['Vidéos'])

      client.creative = {
        brandImage: 'Boulangerie de quartier, artisanale, du matin. Pas de rendu industriel.',
        style: 'Chaleureux, lisible, photos produit lumineuses, parcours de commande très simple.',
        colors: 'Crème, brun pain, un rouge profond en accent.',
        references: 'Sites de boulangeries parisiennes modernes.',
        likedSites: '',
        avoidSites: 'Interfaces de commande surchargées type plateformes de livraison.',
        targetAudience: 'Actifs du centre-ville et entreprises du quartier pour les buffets.',
        mainUserProfile: 'Salarié pressé qui commande depuis son bureau à 11 h pour 12 h 15.',
        mainAction: 'acheter',
        mainActionOther: '',
      }

      completeSteps(client, { acompte: -9 })

      client.admin.depositReceivedAt = d(-9)
      client.admin.contractSigned = true
      client.admin.contractSignedAt = d(-10)

      client.notes = [
        note(
          'Projet le plus rentable du trimestre mais aussi le plus risqué : sans photos produit, la plateforme ne vendra rien. Bloquer la séance photo avant le cadrage.',
          -9,
        ),
        note('Mathieu est disponible uniquement entre 14 h et 16 h. Caler tous les points à ce créneau.', -6),
      ]

      client.history = [
        event(-12, 'Découverte', 'Appel découverte (55 min)'),
        event(-10, 'Proposition', 'Proposition envoyée — 7 900 €'),
        event(-10, 'Contrat', 'Contrat signé'),
        event(-9, 'Acompte', 'Acompte de 3 160 € reçu'),
        event(-2, 'Cadrage', 'Atelier de cadrage planifié', 'en_cours'),
      ]
    },
  )
}

function cabinetVergnaud(): Client {
  return build(
    {
      id: 'cli_cabinet_vergnaud',
      companyName: 'Cabinet Vergnaud',
      sector: 'Expertise comptable',
      employees: '22',
      area: 'Grenoble',
      website: 'cabinet-vergnaud.fr',
      socials: 'linkedin.com/company/cabinet-vergnaud',
      address: '18 boulevard Gambetta, 38000 Grenoble',
      firstName: 'Claire',
      lastName: 'Vergnaud',
      role: 'Associée',
      phone: '04 76 12 88 40',
      email: 'c.vergnaud@cabinet-vergnaud.fr',
      projectName: 'Automatisation de la collecte de pièces',
      solutionTypes: ['automatisation', 'outil_interne'],
      status: 'maintenance',
      deadline: d(-118),
      total: 9400,
      deposit: 3760,
    },
    (client) => {
      client.createdAt = ts(-205)
      client.updatedAt = ts(-14)
      client.lastActivityAt = ts(-14)

      client.discovery = {
        callDate: d(-205),
        reason: 'Les collaborateurs passaient un temps considérable à relancer les clients pour obtenir les pièces comptables.',
        need: 'Automatiser les relances et centraliser le dépôt des pièces.',
        currentSituation: 'Relances manuelles par mail, pièces reçues en vrac, retards de production chaque mois.',
        currentTools: 'Outlook, Dropbox partagé, logiciel comptable métier.',
        problems: 'Temps perdu en relances, pièces égarées, clôtures mensuelles décalées.',
        mainGoal: 'Diviser par deux le temps passé en relances.',
        secondaryGoals: 'Fiabiliser la réception des pièces, tracer qui a déposé quoi.',
        expectedOutcome: 'Des clôtures mensuelles à l’heure sans relance manuelle.',
      }

      client.analysis = {
        diagnostic:
          'Un problème de process, pas d’outil métier. La valeur est dans l’automatisation des relances, pas dans un nouveau logiciel comptable.',
        mainProblem: 'La relance manuelle est répétée par 8 collaborateurs, chaque mois, pour 300 dossiers.',
        opportunities: 'Relances automatiques, espace de dépôt par client, tableau de suivi des pièces reçues.',
        solution: 'Automatisation des relances et portail de dépôt connecté à l’arborescence existante.',
        justification: 'Le retour sur investissement est atteint en moins de deux mois de temps collaborateur.',
        solutionTypes: ['automatisation', 'outil_interne'],
        solutionTypeOther: '',
      }

      client.scope = {
        deliverables: items([
          'Portail de dépôt de pièces',
          'Séquences de relance automatiques',
          'Tableau de suivi mensuel',
          'Formation des 8 collaborateurs',
        ]),
        features: items([
          'Relances programmées par dossier',
          'Dépôt de fichiers par le client',
          'Classement automatique dans l’arborescence',
          'Export mensuel de suivi',
        ]),
        screens: items(['Portail client', 'Suivi collaborateur', 'Paramétrage des relances']),
        exclusions: items(['Saisie comptable', 'Intégration au logiciel métier', 'Signature électronique']),
      }

      markResources(client, {})
      dropResources(client, ['Vidéos'])

      client.creative = {
        brandImage: 'Rigoureux, rassurant, institutionnel sans être froid.',
        style: 'Interface sobre, dense en information, aucune fantaisie.',
        colors: 'Bleu ardoise, gris clair, blanc.',
        references: 'Outils métiers bancaires.',
        likedSites: '',
        avoidSites: 'Interfaces trop ludiques ou colorées.',
        targetAudience: 'Clients du cabinet (dirigeants de TPE) et collaborateurs internes.',
        mainUserProfile: 'Dirigeant de TPE qui dépose ses pièces depuis son téléphone une fois par mois.',
        mainAction: 'telecharger',
        mainActionOther: 'Déposer ses pièces comptables',
      }

      completeSteps(client, {
        acompte: -200,
        cadrage: -193,
        contenus: -180,
        conception: -168,
        design_valide: -157,
        developpement: -132,
        v1: -128,
        retours: -124,
        corrections: -120,
        validation_finale: -119,
        solde: -119,
        livraison: -118,
      })

      client.validation = {
        v1SentAt: d(-128),
        v1Comment: 'V1 déployée sur un environnement de test avec 10 dossiers pilotes.',
        clientFeedback:
          'Retour très positif des collaborateurs. Deux ajustements demandés sur la fréquence des relances et le format de l’export.',
        corrections: [
          correction('Relances', 'Espacer les relances à 7 jours au lieu de 3', 'termine', 'normale', -124),
          correction('Export', 'Ajouter une colonne « date de dépôt » à l’export mensuel', 'termine', 'basse', -124),
        ],
      }

      client.admin.depositReceivedAt = d(-200)
      client.admin.balanceReceivedAt = d(-119)
      client.admin.contractSigned = true
      client.admin.contractSignedAt = d(-201)
      client.admin.maintenanceActive = true
      client.admin.maintenanceMonthly = 149
      client.admin.hostingActive = true
      client.admin.hostingYearly = 240

      completeDelivery(client)

      client.followUp.j1Done = true
      client.followUp.j1At = d(-117)
      client.followUp.j7Done = true
      client.followUp.j7At = d(-111)
      client.followUp.reviewRequested = true
      client.followUp.reviewReceived = true
      client.followUp.opportunities = client.followUp.opportunities.map((opportunity) => {
        if (opportunity.label === 'Maintenance') return { ...opportunity, status: 'signee' as const }
        if (opportunity.label === 'Hébergement') return { ...opportunity, status: 'signee' as const }
        if (opportunity.label === 'Nouvelle fonctionnalité')
          return { ...opportunity, status: 'proposee' as const }
        if (opportunity.label === 'Automatisation') return { ...opportunity, status: 'identifiee' as const }
        return opportunity
      })

      client.notes = [
        note('Référence client la plus solide du portefeuille. Demander une étude de cas écrite.', -110),
        note(
          'Extension « signature électronique » chiffrée à 3 200 €. Claire est intéressée, décision au prochain budget.',
          -14,
        ),
      ]

      client.history = [
        event(-205, 'Découverte', 'Appel découverte (60 min)'),
        event(-201, 'Contrat', 'Contrat signé — 9 400 €'),
        event(-200, 'Acompte', 'Acompte de 3 760 € reçu'),
        event(-193, 'Cadrage', 'Cadrage sur site avec 3 collaborateurs'),
        event(-168, 'Conception', 'Parcours de dépôt validé'),
        event(-132, 'Développement', 'Portail et séquences de relance livrés'),
        event(-128, 'V1', 'V1 déployée sur 10 dossiers pilotes'),
        event(-120, 'Corrections', 'Ajustements relances et export livrés'),
        event(-119, 'Solde', 'Solde de 5 640 € reçu'),
        event(-118, 'Livraison', 'Déploiement sur les 300 dossiers'),
        event(-111, 'Suivi', 'Suivi J+7 — adoption confirmée'),
        event(-14, 'Opportunité', 'Extension signature électronique proposée', 'en_cours'),
      ]
    },
  )
}

/** Le portefeuille de démonstration, du plus récent au plus ancien. */
export function seedClients(): Client[] {
  return [
    dprPeinture(),
    girelElectriques(),
    boulangerieSainteCroix(),
    atelierNovak(),
    croustyNaan(),
    cabinetVergnaud(),
  ]
}
