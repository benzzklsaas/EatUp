/** Arrondi monétaire au centime, robuste aux erreurs de virgule flottante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Format français déterministe ("12,50 €"), identique côté serveur et navigateur
 * (Intl peut produire des espaces insécables différents selon la version d'ICU,
 * ce qui casserait l'hydratation).
 */
export function formatPrice(n: number): string {
  const value = round2(Number(n) || 0)
  return `${value.toFixed(2).replace('.', ',')} €`
}

/** Variante pour les suppléments : "+1,50 €". */
export function formatExtra(n: number): string {
  return `+${formatPrice(n)}`
}
