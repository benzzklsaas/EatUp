/**
 * DIRECTION ARTISTIQUE — « SORTI DU FOUR »
 * ────────────────────────────────────────────────────────────────────────────
 * Le naan est claqué contre la paroi du tandoor à 400°C : il cloque, il noircit
 * par endroits, il croustille. Toute l'identité part de là — la matière du four,
 * pas la matière du web.
 *
 * Trois matières :
 *   CHARBON  la paroi du four, un noir chaud (jamais bleuté)
 *   PÂTE     la farine, le papier kraft blanchi dans lequel on emballe
 *   BRAISE   la chaleur — safran et feu
 *
 * Quatre motifs récurrents, déclinés à toutes les échelles :
 *   ARCHE    la gueule du tandoor. Toutes les images sont cintrées, jamais
 *            de carte à coins arrondis.
 *   TICKET   le papier de caisse : dentelure, points de conduite, machine
 *            à écrire. Porte le panier, la commande, le suivi.
 *   TAMPON   l'encre tamponnée de travers : statut, numéro, mentions.
 *   BANDE    le bandeau d'enseigne, incliné, qui chevauche les sections.
 *
 * Ces tokens sont la seule source de vérité couleur/typo des pages client.
 */

export type BrandPalette = {
  ink: string       // fond le plus profond
  char: string      // surface courante
  charUp: string    // surface surélevée (lignes de menu, sélections)
  line: string      // filets
  dough: string     // texte principal, papier
  doughDim: string  // texte secondaire
  paper: string     // papier des tickets et des feuilles
  paperInk: string  // encre sur papier
  hot: string       // la braise — chaleur, prix, urgence
  accent: string    // l'accent de marque — safran chez Crousty
  accentInk: string // encre lisible posée sur l'accent
  fresh: string     // le vert d'herbe — ouvert, disponible
}

export type BrandKit = {
  /** Mot posé en capitales Anton dans le masthead, coupé par les bords. */
  wordmark: string
  /** La voix, en Fraunces italique. Une phrase, jamais deux. */
  voice: string
  /** Mots de la bande d'enseigne, répétés en boucle. */
  band: string[]
  /** Mention tamponnée à côté du nom. */
  stamp: string
  palette: BrandPalette
}

const CROUSTY: BrandKit = {
  wordmark: 'CROUSTY\nNAAN',
  voice: 'Sorti du four, direct dans vos mains.',
  band: ['SORTI DU FOUR', 'CROUSTY NAAN', 'À EMPORTER', 'CLICK & COLLECT'],
  stamp: 'MAISON',
  palette: {
    ink: '#120E0A',
    char: '#1C1611',
    charUp: '#241C15',
    line: '#3A2E23',
    dough: '#F4E8D4',
    doughDim: '#B0A08A',
    paper: '#F2E6D0',
    paperInk: '#1A140E',
    hot: '#D24218',
    accent: '#F2B01E',
    accentInk: '#1A1206',
    fresh: '#9CB363',
  },
}

/**
 * Les autres restaurants héritent de la même charpente (arche, ticket, tampon)
 * mais pas de la palette : le safran et la braise appartiennent à Crousty Naan.
 * Ici, une gamme craie sur ardoise, volontairement plus sobre.
 */
function neutralKit(restaurantName: string): BrandKit {
  return {
    wordmark: (restaurantName || 'AU MENU').toUpperCase(),
    voice: 'Commandez en ligne, retirez sur place.',
    band: [(restaurantName || 'AU MENU').toUpperCase(), 'À EMPORTER', 'CLICK & COLLECT'],
    stamp: 'MAISON',
    palette: {
      ink: '#131110',
      char: '#1B1917',
      charUp: '#232020',
      line: '#38332F',
      dough: '#EFE9E1',
      doughDim: '#A8A099',
      paper: '#EDE7DD',
      paperInk: '#17140F',
      hot: '#C4553D',
      accent: '#E4DACB',
      accentInk: '#17140F',
      fresh: '#93A87C',
    },
  }
}

const KITS: Record<string, BrandKit> = {
  'crousty-naan': CROUSTY,
}

export function getBrand(slug: string | undefined, restaurantName = ''): BrandKit {
  const kit = slug ? KITS[slug] : undefined
  if (kit) return kit
  return neutralKit(restaurantName)
}

/** Familles chargées par les layouts client — voir app/restaurant/[slug]/layout.tsx */
export const FONT = {
  /** Anton — capitales d'affiche, très condensées. Le masthead, les chiffres. */
  display: 'var(--font-anton), "Arial Narrow", Impact, sans-serif',
  /** Fraunces — la voix gourmande. Noms de plats, phrases éditoriales. */
  editorial: 'var(--font-fraunces), Georgia, "Times New Roman", serif',
  /** DM Mono — toute la mécanique : prix, libellés, boutons, tickets. */
  mono: 'var(--font-dm-mono), ui-monospace, "SFMono-Regular", Menlo, monospace',
}

/** L'arche : la gueule du tandoor. Le seul rayon autorisé sur une image. */
export const ARCH = '999px 999px 10px 10px'

/** La même arche sur un cadre paysage : le galbe est décrit en ellipse. */
export const ARCH_WIDE = '50% 50% 10px 10px / 38% 38% 10px 10px'

/**
 * Grain de farine sur toute surface sombre : casse le rendu « écran ».
 * Une seule turbulence SVG en data-URI, aucune dépendance, aucun réseau.
 */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")"

/**
 * Dentelure du ticket de caisse. À poser en bande absolue sur le bord d'une
 * feuille : les pastilles sont peintes à la couleur du fond de page, elles
 * mordent donc dans le papier au lieu de s'y ajouter.
 */
export function perforation(pageColor: string, side: 'top' | 'bottom' = 'top') {
  const y = side === 'top' ? '0' : '12px'
  return {
    backgroundImage: `radial-gradient(circle at 7px ${y}, ${pageColor} 5.5px, transparent 6px)`,
    backgroundSize: '14px 12px',
    backgroundRepeat: 'repeat-x',
  } as const
}
