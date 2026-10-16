// Horaires, statut d'ouverture et créneaux de retrait, toujours calculés en heure de Paris
// (le serveur tourne en UTC et le téléphone du client peut être dans un autre fuseau).
//
// Règles reprises de l'ancien checkout :
//  - créneaux tous les `slot_duration` minutes (10 par défaut) depuis l'ouverture, fermeture incluse ;
//  - premier créneau strictement après « maintenant arrondi à la dizaine suivante » ;
//  - jours fermés et fermetures exceptionnelles exclus ;
//  - seul le premier jour (sur 7) offrant au moins un créneau est proposé.

import type { Closure, DaySchedule } from './types.ts'

export const TIME_ZONE = 'Europe/Paris'
export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

export type CivilDate = { y: number; m: number; d: number }
export type ParisParts = CivilDate & { hh: number; mm: number; weekday: number }

let formatter: Intl.DateTimeFormat | null = null
function parisFormatter() {
  formatter ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  })
  return formatter
}

export function parisParts(date: Date): ParisParts {
  const parts: Record<string, string> = {}
  for (const p of parisFormatter().formatToParts(date)) parts[p.type] = p.value
  return {
    y: Number(parts.year), m: Number(parts.month), d: Number(parts.day),
    hh: Number(parts.hour) % 24, mm: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  }
}

/** Convertit une heure civile parisienne en instant UTC (gère l'heure d'été). */
export function parisToUtc(date: CivilDate, minutes: number): Date {
  const hh = Math.floor(minutes / 60)
  const mm = minutes % 60
  const target = Date.UTC(date.y, date.m - 1, date.d, hh, mm)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const p = parisParts(new Date(guess))
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm)
    const diff = asUtc - target
    if (diff === 0) break
    guess -= diff
  }
  return new Date(guess)
}

export function addDays(date: CivilDate, n: number): CivilDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + n))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

export function dateKey(date: CivilDate): string {
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
}

export function weekdayOf(date: CivilDate): number {
  return (new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay() + 6) % 7
}

export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "12:40" en heure de Paris. */
export function formatParisTime(iso: string | Date): string {
  const p = parisParts(typeof iso === 'string' ? new Date(iso) : iso)
  return formatClock(p.hh * 60 + p.mm)
}

/** "aujourd'hui", "demain" ou "vendredi 17 octobre" (heure de Paris). */
export function formatParisDay(iso: string | Date, now: Date): string {
  const p = parisParts(typeof iso === 'string' ? new Date(iso) : iso)
  const today = parisParts(now)
  const key = dateKey(p)
  if (key === dateKey(today)) return 'aujourd’hui'
  if (key === dateKey(addDays(today, 1))) return 'demain'
  return `${DAY_NAMES[p.weekday].toLowerCase()} ${p.d} ${MONTH_NAMES[p.m - 1]}`
}

/** "Aujourd'hui à 12:40", "Demain à 11:00"… */
export function formatPickup(iso: string, now: Date): string {
  const day = formatParisDay(iso, now)
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${formatParisTime(iso)}`
}

function ranges(s: DaySchedule): [number, number][] {
  const out: [number, number][] = []
  const o1 = toMinutes(s.opening_time_1), c1 = toMinutes(s.closing_time_1)
  const o2 = toMinutes(s.opening_time_2), c2 = toMinutes(s.closing_time_2)
  if (o1 !== null && c1 !== null) out.push([o1, c1])
  if (o2 !== null && c2 !== null) out.push([o2, c2])
  return out
}

function dayIsOpen(schedules: DaySchedule[], closures: Closure[], date: CivilDate): DaySchedule | null {
  const sched = schedules.find(s => s.day_of_week === weekdayOf(date))
  if (!sched || sched.is_closed) return null
  const key = dateKey(date)
  if (closures.some(c => (c.closed_date || '').slice(0, 10) === key)) return null
  return sched
}

export type OpenStatus = {
  isOpen: boolean
  /** Fermeture du service en cours ("15:00") lorsque le restaurant est ouvert. */
  closesAt: string | null
  /** Prochaine ouverture lorsque le restaurant est fermé. */
  nextOpening: { label: string; dayOffset: number; time: string } | null
}

export function getOpenStatus(schedules: DaySchedule[], closures: Closure[], now: Date): OpenStatus {
  const p = parisParts(now)
  const today: CivilDate = { y: p.y, m: p.m, d: p.d }
  const nowMin = p.hh * 60 + p.mm
  const sched = dayIsOpen(schedules, closures, today)
  if (sched) {
    for (const [o, c] of ranges(sched)) {
      if (nowMin >= o && nowMin < c) return { isOpen: true, closesAt: formatClock(c), nextOpening: null }
    }
    const later = ranges(sched).map(r => r[0]).filter(o => o > nowMin).sort((a, b) => a - b)[0]
    if (later !== undefined) {
      return { isOpen: false, closesAt: null, nextOpening: { label: `Aujourd’hui à ${formatClock(later)}`, dayOffset: 0, time: formatClock(later) } }
    }
  }
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i)
    const s = dayIsOpen(schedules, closures, date)
    if (!s) continue
    const first = ranges(s).map(r => r[0]).sort((a, b) => a - b)[0]
    if (first === undefined) continue
    const day = i === 1 ? 'Demain' : DAY_NAMES[weekdayOf(date)]
    return { isOpen: false, closesAt: null, nextOpening: { label: `${day} à ${formatClock(first)}`, dayOffset: i, time: formatClock(first) } }
  }
  return { isOpen: false, closesAt: null, nextOpening: null }
}

/** Instant minimal d'un créneau : maintenant arrondi à la dizaine de minutes suivante (13:03 → 13:10). */
export function earliestPickupThreshold(now: Date): Date {
  const t = new Date(now)
  t.setUTCSeconds(0, 0)
  const next = Math.ceil((t.getUTCMinutes() + 1) / 10) * 10
  t.setUTCMinutes(next)
  return t
}

export type PickupDay = {
  dateKey: string
  dayOffset: number
  /** "aujourd'hui", "demain", "samedi 18 octobre" */
  dayLabel: string
  slots: string[]
}

export function getPickupSlots(schedules: DaySchedule[], closures: Closure[], now: Date, maxDays = 7): PickupDay | null {
  const threshold = earliestPickupThreshold(now).getTime()
  const p = parisParts(now)
  const today: CivilDate = { y: p.y, m: p.m, d: p.d }
  for (let offset = 0; offset < maxDays; offset++) {
    const date = addDays(today, offset)
    const sched = dayIsOpen(schedules, closures, date)
    if (!sched) continue
    const step = Number(sched.slot_duration) || 10
    const slots: string[] = []
    for (const [open, close] of ranges(sched)) {
      for (let m = open; m <= close; m += step) {
        const at = parisToUtc(date, m)
        if (at.getTime() > threshold) slots.push(at.toISOString())
      }
    }
    if (slots.length) {
      const unique = [...new Set(slots)].sort()
      return { dateKey: dateKey(date), dayOffset: offset, dayLabel: formatParisDay(unique[0], now), slots: unique }
    }
  }
  return null
}

/**
 * Vérification serveur d'un créneau : il doit appartenir à la grille d'un jour ouvert,
 * être dans le futur et dans les 7 prochains jours.
 */
export function isValidPickupSlot(iso: string, schedules: DaySchedule[], closures: Closure[], now: Date): boolean {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return false
  if (at.getTime() <= now.getTime()) return false
  if (at.getTime() > now.getTime() + 8 * 24 * 3600_000) return false
  const p = parisParts(at)
  const date: CivilDate = { y: p.y, m: p.m, d: p.d }
  const sched = dayIsOpen(schedules, closures, date)
  if (!sched) return false
  if (at.getUTCSeconds() !== 0 || at.getUTCMilliseconds() !== 0) return false
  const minute = p.hh * 60 + p.mm
  const step = Number(sched.slot_duration) || 10
  return ranges(sched).some(([open, close]) => minute >= open && minute <= close && (minute - open) % step === 0)
}

/** Groupe les créneaux d'une journée par service pour l'affichage. */
export function groupSlotsByService(slots: string[]): { label: string; slots: string[] }[] {
  const midi: string[] = [], soir: string[] = []
  for (const s of slots) {
    const p = parisParts(new Date(s))
    ;(p.hh < 16 ? midi : soir).push(s)
  }
  return [
    ...(midi.length ? [{ label: 'Midi', slots: midi }] : []),
    ...(soir.length ? [{ label: 'Soir', slots: soir }] : []),
  ]
}
