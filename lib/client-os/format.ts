/**
 * BK Labs — Client OS · Formatage
 * -------------------------------
 * Helpers d'affichage. Locale et fuseau sont figés pour que le rendu serveur
 * et le rendu client produisent exactement la même chaîne.
 */

import type { ISODate, ISODateTime } from './types'

const LOCALE = 'fr-FR'
const TZ = 'Europe/Paris'

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: TZ })
const dayMonthShort = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', timeZone: TZ })
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
const money = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** `2026-09-24` → « 24 septembre ». */
export function formatDate(value: ISODate | ISODateTime | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dayMonth.format(date)
}

/** `2026-09-24` → « 24/09 ». */
export function formatShortDate(value: ISODate | ISODateTime | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dayMonthShort.format(date)
}

/** `2026-09-24` → « 24 septembre 2026 ». */
export function formatFullDate(value: ISODate | ISODateTime | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return fullDate.format(date)
}

/** `12500` → « 12 500 € ». */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return money.format(value)
}

/** Aujourd'hui au format `YYYY-MM-DD`, dans le fuseau de l'agence. */
export function today(): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function nowISO(): ISODateTime {
  return new Date().toISOString()
}

/** Nombre de jours entiers entre aujourd'hui et `value`. Négatif = dépassé. */
export function daysUntil(value: ISODate | null): number | null {
  if (!value) return null
  const target = new Date(`${value}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const base = new Date(`${today()}T12:00:00`)
  return Math.round((target.getTime() - base.getTime()) / 86_400_000)
}

/** Nombre de jours écoulés depuis `value`. */
export function daysSince(value: ISODate | ISODateTime | null): number | null {
  if (!value) return null
  const from = new Date(value)
  if (Number.isNaN(from.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86_400_000))
}

/** « aujourd'hui », « il y a 3 j », « il y a 2 sem. » */
export function relativeFromNow(value: ISODateTime | null): string {
  const days = daysSince(value)
  if (days === null) return '—'
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 31) return `il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

/** « dans 8 jours », « en retard de 3 jours », « aujourd'hui ». */
export function deadlineLabel(value: ISODate | null): string {
  const days = daysUntil(value)
  if (days === null) return 'Pas de deadline'
  if (days === 0) return 'Échéance aujourd’hui'
  if (days === 1) return 'Demain'
  if (days > 1) return `Dans ${days} jours`
  if (days === -1) return 'En retard d’1 jour'
  return `En retard de ${Math.abs(days)} jours`
}

/** « DPR Peinture » → « DP ». */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Couleur de pastille dérivée du nom : stable, sans stocker de champ couleur,
 * et toujours dans la palette sobre du produit.
 */
export function avatarToneOf(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return hash % 6
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`
}
