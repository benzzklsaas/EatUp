import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addLine, makeLine, migrateLegacyCart, parseStoredCart, replaceLine, setLineQuantity, summarizeCart } from './cart.ts'
import { emptySelection } from './pricing.ts'
import type { Catalog, Product } from './types.ts'

const p = (over: Partial<Product>): Product => ({
  id: 'p', name: 'Produit', description: null, price: 5, category: 'Naans', image_url: null, is_available: true, ...over,
})
const naan = p({ id: 'naan', name: 'Naan', price: 9, menu_extra_price: 12 })
const cola = p({ id: 'cola', name: 'Cola', price: 2, category: 'Boissons' })
const frites = p({ id: 'frites', name: 'Frites', price: 0, category: 'Accompagnements' })
const catalog: Catalog = {
  products: [naan, cola, frites],
  groupsByProduct: {
    naan: [{ id: 'g', product_id: 'naan', name: 'Sauce', min_choices: 1, max_choices: 1, items: [
      { id: 'blanche', group_id: 'g', name: 'Blanche', extra_price: 0, is_available: true },
    ] }],
  },
}

test('configurations identiques fusionnées, quantités bornées', () => {
  const s = { ...emptySelection(), options: { g: ['blanche'] } }
  let lines = addLine([], makeLine(naan, s))
  lines = addLine(lines, makeLine(naan, s, 2))
  assert.equal(lines.length, 1)
  assert.equal(lines[0].quantity, 3)
  lines = setLineQuantity(lines, lines[0].key, 999)
  assert.equal(lines[0].quantity, 50)
  assert.equal(setLineQuantity(lines, lines[0].key, 0).length, 0)
})

test('modification d’une ligne : remplacement à la même place', () => {
  const a = makeLine(cola, emptySelection())
  const b = makeLine(naan, { ...emptySelection(), options: { g: ['blanche'] } })
  const edited = makeLine(naan, { options: { g: ['blanche'] }, menu: true, drinkId: 'cola', sideId: 'frites' })
  const lines = replaceLine([b, a], b.key, edited)
  assert.deepEqual(lines.map(l => l.key), [edited.key, a.key])
})

test('résumé : total recalculé depuis la carte, lignes invalides bloquantes', () => {
  const ok = makeLine(naan, { options: { g: ['blanche'] }, menu: true, drinkId: 'cola', sideId: 'frites' }, 2)
  const invalid = makeLine(naan, emptySelection())
  const missing = { ...makeLine(cola, emptySelection()), productId: 'disparu', key: 'disparu#' }
  const sum = summarizeCart([ok, invalid, missing], catalog)
  assert.equal(sum.total, 24)
  assert.equal(sum.count, 2)
  assert.equal(sum.blocked, true)
  assert.deepEqual(sum.rows.map(r => r.status), ['ok', 'invalid', 'missing'])
})

test('reprise des paniers de l’ancienne version (boisson et accompagnement par nom)', () => {
  const legacy = JSON.stringify([
    { product: { id: 'naan', name: 'Naan' }, quantity: 1, selectedOptions: { g: [{ id: 'blanche', name: 'Blanche' }] }, extraPrice: 3, cartKey: 'x1', menuBoisson: 'Cola', menuAccomp: 'Frites' },
    { product: { id: 'naan', name: 'Naan' }, quantity: 2, selectedOptions: { g: [{ id: 'blanche', name: 'Blanche' }] }, extraPrice: 3, cartKey: 'x2', menuBoisson: 'Cola', menuAccomp: 'Frites' },
    { product: { id: 'cola', name: 'Cola' }, quantity: 1, selectedOptions: {}, extraPrice: 0, cartKey: 'x3' },
  ])
  const lines = migrateLegacyCart(legacy, catalog.products)
  assert.equal(lines.length, 2)
  assert.equal(lines[0].quantity, 3)
  assert.deepEqual(lines[0].selection, { options: { g: ['blanche'] }, menu: true, drinkId: 'cola', sideId: 'frites' })
  assert.equal(summarizeCart(lines, catalog).total, 38)
})

test('données stockées corrompues ignorées', () => {
  assert.deepEqual(parseStoredCart('{oops'), [])
  assert.deepEqual(parseStoredCart(JSON.stringify([{ key: 1 }])), [])
  assert.deepEqual(migrateLegacyCart('null', []), [])
})
