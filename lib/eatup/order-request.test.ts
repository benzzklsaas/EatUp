import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateOrderNumber, parseOrderRequest, ORDER_NUMBER_PATTERN } from './order-request.ts'

const valid = () => ({
  restaurantId: 'r1',
  orderNumber: 'EAT-AB12CD',
  customer: { firstName: ' Inès ', lastName: 'Martin', email: 'Ines@Example.fr', phone: '06 12 34 56 78' },
  pickupTime: '2026-10-16T11:15:00.000Z',
  items: [{ productId: 'naan', quantity: 2, selection: { options: { g: ['s1'] }, menu: true, drinkId: 'cola', sideId: null } }],
})

test('requête valide normalisée', () => {
  const r = parseOrderRequest(valid())
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.value.customer.firstName, 'Inès')
  assert.equal(r.value.customer.email, 'ines@example.fr')
})

test('les champs de prix/statut envoyés par le client sont ignorés', () => {
  const body = { ...valid(), total_price: 0.01, status: 'ready', payment_status: 'paid' }
  const r = parseOrderRequest(body)
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(Object.keys(r.value).sort(), ['customer', 'items', 'orderNumber', 'pickupTime', 'restaurantId'])
})

test('refus des données invalides', () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ ...valid(), customer: { ...valid().customer, email: 'pas-un-email' } }, 'email'],
    [{ ...valid(), customer: { ...valid().customer, firstName: '' } }, 'firstName'],
    [{ ...valid(), customer: { ...valid().customer, phone: '<script>' } }, 'phone'],
    [{ ...valid(), pickupTime: 'demain' }, 'pickupTime'],
  ]
  for (const [body, field] of cases) {
    const r = parseOrderRequest(body)
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.field, field)
  }
  assert.equal(parseOrderRequest({ ...valid(), items: [] }).ok, false)
  assert.equal(parseOrderRequest({ ...valid(), items: [{ productId: 'x', quantity: 0, selection: { options: {}, menu: false } }] }).ok, false)
  assert.equal(parseOrderRequest({ ...valid(), items: [{ productId: 'x', quantity: 1.5, selection: { options: {}, menu: false } }] }).ok, false)
  assert.equal(parseOrderRequest({ ...valid(), items: [{ productId: 'x', quantity: 1 }] }).ok, false)
  assert.equal(parseOrderRequest({ ...valid(), orderNumber: 'HACK' }).ok, false)
  assert.equal(parseOrderRequest(null).ok, false)
})

test('numéros de commande lisibles et au bon format', () => {
  let seed = 0
  const fake = (n: number) => Uint8Array.from({ length: n }, () => (seed += 37) % 256)
  for (let i = 0; i < 20; i++) {
    const n = generateOrderNumber(fake)
    assert.match(n, ORDER_NUMBER_PATTERN)
    assert.doesNotMatch(n.slice(4), /[01OI]/)
  }
})
