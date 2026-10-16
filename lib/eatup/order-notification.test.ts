import { test } from 'node:test'
import assert from 'node:assert/strict'
import { customerLabel, itemsLine, orderTemplateParams, parseRecipients, sanitizeParam } from './order-notification.ts'

const notification = {
  restaurantName: 'Croustys Naan',
  orderNumber: 'EAT-AB12CD',
  firstName: 'Camille',
  lastName: 'test',
  pickupTime: '2026-10-16T10:40:00.000Z',
  items: [
    { product_name: 'Naan poulet', quantity: 2, options: 'Sauce blanche, 🥤 Cola, 🍟 Frites' },
    { product_name: 'Dessert', quantity: 1, options: '' },
  ],
  total: 29.5,
  paymentLabel: 'à régler sur place',
}

test('variables du modèle : 7 valeurs, sur une ligne, sans données superflues', () => {
  const params = orderTemplateParams(notification, new Date('2026-10-16T09:00:00Z'))
  assert.deepEqual(params, [
    'EAT-AB12CD',
    'Croustys Naan',
    'Camille T.',
    'aujourd’hui à 12:40',
    '2× Naan poulet (Sauce blanche, 🥤 Cola, 🍟 Frites) · 1× Dessert',
    '29,50\u00a0€',
    'à régler sur place',
  ])
  for (const p of params) assert.doesNotMatch(p, /[\n\t]|\s{4,}/)
})

test('nettoyage : retours à la ligne, espaces multiples, longueur, valeur vide', () => {
  assert.equal(sanitizeParam('Sans\noignons\t   ni\r\nsauce'), 'Sans oignons ni sauce')
  assert.equal(sanitizeParam('x'.repeat(30), 10), `${'x'.repeat(9)}…`)
  assert.equal(sanitizeParam('   '), '—')
})

test('client : prénom et initiale seulement', () => {
  assert.equal(customerLabel(' Inès ', 'martin'), 'Inès M.')
  assert.equal(customerLabel('Inès', ''), 'Inès')
})

test('articles sans options', () => {
  assert.equal(itemsLine([{ product_name: 'Cola', quantity: 3, options: null }]), '3× Cola')
})

test('destinataires par restaurant, numéros normalisés et dédoublonnés', () => {
  const raw = JSON.stringify({ 'crousty-naan': ['+33 6 12 34 56 78', '33612345678', '0612', 42, '33-6-98-76-54-32'], autre: ['33700000000'] })
  assert.deepEqual(parseRecipients(raw, 'crousty-naan'), ['33612345678', '33698765432'])
  assert.deepEqual(parseRecipients(raw, 'inconnu'), [])
  assert.deepEqual(parseRecipients('{pas du json', 'crousty-naan'), [])
  assert.deepEqual(parseRecipients(undefined, 'crousty-naan'), [])
})
