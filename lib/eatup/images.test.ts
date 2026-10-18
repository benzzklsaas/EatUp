import { test } from 'node:test'
import assert from 'node:assert/strict'
import { variantSrcSet } from './images.ts'

const base = 'https://abc.supabase.co/storage/v1/object/public/products/crousty-naan/pop'

test('vignettes : 540 en priorité, paramètre de version conservé', () => {
  assert.equal(
    variantSrcSet(`${base}/tacos-xl@1350.jpg?v=1a2b3c4d`, 'small'),
    `${base}/tacos-xl@540.jpg?v=1a2b3c4d 540w, ${base}/tacos-xl@1350.jpg?v=1a2b3c4d 1350w`,
  )
})

test('fiche produit : jamais le petit format, 1350 ou 1600', () => {
  assert.equal(
    variantSrcSet(`${base}/tacos-xl@1350.jpg`, 'large'),
    `${base}/tacos-xl@1350.jpg 1350w, ${base}/tacos-xl@1600.jpg 1600w`,
  )
})

test('photos existantes (hors convention) : pas de srcset', () => {
  assert.equal(variantSrcSet(`${base}/1712345678901.jpg`), null)
  assert.equal(variantSrcSet(`${base}/smash@540.jpg`), null)
  assert.equal(variantSrcSet('https://exemple.fr/photo@1350x.jpg'), null)
  assert.equal(variantSrcSet(''), null)
})
