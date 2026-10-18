#!/usr/bin/env node
// Importe des photos produits préparées en 3 tailles (540 / 1350 / 1600) dans Supabase Storage
// et met à jour products.image_url des produits listés dans correspondance-eatup.json.
// Voir docs/PHOTOS-PRODUITS.md.
//
//   Vérifier (aucune écriture) :
//     node --env-file=.env.local scripts/import-product-photos.mjs \
//       --restaurant crousty-naan --source "/chemin/crousty-naan/visuels/exports/pop"
//   Appliquer :            … la même commande + --apply
//   Revenir en arrière :   node --env-file=.env.local scripts/import-product-photos.mjs --rollback <sauvegarde.json>
//
// La correspondance est lue dans <source>/correspondance-eatup.json (ou --correspondance <fichier>).
// Les fichiers source sont seulement lus, jamais modifiés ni recadrés.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { FORMATS, isSafeId, jpegSize, parseCorrespondence, planImport, suggestions } from './lib/photo-import.mjs'

const BUCKET = 'products'

function args() {
  const out = { apply: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') out.apply = true
    else if (a === '--restaurant') out.restaurant = argv[++i]
    else if (a === '--source') out.source = argv[++i]
    else if (a === '--correspondance') out.correspondence = argv[++i]
    else if (a === '--rollback') out.rollback = argv[++i]
    else throw new Error(`Option inconnue : ${a}`)
  }
  return out
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (lancer avec --env-file=.env.local).')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function rollback(sb, file) {
  const backup = JSON.parse(readFileSync(file, 'utf8'))
  console.log(`Restauration de ${backup.products.length} produit(s) depuis ${file}…`)
  for (const p of backup.products) {
    const { error } = await sb.from('products').update({ image_url: p.image_url }).eq('id', p.id)
    console.log(`${error ? '✗' : '✓'} ${p.name}${error ? ` — ${error.message}` : ''}`)
  }
}

function readCorrespondence(file) {
  let data
  try { data = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { throw new Error(`Lecture de ${file} impossible : ${e.message}`) }
  const { entries, errors } = parseCorrespondence(data)
  if (errors.length) throw new Error(`Correspondance à corriger (${file}) :\n  ${errors.join('\n  ')}`)
  return entries
}

async function main() {
  const opts = args()
  const sb = client()
  if (opts.rollback) return rollback(sb, opts.rollback)
  if (!opts.restaurant || !opts.source) throw new Error('Options requises : --restaurant <slug> --source <dossier des exports>')
  if (!isSafeId(opts.restaurant)) throw new Error(`Slug de restaurant invalide : ${opts.restaurant}`)

  const source = resolve(opts.source)
  const correspondenceFile = opts.correspondence ? resolve(opts.correspondence) : join(source, 'correspondance-eatup.json')
  const entries = readCorrespondence(correspondenceFile)
  const storagePrefix = `${opts.restaurant}/pop`

  // 1. Fichiers : présents, JPEG, aux dimensions attendues.
  const problems = []
  const files = {}
  for (const entry of entries) {
    files[entry.id] = {}
    for (const format of FORMATS) {
      const path = join(source, entry.fichiers[format.folder])
      if (!existsSync(path)) { problems.push(`manquant : ${path}`); continue }
      const buffer = readFileSync(path)
      const size = jpegSize(buffer)
      if (!size) problems.push(`pas un JPEG : ${path}`)
      else if (size.width !== format.width || size.height !== format.height) problems.push(`${path} : ${size.width}×${size.height} au lieu de ${format.width}×${format.height}`)
      files[entry.id][format.width] = buffer
    }
  }

  // 2. Produits du restaurant.
  const { data: resto, error: restoError } = await sb.from('restaurants').select('id, name').eq('slug', opts.restaurant).maybeSingle()
  if (restoError || !resto) throw new Error(`Restaurant « ${opts.restaurant} » introuvable${restoError ? ` : ${restoError.message}` : ''}`)
  const { data: products, error: productsError } = await sb.from('products').select('id, name, category, image_url').eq('restaurant_id', resto.id).order('name')
  if (productsError) throw new Error(`Lecture des produits impossible : ${productsError.message}`)
  const plan = planImport(entries, products)

  console.log(`\n${resto.name} — ${products.length} produits, ${entries.length} photos dans ${correspondenceFile}\n`)
  console.log(`PHOTO REMPLACÉE (${plan.assignments.length})`)
  for (const a of plan.assignments) console.log(`  ${a.product.name.padEnd(40)} ← ${a.entry.id}`)
  if (plan.missing.length) {
    console.log(`\nPHOTO SANS PRODUIT CORRESPONDANT (${plan.missing.length}) — nom EatUp à corriger dans la correspondance`)
    for (const m of plan.missing) {
      const hints = suggestions(m, products)
      console.log(`  ${m.id.padEnd(28)} cherchait : ${m.eatup}${hints.length ? `  — produits proches : ${hints.join(', ')}` : ''}`)
    }
  }
  console.log(`\nINCHANGÉS (${plan.untouched.length})`)
  for (const p of plan.untouched) console.log(`  ${p.name}`)
  if (problems.length) {
    console.log('\nFICHIERS À CORRIGER')
    for (const p of problems) console.log(`  ${p}`)
  }

  if (!opts.apply) {
    console.log('\nVérification seule : rien n’a été modifié. Ajouter --apply pour importer.')
    return
  }
  if (problems.length) throw new Error('Import annulé : corriger les fichiers signalés ci-dessus.')
  if (!plan.assignments.length) throw new Error('Aucun produit à mettre à jour.')

  // 3. Sauvegarde des URL actuelles, envoi des fichiers, mise à jour des produits.
  const backupFile = `photo-import-sauvegarde-${opts.restaurant}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(backupFile, JSON.stringify({ restaurant: opts.restaurant, products: plan.assignments.map(a => ({ id: a.product.id, name: a.product.name, image_url: a.product.image_url })) }, null, 2))
  console.log(`\nSauvegarde des anciennes photos : ${backupFile}`)

  const urls = {}
  for (const id of new Set(plan.assignments.map(a => a.entry.id))) {
    for (const [width, buffer] of Object.entries(files[id])) {
      const path = `${storagePrefix}/${id}@${width}.jpg`
      const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw new Error(`Envoi de ${path} impossible : ${error.message}`)
    }
    // Paramètre de version : une nouvelle génération des visuels n'est jamais masquée par un cache.
    const version = createHash('sha1').update(files[id]['1350']).digest('hex').slice(0, 8)
    urls[id] = `${sb.storage.from(BUCKET).getPublicUrl(`${storagePrefix}/${id}@1350.jpg`).data.publicUrl}?v=${version}`
    console.log(`✓ ${id} envoyé (540, 1350, 1600)`)
  }
  for (const a of plan.assignments) {
    const { error } = await sb.from('products').update({ image_url: urls[a.entry.id] }).eq('id', a.product.id)
    if (error) throw new Error(`Mise à jour de « ${a.product.name} » impossible : ${error.message} (restaurer avec --rollback ${backupFile})`)
    console.log(`✓ ${a.product.name}`)
  }
  console.log(`\nTerminé : ${plan.assignments.length} produit(s) mis à jour. Retour arrière : --rollback ${backupFile}`)
}

main().catch(e => { console.error(`\n✗ ${e.message}`); process.exit(1) })
