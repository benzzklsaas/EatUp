import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jpegSize, normalizeName, planImport, suggestions } from './photo-import.mjs'

// JPEG minimal : SOI, segment APP0, SOF0 1350×1080, EOI.
function fakeJpeg(width, height) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]
  const sof = [0xff, 0xc0, 0x00, 0x11, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  return Buffer.from([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9])
}

test('dimensions JPEG lues dans l’en-tête', () => {
  assert.deepEqual(jpegSize(fakeJpeg(1350, 1080)), { width: 1350, height: 1080 })
  assert.deepEqual(jpegSize(fakeJpeg(540, 360)), { width: 540, height: 360 })
  assert.equal(jpegSize(Buffer.from('pas une image')), null)
})

test('noms normalisés', () => {
  assert.equal(normalizeName('  Crousty M (sauce au choix) '), 'crousty m sauce au choix')
  assert.equal(normalizeName('Frites Chéddar'), 'frites cheddar')
})

const map = {
  photos: [
    { file: 'crousty-m', products: ['Crousty M (sauce au choix)', 'Crousty M'] },
    { file: 'frites-cheddar', products: ['Frites Cheddar'] },
    { file: 'frites-cheddar-bacon', products: ['Frites Cheddar Bacon Oignons frits'] },
    { file: 'tacos-xl', products: ['Tacos XL'] },
  ],
}
const products = [
  { id: '1', name: 'Crousty M (sauce au choix)' },
  { id: '2', name: 'Frites Cheddar' },
  { id: '3', name: 'Frites Cheddar Bacon Oignons Frits' },
  { id: '4', name: 'Frites' },
  { id: '5', name: 'Tacos XXL' },
]

test('correspondance exacte : « Frites Cheddar » ne capte pas la version bacon, les autres restent inchangés', () => {
  const plan = planImport(map, products)
  assert.deepEqual(plan.assignments.map(a => `${a.file}→${a.product.id}`), ['crousty-m→1', 'frites-cheddar→2', 'frites-cheddar-bacon→3'])
  assert.deepEqual(plan.missing.map(m => m.file), ['tacos-xl'])
  assert.deepEqual(plan.untouched.map(p => p.name), ['Frites', 'Tacos XXL'])
})

test('pistes proposées pour une photo sans produit', () => {
  assert.deepEqual(suggestions({ products: ['Tacos'] }, products), ['Tacos XXL'])
})
