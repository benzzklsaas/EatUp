// Panier persistant (localStorage, par restaurant). Le panier ne stocke que des identifiants
// et des quantités : prix et disponibilités sont recalculés à partir de la carte à chaque affichage.

import type { Catalog, Product, Selection } from './types.ts'
import { priceSelection, selectionKey, DRINKS_CATEGORY, SIDES_CATEGORY, type PricedSelection } from './pricing.ts'
import { round2 } from './money.ts'

export const MAX_LINE_QUANTITY = 50

export type CartLine = {
  key: string
  productId: string
  quantity: number
  selection: Selection
  /** Pour afficher une ligne dont le produit a disparu de la carte. */
  snapshot: { name: string; imageUrl: string | null }
}

export type CartRow = {
  line: CartLine
  product: Product | null
  priced: PricedSelection | null
  lineTotal: number
  status: 'ok' | 'missing' | 'invalid'
}

export type CartSummary = {
  rows: CartRow[]
  count: number
  total: number
  /** Vrai si une ligne doit être corrigée avant de commander. */
  blocked: boolean
}

export function makeLine(product: Product, selection: Selection, quantity = 1): CartLine {
  return {
    key: selectionKey(product.id, selection),
    productId: product.id,
    quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity))),
    selection,
    snapshot: { name: product.name, imageUrl: product.image_url || null },
  }
}

/** Ajoute une ligne en fusionnant les configurations identiques. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find(l => l.key === line.key)
  if (!existing) return [...lines, line]
  return lines.map(l => l.key === line.key
    ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + line.quantity) }
    : l)
}

/** Remplace une ligne modifiée (fusionne si la nouvelle configuration existe déjà). */
export function replaceLine(lines: CartLine[], oldKey: string, line: CartLine): CartLine[] {
  const without = lines.filter(l => l.key !== oldKey)
  const index = lines.findIndex(l => l.key === oldKey)
  const merged = without.find(l => l.key === line.key)
  if (merged) return addLine(without, line)
  const next = [...without]
  next.splice(index < 0 ? next.length : index, 0, line)
  return next
}

export function setLineQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter(l => l.key !== key)
  return lines.map(l => l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, Math.floor(quantity)) } : l)
}

export function summarizeCart(lines: CartLine[], catalog: Catalog): CartSummary {
  const rows: CartRow[] = lines.map(line => {
    const product = catalog.products.find(p => p.id === line.productId) || null
    if (!product) return { line, product: null, priced: null, lineTotal: 0, status: 'missing' }
    const priced = priceSelection(product, catalog.groupsByProduct[product.id] || [], line.selection, catalog.products)
    return {
      line,
      product,
      priced,
      lineTotal: round2(priced.unitPrice * line.quantity),
      status: priced.ok ? 'ok' : 'invalid',
    }
  })
  const valid = rows.filter(r => r.status === 'ok')
  return {
    rows,
    count: valid.reduce((s, r) => s + r.line.quantity, 0),
    total: round2(valid.reduce((s, r) => s + r.lineTotal, 0)),
    blocked: rows.some(r => r.status !== 'ok'),
  }
}

// ── Persistance ────────────────────────────────────────────────────────────

export const cartStorageKey = (slug: string) => `eatup_cart_v2_${slug}`
export const legacyCartStorageKey = (slug: string) => `cart_${slug}`

function isSelection(v: unknown): v is Selection {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return typeof s.options === 'object' && s.options !== null && typeof s.menu === 'boolean'
}

export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((l): l is CartLine =>
      l && typeof l.key === 'string' && typeof l.productId === 'string'
      && Number.isFinite(l.quantity) && l.quantity > 0 && isSelection(l.selection)
      && l.snapshot && typeof l.snapshot.name === 'string')
      .map(l => ({ ...l, quantity: Math.min(MAX_LINE_QUANTITY, Math.floor(l.quantity)) }))
  } catch {
    return []
  }
}

type LegacyLine = {
  product?: { id?: string; name?: string; image_url?: string | null }
  quantity?: number
  selectedOptions?: Record<string, { id?: string }[]>
  menuBoisson?: string
  menuAccomp?: string
}

/**
 * Reprend un panier enregistré par l'ancienne page (clé `cart_<slug>`), qui stockait
 * des objets produits complets et les boissons/accompagnements par leur nom.
 */
export function migrateLegacyCart(raw: string | null, products: Product[]): CartLine[] {
  if (!raw) return []
  let data: unknown
  try { data = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(data)) return []
  let lines: CartLine[] = []
  for (const item of data as LegacyLine[]) {
    const id = item?.product?.id
    if (!id) continue
    const options: Record<string, string[]> = {}
    for (const [groupId, items] of Object.entries(item.selectedOptions || {})) {
      const ids = (Array.isArray(items) ? items : []).map(i => i?.id).filter((x): x is string => typeof x === 'string')
      if (ids.length) options[groupId] = ids
    }
    const menu = Boolean(item.menuBoisson || item.menuAccomp)
    const drink = menu ? products.find(p => p.category === DRINKS_CATEGORY && p.name === item.menuBoisson) : undefined
    const side = menu ? products.find(p => p.category === SIDES_CATEGORY && p.name === item.menuAccomp) : undefined
    const selection: Selection = { options, menu, drinkId: drink?.id || null, sideId: side?.id || null }
    const product = products.find(p => p.id === id)
    const line: CartLine = {
      key: selectionKey(id, selection),
      productId: id,
      quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(Number(item.quantity) || 1))),
      selection,
      snapshot: { name: product?.name || item.product?.name || 'Produit', imageUrl: product?.image_url || item.product?.image_url || null },
    }
    lines = addLine(lines, line)
  }
  return lines
}
