import { test } from 'node:test'
import assert from 'node:assert/strict'
import { priceSelection, toggleOption, selectionKey, emptySelection, getMenuOffer } from './pricing.ts'
import { formatPrice } from './money.ts'
import type { OptionGroup, Product, Selection } from './types.ts'

const product = (over: Partial<Product>): Product => ({
  id: 'p', name: 'Produit', description: null, price: 8, category: 'Naans', image_url: null,
  is_available: true, is_online: true, ...over,
})

const naan = product({ id: 'naan', name: 'Naan poulet', price: 9.5, menu_extra_price: 12.5, has_accompagnement: true })
const cola = product({ id: 'cola', name: 'Cola', price: 2, category: 'Boissons', menu_supplement: 0 })
const jus = product({ id: 'jus', name: 'Jus mangue', price: 3, category: 'Boissons', menu_supplement: 1 })
const frites = product({ id: 'frites', name: 'Frites', price: 0, category: 'Accompagnements' })
const potatoes = product({ id: 'pot', name: 'Potatoes', price: 0.5, category: 'Accompagnements' })
const products = [naan, cola, jus, frites, potatoes]

const sauces: OptionGroup = {
  id: 'g-sauce', product_id: 'naan', name: 'Sauce', min_choices: 1, max_choices: 2, items: [
    { id: 's1', group_id: 'g-sauce', name: 'Algérienne', extra_price: 0, is_available: true },
    { id: 's2', group_id: 'g-sauce', name: 'Samouraï', extra_price: 0, is_available: true },
    { id: 's3', group_id: 'g-sauce', name: 'Cheddar', extra_price: 1, is_available: false },
  ],
}
const supplements: OptionGroup = {
  id: 'g-sup', product_id: 'naan', name: 'Suppléments', min_choices: 0, max_choices: 3, items: [
    { id: 'x1', group_id: 'g-sup', name: 'Fromage', extra_price: 1, is_available: true },
    { id: 'x2', group_id: 'g-sup', name: 'Bacon', extra_price: 1.5, is_available: null },
  ],
}
const groups = [sauces, supplements]
const sel = (over: Partial<Selection>): Selection => ({ ...emptySelection(), ...over })

test('plat seul avec options : prix de base + suppléments', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1'], 'g-sup': ['x1', 'x2'] } }), products)
  assert.equal(r.ok, true)
  assert.equal(r.unitPrice, 12)
  assert.equal(r.optionsText, 'Algérienne, Fromage, Bacon')
})

test('groupe obligatoire non rempli', () => {
  const r = priceSelection(naan, groups, sel({}), products)
  assert.equal(r.ok, false)
  assert.deepEqual(r.issues.map(i => i.kind), ['group-min'])
})

test('option indisponible refusée', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s3'] } }), products)
  assert.equal(r.ok, false)
  assert.ok(r.issues.some(i => i.kind === 'option-unavailable'))
})

test('dépassement du maximum refusé (contrôle serveur)', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1', 's2', 's3'] } }), products)
  assert.ok(r.issues.some(i => i.kind === 'group-max'))
})

test('option inventée refusée', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1'], 'g-fake': ['zzz'] } }), products)
  assert.ok(r.issues.some(i => i.kind === 'option-unknown'))
  const r2 = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1', 'x1'] } }), products)
  assert.ok(r2.issues.some(i => i.kind === 'option-unknown'))
})

test('formule : prix formule + supplément boisson + accompagnement', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1'] }, menu: true, drinkId: 'jus', sideId: 'pot' }), products)
  assert.equal(r.ok, true)
  // 9.5 + (12.5 - 9.5) + 1 (jus) + 0.5 (potatoes)
  assert.equal(r.unitPrice, 14)
  assert.equal(r.optionsText, 'Algérienne, 🥤 Jus mangue, 🍟 Potatoes')
})

test('formule : boisson et accompagnement obligatoires', () => {
  const r = priceSelection(naan, groups, sel({ options: { 'g-sauce': ['s1'] }, menu: true }), products)
  assert.deepEqual(r.issues.map(i => i.kind).sort(), ['menu-drink', 'menu-side'])
})

test("formule sans accompagnement si le produit ne l'autorise pas", () => {
  const solo = { ...naan, has_accompagnement: false }
  const r = priceSelection(solo, [], sel({ menu: true, drinkId: 'cola', sideId: 'pot' }), products)
  assert.equal(r.ok, true)
  assert.equal(r.unitPrice, 12.5)
  assert.equal(r.side, null)
})

test('formule impossible sans boisson disponible (règle historique conservée)', () => {
  const noDrinks = [naan, { ...cola, is_available: false }, frites]
  const offer = getMenuOffer(naan, noDrinks)
  assert.equal(offer?.available, false)
  const r = priceSelection(naan, [], sel({ menu: true }), noDrinks)
  assert.ok(r.issues.some(i => i.kind === 'menu-unavailable'))
})

test('produit indisponible refusé, formule absente ignorée', () => {
  const r = priceSelection({ ...naan, is_available: false }, [], sel({}), products)
  assert.ok(r.issues.some(i => i.kind === 'product-unavailable'))
  const plain = product({ id: 'plain', price: 4 })
  assert.equal(getMenuOffer(plain, products), null)
  assert.ok(priceSelection(plain, [], sel({ menu: true, drinkId: 'cola' }), products).issues.some(i => i.kind === 'menu-unavailable'))
})

test('toggleOption reproduit le remplacement au-delà du maximum', () => {
  let s = emptySelection()
  s = toggleOption(s, sauces, sauces.items[0])
  s = toggleOption(s, sauces, sauces.items[1])
  assert.deepEqual(s.options['g-sauce'], ['s1', 's2'])
  const extra = { ...sauces, items: [...sauces.items, { id: 's4', group_id: 'g-sauce', name: 'Blanche', extra_price: 0, is_available: true }] }
  s = toggleOption(s, extra, extra.items[3])
  assert.deepEqual(s.options['g-sauce'], ['s2', 's4'])
  s = toggleOption(s, sauces, sauces.items[2]) // indisponible : aucun effet
  assert.deepEqual(s.options['g-sauce'], ['s2', 's4'])
})

test('clé de panier indépendante de l’ordre de sélection', () => {
  const a = selectionKey('naan', sel({ options: { 'g-sup': ['x2', 'x1'], 'g-sauce': ['s1'] } }))
  const b = selectionKey('naan', sel({ options: { 'g-sauce': ['s1'], 'g-sup': ['x1', 'x2'], 'g-empty': [] } }))
  assert.equal(a, b)
})

test('format de prix français', () => {
  assert.equal(formatPrice(12.5), '12,50 €')
  assert.equal(formatPrice(0.1 + 0.2), '0,30 €')
})
