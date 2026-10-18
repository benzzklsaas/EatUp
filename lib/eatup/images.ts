// Photos produits livrées en plusieurs tailles déjà prêtes (ex. visuels « pop » de Croustys Naan),
// importées par scripts/import-product-photos.mjs selon la convention :
//   <dossier>/<nom>@540.jpg   petit format (vignettes)
//   <dossier>/<nom>@1350.jpg  format courant — c'est cette URL qui est enregistrée dans products.image_url
//   <dossier>/<nom>@1600.jpg  grand écran
// Une URL qui suit la convention est affichée avec un srcset : le navigateur choisit la taille utile,
// sans recadrage ni recompression supplémentaire.

const PRIMARY_WIDTH = 1350
const VARIANT_URL = /^(.+)@(\d{3,4})\.(jpe?g|png|webp)(\?[^#]*)?$/i

/**
 * Emplacement d'affichage :
 * - small : vignettes (liste, panier, paiement) → le 540 en priorité ;
 * - large : fiche produit et grands visuels → jamais le 540 (prévu pour les vignettes),
 *   le 1350 en général et le 1600 sur les écrans très denses.
 */
export type ImageSlot = 'small' | 'large'
export const SLOT_WIDTHS: Record<ImageSlot, readonly number[]> = { small: [540, 1350], large: [1350, 1600] }

/** srcset des variantes pour un emplacement, ou null si l'URL ne suit pas la convention. */
export function variantSrcSet(src: string, slot: ImageSlot = 'small'): string | null {
  const m = VARIANT_URL.exec(src)
  if (!m || Number(m[2]) !== PRIMARY_WIDTH) return null
  const [, base, , ext, query = ''] = m
  return SLOT_WIDTHS[slot].map(w => `${base}@${w}.${ext}${query} ${w}w`).join(', ')
}
