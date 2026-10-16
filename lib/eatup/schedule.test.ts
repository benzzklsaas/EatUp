import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getOpenStatus, getPickupSlots, isValidPickupSlot, earliestPickupThreshold,
  parisToUtc, formatParisTime, formatPickup,
} from './schedule.ts'
import type { DaySchedule } from './types.ts'

// Semaine type : lundi→samedi 11:00-14:30 et 18:00-22:00, dimanche fermé, créneaux de 15 min.
const week: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  is_closed: i === 6,
  opening_time_1: '11:00:00', closing_time_1: '14:30:00',
  opening_time_2: '18:00:00', closing_time_2: '22:00:00',
  slot_duration: 15,
}))

// 2026-10-16 est un vendredi ; Paris est en UTC+2 jusqu'au 25 octobre.
const at = (iso: string) => new Date(iso)

test('conversion heure de Paris ↔ UTC (été et hiver)', () => {
  assert.equal(parisToUtc({ y: 2026, m: 10, d: 16 }, 12 * 60).toISOString(), '2026-10-16T10:00:00.000Z')
  assert.equal(parisToUtc({ y: 2026, m: 12, d: 1 }, 12 * 60).toISOString(), '2026-12-01T11:00:00.000Z')
  assert.equal(formatParisTime('2026-10-16T10:00:00.000Z'), '12:00')
})

test('ouvert pendant le service, en heure de Paris', () => {
  const s = getOpenStatus(week, [], at('2026-10-16T10:30:00Z')) // 12:30 à Paris
  assert.equal(s.isOpen, true)
  assert.equal(s.closesAt, '14:30')
})

test('fermé entre deux services : prochaine ouverture le soir', () => {
  const s = getOpenStatus(week, [], at('2026-10-16T13:00:00Z')) // 15:00
  assert.equal(s.isOpen, false)
  assert.equal(s.nextOpening?.label, 'Aujourd’hui à 18:00')
})

test('samedi soir après fermeture : dimanche fermé, prochaine ouverture lundi', () => {
  const s = getOpenStatus(week, [], at('2026-10-17T21:00:00Z')) // samedi 23:00
  assert.equal(s.nextOpening?.label, 'Lundi à 11:00')
})

test('fermeture exceptionnelle prise en compte dans le statut', () => {
  const s = getOpenStatus(week, [{ closed_date: '2026-10-16' }], at('2026-10-16T10:30:00Z'))
  assert.equal(s.isOpen, false)
  assert.equal(s.nextOpening?.label, 'Demain à 11:00')
})

test('arrondi à la dizaine suivante sans saut d’heure (bug 12:52 → 14:00 corrigé)', () => {
  assert.equal(earliestPickupThreshold(at('2026-10-16T10:52:30Z')).toISOString(), '2026-10-16T11:00:00.000Z')
  assert.equal(earliestPickupThreshold(at('2026-10-16T10:03:00Z')).toISOString(), '2026-10-16T10:10:00.000Z')
  assert.equal(earliestPickupThreshold(at('2026-10-16T10:10:00Z')).toISOString(), '2026-10-16T10:20:00.000Z')
})

test('créneaux du jour : strictement après le seuil, fermeture incluse, deux services', () => {
  const day = getPickupSlots(week, [], at('2026-10-16T10:52:00Z')) // 12:52 → seuil 13:00
  assert.ok(day)
  assert.equal(day.dayOffset, 0)
  assert.equal(formatParisTime(day.slots[0]), '13:15')
  assert.ok(day.slots.map(s => formatParisTime(s)).includes('14:30'))
  assert.ok(day.slots.map(s => formatParisTime(s)).includes('22:00'))
  assert.equal(day.dayLabel, 'aujourd’hui')
})

test('après le dernier service : créneaux du prochain jour ouvert, fermetures exclues', () => {
  const day = getPickupSlots(week, [{ closed_date: '2026-10-19' }], at('2026-10-17T21:00:00Z'))
  assert.ok(day)
  assert.equal(day.dateKey, '2026-10-20') // dimanche fermé, lundi 19 fermeture exceptionnelle
  assert.equal(formatParisTime(day.slots[0]), '11:00')
})

test('aucun horaire : aucun créneau', () => {
  assert.equal(getPickupSlots([], [], at('2026-10-16T10:00:00Z')), null)
})

test('validation serveur des créneaux', () => {
  const now = at('2026-10-16T10:52:00Z')
  assert.equal(isValidPickupSlot('2026-10-16T11:15:00.000Z', week, [], now), true) // 13:15
  assert.equal(isValidPickupSlot('2026-10-16T11:20:00.000Z', week, [], now), false) // hors grille
  assert.equal(isValidPickupSlot('2026-10-16T10:45:00.000Z', week, [], now), false) // passé
  assert.equal(isValidPickupSlot('2026-10-16T14:00:00.000Z', week, [], now), false) // 16:00, entre services
  assert.equal(isValidPickupSlot('2026-10-18T10:00:00.000Z', week, [], now), false) // dimanche
  assert.equal(isValidPickupSlot('2026-10-17T09:00:00.000Z', week, [{ closed_date: '2026-10-17' }], now), false)
  assert.equal(isValidPickupSlot('2026-10-17T09:00:00.000Z', week, [], now), true) // samedi 11:00
  assert.equal(isValidPickupSlot('pas une date', week, [], now), false)
})

test('libellés de retrait', () => {
  const now = at('2026-10-16T10:00:00Z')
  assert.equal(formatPickup('2026-10-16T11:15:00.000Z', now), 'Aujourd’hui à 13:15')
  assert.equal(formatPickup('2026-10-17T09:00:00.000Z', now), 'Demain à 11:00')
  assert.equal(formatPickup('2026-10-20T09:00:00.000Z', now), 'Mardi 20 octobre à 11:00')
})
