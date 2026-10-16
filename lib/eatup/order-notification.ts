// Contenu de la notification « nouvelle commande » envoyée à l'équipe du restaurant
// (modèle WhatsApp officiel, voir docs/NOTIFICATIONS-WHATSAPP.md).
//
// Les variables d'un modèle WhatsApp ne peuvent contenir ni retour à la ligne, ni tabulation,
// ni plus de 4 espaces consécutifs : tout est donc ramené sur une ligne et borné en longueur.

import { formatPrice } from './money.ts'
import { formatPickup } from './schedule.ts'

export type OrderNotification = {
  restaurantName: string
  orderNumber: string
  firstName: string
  lastName: string
  pickupTime: string
  items: { product_name: string; quantity: number; options: string | null }[]
  total: number
  paymentLabel: string
}

/** Texte compatible avec une variable de modèle WhatsApp. */
export function sanitizeParam(value: string, max = 200): string {
  const flat = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  const text = flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
  return text || '—'
}

/** « Camille T. » : assez pour remettre la commande, sans exposer le nom complet. */
export function customerLabel(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0).toUpperCase()
  return `${firstName.trim()}${initial ? ` ${initial}.` : ''}`
}

/** « 2× Naan poulet (Sauce blanche, 🥤 Cola) · 1× Dessert » */
export function itemsLine(items: OrderNotification['items']): string {
  return items
    .map(i => `${i.quantity}× ${i.product_name}${i.options ? ` (${i.options})` : ''}`)
    .join(' · ')
}

/**
 * Variables du modèle, dans l'ordre :
 * {{1}} n° de commande · {{2}} restaurant · {{3}} client · {{4}} retrait · {{5}} articles · {{6}} total · {{7}} paiement
 */
export function orderTemplateParams(n: OrderNotification, now: Date): string[] {
  return [
    sanitizeParam(n.orderNumber, 20),
    sanitizeParam(n.restaurantName, 60),
    sanitizeParam(customerLabel(n.firstName, n.lastName), 60),
    sanitizeParam(formatPickup(n.pickupTime, now).toLowerCase(), 60),
    sanitizeParam(itemsLine(n.items), 700),
    sanitizeParam(formatPrice(n.total), 20),
    sanitizeParam(n.paymentLabel, 40),
  ]
}

/**
 * Destinataires par restaurant, depuis WHATSAPP_ORDER_RECIPIENTS :
 * {"crousty-naan": ["33612345678", "+33 6 98 76 54 32"]}
 * Numéros au format international ; espaces, « + » et tirets tolérés.
 */
export function parseRecipients(raw: string | undefined, slug: string): string[] {
  if (!raw) return []
  let config: unknown
  try { config = JSON.parse(raw) } catch { return [] }
  if (!config || typeof config !== 'object') return []
  const list = (config as Record<string, unknown>)[slug]
  if (!Array.isArray(list)) return []
  const numbers = list
    .filter((n): n is string => typeof n === 'string')
    .map(n => n.replace(/[\s+().-]/g, ''))
    .filter(n => /^\d{8,15}$/.test(n))
  return [...new Set(numbers)]
}
