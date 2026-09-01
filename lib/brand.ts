/**
 * CROUSTY NAAN — DIRECTION ARTISTIQUE « DU FEU ET DE L'HERBE »
 * ────────────────────────────────────────────────────────────────────────────
 * Un naan sort du four brûlant, puis on le finit à la main : coriandre, menthe,
 * citron. Toute l'identité tient dans ce passage — la braise puis l'herbe.
 * D'où le code couleur : un orange de braise qui glisse vers un vert herbe,
 * posés sur un blanc lavé de vert plutôt que sur un blanc froid.
 *
 * Le parti pris est clair et lumineux. La vitrine donne envie et renseigne ;
 * la commande, elle, se passe sur EatUp.
 *
 * Motifs récurrents :
 *   ARCHE    la gueule du four. Le seul rayon autorisé sur une image.
 *   LIGNE    la ligne de carte à points de conduite : le nom, les points,
 *            le prix. On lit un menu, pas une grille de vignettes.
 *   PASTILLE l'état dit en clair (ouvert, prêt, épuisé) — jamais décoratif.
 *
 * Les couleurs ne sont jamais écrites en dur dans les feuilles de style :
 * chaque page pose sa palette en variables CSS, et tout s'y adapte.
 */

export type BrandPalette = {
  bg: string        // le fond de page — blanc lavé d'herbe
  surface: string   // les surfaces posées dessus (feuilles, lignes actives)
  shade: string     // la surface basse, pour alterner sans tracer de trait
  line: string      // les filets
  text: string      // le texte principal — un noir vert, jamais bleuté
  dim: string       // le texte secondaire
  hot: string       // la braise, en aplat et en graphique
  hotInk: string    // la braise assombrie : lisible en texte et sous du blanc
  hotSoft: string   // le voile de braise, pour les fonds
  fresh: string     // le vert herbe, en aplat
  freshInk: string  // le vert herbe lisible en texte
  freshSoft: string // le voile d'herbe
}

/**
 * La palette de Crousty Naan. Elle vit ici et nulle part ailleurs : les
 * composants de la vitrine ne connaissent que les variables CSS ci-dessous.
 */
export const CROUSTY: BrandPalette = {
  bg: '#F7F7F0',
  surface: '#FFFFFF',
  shade: '#ECEDE1',
  line: '#DBDCCB',
  text: '#1B2114',
  dim: '#5C6852',
  hot: '#E4551B',
  hotInk: '#C6440F',
  hotSoft: '#FDEDE4',
  fresh: '#6E9C2E',
  freshInk: '#4C7220',
  freshSoft: '#EDF3DF',
}

/** Traduit la palette en variables CSS, seul point de contact avec la page. */
export function paletteVars(p: BrandPalette): Record<string, string> {
  return {
    '--cn-bg': p.bg,
    '--cn-surface': p.surface,
    '--cn-shade': p.shade,
    '--cn-line': p.line,
    '--cn-text': p.text,
    '--cn-dim': p.dim,
    '--cn-hot': p.hot,
    '--cn-hot-ink': p.hotInk,
    '--cn-hot-soft': p.hotSoft,
    '--cn-fresh': p.fresh,
    '--cn-fresh-ink': p.freshInk,
    '--cn-fresh-soft': p.freshSoft,
  }
}

/** Les familles, chargées par les layouts des routes client. */
export const FONT = {
  /** Bricolage Grotesque — les titres et les noms de plats. Du caractère, lisible. */
  display: 'var(--font-bricolage), "Helvetica Neue", Arial, sans-serif',
  /** Instrument Sans — tout le texte courant et les commandes. */
  ui: 'var(--font-instrument), "Helvetica Neue", Arial, sans-serif',
  /** DM Mono — les prix, les horaires, les numéros. Ce qui s'aligne en colonne. */
  mono: 'var(--font-dm-mono), ui-monospace, "SFMono-Regular", Menlo, monospace',
}

/** L'arche : la gueule du four. Le seul rayon autorisé sur une image. */
export const ARCH = '999px 999px 6px 6px'

/** La même arche sur un cadre paysage : le galbe est décrit en ellipse. */
export const ARCH_WIDE = '50% 50% 6px 6px / 34% 34% 6px 6px'

/**
 * Grain très léger : enlève le rendu « aplat d'écran » sans salir le blanc.
 * Une turbulence SVG en data-URI, aucune dépendance, aucune requête.
 */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

