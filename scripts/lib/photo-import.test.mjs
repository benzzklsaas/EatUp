import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FORMATS, isSafeId, jpegSize, normalizeName, parseCorrespondence, planImport, suggestions } from './photo-import.mjs'

// Copie de visuels/exports/pop/correspondance-eatup.json (dépôt crousty-naan, branche visuels-pop) :
// 40 produits Croustys Naan avec photo « pop street ».
const CROUSTY = JSON.parse(readFileSync(new URL('./fixtures/correspondance-crousty-naan.json', import.meta.url), 'utf8'))
// Produits de la carte encore sans photo maison : ils gardent leur image actuelle.
const SANS_PHOTO = ['Naan Nutella', 'Naan Miel', 'Cheese Naan']

// JPEG minimal : SOI, segment APP0, SOF0 1350×1080, EOI.
function fakeJpeg(width, height) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]
  const sof = [0xff, 0xc0, 0x00, 0x11, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  return Buffer.from([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9])
}

function entry(eatup, id, overrides = {}) {
  return { eatup, id, fichiers: { borne: `borne/${id}.jpg`, 'borne-petit': `borne-petit/${id}.jpg`, web: `web/${id}.jpg` }, ...overrides }
}

test('dimensions JPEG lues dans l’en-tête', () => {
  assert.deepEqual(jpegSize(fakeJpeg(1350, 1080)), { width: 1350, height: 1080 })
  assert.deepEqual(jpegSize(fakeJpeg(540, 360)), { width: 540, height: 360 })
  assert.equal(jpegSize(Buffer.from('pas une image')), null)
})

test('noms normalisés', () => {
  assert.equal(normalizeName('  Crousty M (sauce au choix) '), 'crousty m sauce au choix')
  assert.equal(normalizeName('Coca-Cola Zéro'), 'coca cola zero')
})

test('formats attendus : 540×360, 1350×1080, 1600×1280', () => {
  assert.deepEqual(FORMATS.map(f => `${f.folder}:${f.width}×${f.height}`), ['borne-petit:540×360', 'borne:1350×1080', 'web:1600×1280'])
})

test('correspondance Croustys Naan : 40 entrées valides, ids sûrs pour le stockage', () => {
  const { entries, errors } = parseCorrespondence(CROUSTY)
  assert.deepEqual(errors, [])
  assert.equal(entries.length, 40)
  assert.ok(entries.every(e => isSafeId(e.id)))
  for (const name of SANS_PHOTO) assert.ok(!entries.some(e => normalizeName(e.eatup) === normalizeName(name)), name)
})

test('correspondance refusée : id ou chemin dangereux, format manquant, doublons', () => {
  const { entries, errors } = parseCorrespondence([
    { ...entry('Tacos M', 'tacos-m'), id: '../tacos-m' },
    entry('Tacos L', 'tacos-l', { fichiers: { borne: 'borne/../../etc/passwd.jpg', 'borne-petit': 'borne-petit/tacos-l.jpg', web: 'web/tacos-l.jpg' } }),
    entry('Tacos XL', 'tacos-xl', { fichiers: { borne: 'borne/tacos-xl.jpg', 'borne-petit': 'borne-petit/tacos-xl.jpg' } }),
    entry('Frite', 'frites'),
    entry('frite', 'frites-2'),
    entry('Frites Cheddar', 'frites'),
  ])
  assert.deepEqual(entries, [])
  assert.equal(errors.length, 5)
  assert.match(errors[0], /Tacos M.*id invalide/)
  assert.match(errors[1], /Tacos L.*borne.*invalide/)
  assert.match(errors[2], /Tacos XL.*web.*invalide/)
  assert.match(errors[3], /frite.*nom EatUp en double/)
  assert.match(errors[4], /Frites Cheddar.*id en double/)
  assert.deepEqual(parseCorrespondence({}).errors, ['la correspondance doit être une liste non vide'])
})

test('carte Croustys Naan : 40 produits remplacés, chacun par sa propre photo, 3 inchangés', () => {
  // Noms tels qu'en base, casse et accents non garantis : la comparaison les ignore.
  const products = [...CROUSTY.map(e => e.eatup), ...SANS_PHOTO].map((name, i) => ({ id: `p${i}`, name: i % 3 ? name : name.toUpperCase() }))
  const plan = planImport(CROUSTY, products)
  assert.equal(plan.assignments.length, 40)
  for (const a of plan.assignments) assert.equal(normalizeName(a.product.name), normalizeName(a.entry.eatup))
  assert.deepEqual(plan.missing, [])
  assert.deepEqual(plan.untouched.map(p => normalizeName(p.name)), SANS_PHOTO.map(normalizeName))
})

test('nom exact : « Smash », « Frite » et « Sandwich Cheese Naan » ne captent pas leurs voisins', () => {
  const products = ['Smash', 'Smash Burger', 'Double Smash', 'Smash Mountain', 'Frite', 'Frites Cheddar', 'Frites Cheddar Bacon Oignons frits', 'Sandwich Cheese Naan', 'Cheese Naan']
    .map((name, i) => ({ id: String(i), name }))
  const plan = planImport([entry('Smash', 'smash'), entry('Frite', 'frites'), entry('Frites Cheddar', 'frites-cheddar'), entry('Sandwich Cheese Naan', 'sandwich-cheese-naan')], products)
  assert.deepEqual(plan.assignments.map(a => `${a.entry.id}→${a.product.name}`), ['smash→Smash', 'frites→Frite', 'frites-cheddar→Frites Cheddar', 'sandwich-cheese-naan→Sandwich Cheese Naan'])
  assert.deepEqual(plan.untouched.map(p => p.name), ['Smash Burger', 'Double Smash', 'Smash Mountain', 'Frites Cheddar Bacon Oignons frits', 'Cheese Naan'])
})

test('entrée sans produit : signalée avec des pistes, rien n’est attribué', () => {
  const products = [{ id: '1', name: 'Capri-Sun' }, { id: '2', name: 'Le Smash' }]
  const plan = planImport([entry('CapriSun', 'capri-sun'), entry('Smash', 'smash')], products)
  assert.deepEqual(plan.assignments, [])
  assert.deepEqual(plan.missing.map(m => m.id), ['capri-sun', 'smash'])
  assert.deepEqual(suggestions(plan.missing[0], products), ['Capri-Sun'])
  assert.deepEqual(suggestions(plan.missing[1], products), ['Le Smash'])
})
