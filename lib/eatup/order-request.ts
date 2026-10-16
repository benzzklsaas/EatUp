// Contrat de la requête de commande envoyée par le checkout, validé côté serveur.
// Le navigateur n'envoie que des identifiants, des quantités et les coordonnées du client :
// prix, libellés, statut et mode de paiement sont déterminés exclusivement par le serveur.

import type { Selection } from './types.ts'
import { MAX_LINE_QUANTITY } from './cart.ts'

export const ORDER_NUMBER_PATTERN = /^EAT-[A-Z0-9]{6}$/
/** Les anciens numéros (Math.random().toString(36)) peuvent être plus courts. */
export const LEGACY_ORDER_NUMBER_PATTERN = /^EAT-[A-Z0-9]{1,12}$/
export const MAX_LINES = 50

export type OrderRequest = {
  restaurantId: string
  orderNumber: string
  customer: { firstName: string; lastName: string; email: string; phone: string }
  pickupTime: string
  items: { productId: string; quantity: number; selection: Selection }[]
}

export type ParseResult =
  | { ok: true; value: OrderRequest }
  | { ok: false; error: string; field?: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^[0-9+().\s-]{6,25}$/

// Sans 0/O ni 1/I : lisible au comptoir. Constante de module volontairement : une constante locale
// était perdue par le minifieur de production lorsqu'il inlinait la fonction (« alphabet is not defined »).
const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateOrderNumber(random: (n: number) => Uint8Array): string {
  let suffix = ''
  for (const b of random(6)) suffix += ORDER_ALPHABET[b % ORDER_ALPHABET.length]
  return `EAT-${suffix}`
}

export type CustomerField = 'firstName' | 'lastName' | 'email' | 'phone'

/** Règles des coordonnées, partagées par le formulaire (messages en direct) et le serveur. */
export function validateCustomer(c: Record<CustomerField, string>): Partial<Record<CustomerField, string>> {
  const errors: Partial<Record<CustomerField, string>> = {}
  const firstName = c.firstName.trim(), lastName = c.lastName.trim()
  const email = c.email.trim(), phone = c.phone.trim()
  if (!firstName) errors.firstName = 'Indiquez votre prénom.'
  else if (firstName.length > 60) errors.firstName = 'Prénom trop long.'
  if (!lastName) errors.lastName = 'Indiquez votre nom.'
  else if (lastName.length > 60) errors.lastName = 'Nom trop long.'
  if (!email) errors.email = 'Indiquez votre email pour recevoir la confirmation.'
  else if (!EMAIL.test(email) || email.length > 254) errors.email = 'Cette adresse email semble incorrecte.'
  if (phone && !PHONE.test(phone)) errors.phone = 'Ce numéro de téléphone semble incorrect.'
  return errors
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parseSelection(v: unknown): Selection | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Record<string, unknown>
  if (typeof s.menu !== 'boolean') return null
  const options: Record<string, string[]> = {}
  if (s.options && typeof s.options === 'object') {
    for (const [k, ids] of Object.entries(s.options as Record<string, unknown>)) {
      if (!Array.isArray(ids) || ids.length > 30 || !ids.every(id => typeof id === 'string' && id.length <= 64)) return null
      if (ids.length) options[k.slice(0, 64)] = ids as string[]
    }
  } else if (s.options !== undefined) return null
  const id = (x: unknown) => (typeof x === 'string' && x.length <= 64 ? x : null)
  return { options, menu: s.menu, drinkId: id(s.drinkId), sideId: id(s.sideId) }
}

export function parseOrderRequest(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Requête invalide.' }
  const b = body as Record<string, unknown>
  const customer = (b.customer || {}) as Record<string, unknown>

  const restaurantId = str(b.restaurantId)
  if (!restaurantId || restaurantId.length > 64) return { ok: false, error: 'Restaurant manquant.' }

  const orderNumber = str(b.orderNumber).toUpperCase()
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return { ok: false, error: 'Numéro de commande invalide.' }

  const firstName = str(customer.firstName)
  const lastName = str(customer.lastName)
  const email = str(customer.email).toLowerCase()
  const phone = str(customer.phone)
  const customerErrors = validateCustomer({ firstName, lastName, email, phone })
  const firstError = (Object.keys(customerErrors) as CustomerField[])[0]
  if (firstError) return { ok: false, error: customerErrors[firstError]!, field: firstError }

  const pickupTime = str(b.pickupTime)
  if (!pickupTime || Number.isNaN(new Date(pickupTime).getTime())) return { ok: false, error: 'Choisissez un créneau de retrait.', field: 'pickupTime' }

  if (!Array.isArray(b.items) || b.items.length === 0) return { ok: false, error: 'Votre panier est vide.' }
  if (b.items.length > MAX_LINES) return { ok: false, error: 'Trop d’articles dans une seule commande.' }
  const items: OrderRequest['items'] = []
  for (const raw of b.items as Record<string, unknown>[]) {
    const productId = str(raw?.productId)
    const quantity = Number(raw?.quantity)
    const selection = parseSelection(raw?.selection)
    if (!productId || productId.length > 64 || !selection) return { ok: false, error: 'Article invalide dans le panier.' }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) return { ok: false, error: 'Quantité invalide.' }
    items.push({ productId, quantity, selection })
  }

  return { ok: true, value: { restaurantId, orderNumber, customer: { firstName, lastName, email, phone }, pickupTime, items } }
}
