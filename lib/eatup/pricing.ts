// Règles de sélection et de calcul des prix, partagées par l'interface et par l'API de commande.
// L'interface s'en sert pour afficher un prix exact en temps réel ; /api/orders les réapplique
// sur les données relues en base, de sorte qu'aucun prix envoyé par le navigateur n'est accepté.
//
// Les règles reprennent à l'identique celles de l'ancienne page restaurant :
//  - options : respect de min_choices / max_choices, options indisponibles refusées ;
//  - formule (menu_extra_price > 0) : boisson obligatoire (catégorie « Boissons »),
//    accompagnement obligatoire (catégorie « Accompagnements ») si le produit l'autorise
//    et qu'au moins un accompagnement est disponible ;
//  - prix = prix du plat + options + (prix formule − prix plat) + supplément boisson + prix accompagnement.

import type { OptionGroup, OptionItem, Product, Selection } from './types.ts'
import { round2 } from './money.ts'

export const DRINKS_CATEGORY = 'Boissons'
export const SIDES_CATEGORY = 'Accompagnements'
/** Catégories qui ne sont proposées qu'à l'intérieur d'une formule. */
export const HIDDEN_CATEGORIES: ReadonlySet<string> = new Set([SIDES_CATEGORY])

export function emptySelection(): Selection {
  return { options: {}, menu: false, drinkId: null, sideId: null }
}

/** Même règle que le tableau de bord : seul un produit explicitement « Dispo » est commandable. */
export function isProductAvailable(p: Pick<Product, 'is_available'>): boolean {
  return Boolean(p.is_available)
}

export function isOptionAvailable(i: Pick<OptionItem, 'is_available'>): boolean {
  return i.is_available !== false
}

type Positioned = { position?: number | null; created_at?: string | null }

/** Tri par position (définie par glisser-déposer dans le tableau de bord), puis par date de création. */
export function byPosition(a: Positioned, b: Positioned): number {
  const pa = a.position ?? null
  const pb = b.position ?? null
  if (pa !== null && pb !== null && pa !== pb) return pa - pb
  if (pa !== null && pb === null) return -1
  if (pa === null && pb !== null) return 1
  return (a.created_at || '').localeCompare(b.created_at || '')
}

/** Normalise les groupes lus en base (valeurs numériques, ordre d'affichage). */
export function normalizeGroups(groups: OptionGroup[]): OptionGroup[] {
  return groups
    .map(g => ({
      ...g,
      min_choices: Math.max(0, Number(g.min_choices) || 0),
      max_choices: Math.max(1, Number(g.max_choices) || 1),
      items: (g.items || [])
        .map(i => ({ ...i, extra_price: Number(i.extra_price) || 0 }))
        .sort(byPosition),
    }))
    .sort(byPosition)
}

export type MenuOffer = {
  /** Prix total de la formule, hors supplément boisson et accompagnement. */
  price: number
  /** Surcoût de la formule par rapport au plat seul. */
  extra: number
  label: string | null
  drinks: Product[]
  sides: Product[]
  requiresSide: boolean
  /** Une formule exige une boisson : sans boisson disponible, elle ne peut pas être commandée. */
  available: boolean
}

export function getMenuOffer(product: Product, products: Product[]): MenuOffer | null {
  const price = Number(product.menu_extra_price) || 0
  if (price <= 0) return null
  const drinks = products
    .filter(p => p.category === DRINKS_CATEGORY && p.is_available !== false)
    .sort(byPosition)
  const sides = product.has_accompagnement !== false
    ? products.filter(p => p.category === SIDES_CATEGORY && p.is_available !== false).sort(byPosition)
    : []
  return {
    price,
    extra: Math.max(0, round2(price - Number(product.price))),
    label: product.menu_label?.trim() || null,
    drinks,
    sides,
    requiresSide: sides.length > 0,
    available: drinks.length > 0,
  }
}

export function drinkSupplement(drink: Product): number {
  return Math.max(0, Number(drink.menu_supplement) || 0)
}

export function sidePrice(side: Product): number {
  return Math.max(0, Number(side.price) || 0)
}

export type SelectionIssue =
  | { kind: 'product-unavailable' }
  | { kind: 'group-min'; groupId: string; min: number }
  | { kind: 'group-max'; groupId: string; max: number }
  | { kind: 'option-unknown'; groupId: string | null }
  | { kind: 'option-unavailable'; groupId: string; itemId: string; name: string }
  | { kind: 'menu-unavailable' }
  | { kind: 'menu-drink' }
  | { kind: 'menu-side' }

export type PricedSelection = {
  ok: boolean
  issues: SelectionIssue[]
  unitPrice: number
  breakdown: { base: number; options: number; menu: number; drink: number; side: number }
  chosen: { group: OptionGroup; items: OptionItem[] }[]
  menu: MenuOffer | null
  drink: Product | null
  side: Product | null
  /** Libellé historique enregistré dans order_items.options (tickets cuisine, emails). */
  optionsText: string
}

export function priceSelection(
  product: Product,
  rawGroups: OptionGroup[],
  selection: Selection,
  products: Product[],
): PricedSelection {
  const groups = normalizeGroups(rawGroups)
  const issues: SelectionIssue[] = []
  if (!isProductAvailable(product)) issues.push({ kind: 'product-unavailable' })

  const knownGroupIds = new Set(groups.map(g => g.id))
  for (const groupId of Object.keys(selection.options || {})) {
    if (!knownGroupIds.has(groupId) && (selection.options[groupId] || []).length > 0) {
      issues.push({ kind: 'option-unknown', groupId: null })
    }
  }

  const chosen: PricedSelection['chosen'] = []
  let optionsExtra = 0
  for (const group of groups) {
    const ids = [...new Set(selection.options?.[group.id] || [])]
    const items: OptionItem[] = []
    for (const id of ids) {
      const item = group.items.find(i => i.id === id)
      if (!item) { issues.push({ kind: 'option-unknown', groupId: group.id }); continue }
      if (!isOptionAvailable(item)) issues.push({ kind: 'option-unavailable', groupId: group.id, itemId: item.id, name: item.name })
      items.push(item)
    }
    // L'ordre d'affichage du restaurant prime sur l'ordre de clic.
    items.sort((a, b) => group.items.indexOf(a) - group.items.indexOf(b))
    if (items.length > group.max_choices) issues.push({ kind: 'group-max', groupId: group.id, max: group.max_choices })
    if (items.length < group.min_choices) issues.push({ kind: 'group-min', groupId: group.id, min: group.min_choices })
    optionsExtra += items.reduce((s, i) => s + i.extra_price, 0)
    if (items.length) chosen.push({ group, items })
  }

  const offer = getMenuOffer(product, products)
  let menuExtra = 0
  let drink: Product | null = null
  let side: Product | null = null
  if (selection.menu) {
    if (!offer || !offer.available) {
      issues.push({ kind: 'menu-unavailable' })
    } else {
      menuExtra = offer.extra
      drink = offer.drinks.find(d => d.id === selection.drinkId) || null
      if (!drink) issues.push({ kind: 'menu-drink' })
      if (offer.requiresSide) {
        side = offer.sides.find(s => s.id === selection.sideId) || null
        if (!side) issues.push({ kind: 'menu-side' })
      }
    }
  }

  const base = Number(product.price) || 0
  const drinkExtra = drink ? drinkSupplement(drink) : 0
  const sideExtra = side ? sidePrice(side) : 0
  const unitPrice = round2(base + optionsExtra + menuExtra + drinkExtra + sideExtra)

  const optionNames = chosen.flatMap(c => c.items.map(i => i.name))
  const optionsText = [
    optionNames.join(', '),
    drink ? `🥤 ${drink.name}` : '',
    side ? `🍟 ${side.name}` : '',
  ].filter(Boolean).join(', ')

  return {
    ok: issues.length === 0,
    issues,
    unitPrice,
    breakdown: { base, options: round2(optionsExtra), menu: menuExtra, drink: drinkExtra, side: sideExtra },
    chosen,
    menu: offer,
    drink,
    side,
    optionsText,
  }
}

/** Reproduit le comportement historique : au-delà du maximum, la plus ancienne option est remplacée. */
export function toggleOption(selection: Selection, group: OptionGroup, item: OptionItem): Selection {
  if (!isOptionAvailable(item)) return selection
  const current = selection.options[group.id] || []
  let next: string[]
  if (current.includes(item.id)) next = current.filter(id => id !== item.id)
  else if (current.length >= group.max_choices) next = group.max_choices === 1 ? [item.id] : [...current.slice(1), item.id]
  else next = [...current, item.id]
  return { ...selection, options: { ...selection.options, [group.id]: next } }
}

/** Clé canonique : deux configurations identiques fusionnent dans le panier. */
export function selectionKey(productId: string, selection: Selection): string {
  const options = Object.keys(selection.options || {})
    .filter(k => (selection.options[k] || []).length > 0)
    .sort()
    .map(k => `${k}:${[...selection.options[k]].sort().join(',')}`)
    .join('|')
  const menu = selection.menu ? `menu:${selection.drinkId || ''}:${selection.sideId || ''}` : 'seul'
  return `${productId}#${options}#${menu}`
}

export function issueMessage(issue: SelectionIssue, groups: OptionGroup[]): string {
  const groupName = (id: string | null) => groups.find(g => g.id === id)?.name || 'option'
  switch (issue.kind) {
    case 'product-unavailable': return 'Ce produit n’est plus disponible pour le moment.'
    case 'group-min': return issue.min > 1
      ? `Choisissez au moins ${issue.min} options pour « ${groupName(issue.groupId)} ».`
      : `Faites votre choix pour « ${groupName(issue.groupId)} ».`
    case 'group-max': return `Maximum ${issue.max} choix pour « ${groupName(issue.groupId)} ».`
    case 'option-unknown': return 'Une option choisie n’existe plus. Merci de reconfigurer ce produit.'
    case 'option-unavailable': return `« ${issue.name} » n’est plus disponible.`
    case 'menu-unavailable': return 'La formule n’est pas disponible pour le moment.'
    case 'menu-drink': return 'Choisissez votre boisson.'
    case 'menu-side': return 'Choisissez votre accompagnement.'
  }
}
