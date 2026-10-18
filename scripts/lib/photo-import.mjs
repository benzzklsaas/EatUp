// Fonctions pures du script d'import de photos (testées par photo-import.test.mjs).

/** Les trois formats livrés par visuels/outils/composer.py : dossier source → dimensions attendues. */
export const FORMATS = [
  { folder: 'borne-petit', width: 540, height: 360 },
  { folder: 'borne', width: 1350, height: 1080 },
  { folder: 'web', width: 1600, height: 1280 },
]

/** Identifiant utilisable tel quel dans un chemin de stockage (id de photo, slug de restaurant). */
export function isSafeId(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

/** Dimensions d'un JPEG lues dans son en-tête (marqueur SOF), ou null si ce n'est pas un JPEG. */
export function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue }
    const marker = buffer[offset + 1]
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue }
    const length = buffer.readUInt16BE(offset + 2)
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isSof) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    offset += 2 + length
  }
  return null
}

/** Comparaison de noms tolérante à la casse, aux accents, à la ponctuation et aux espaces. */
export function normalizeName(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Vérifie correspondance-eatup.json (liste de { eatup, id, fichiers: { borne, borne-petit, web } }).
 * L'id devient un nom de fichier dans le stockage et chaque chemin doit rester dans son dossier de format :
 * une entrée douteuse est signalée, jamais corrigée. Retourne { entries, errors }.
 */
export function parseCorrespondence(data) {
  if (!Array.isArray(data) || !data.length) return { entries: [], errors: ['la correspondance doit être une liste non vide'] }
  const errors = []
  const ids = new Set()
  const names = new Set()
  data.forEach((entry, i) => {
    const at = `entrée ${i + 1}${typeof entry?.eatup === 'string' ? ` « ${entry.eatup} »` : ''}`
    if (!entry || typeof entry !== 'object') return errors.push(`${at} : objet attendu`)
    const name = typeof entry.eatup === 'string' ? normalizeName(entry.eatup) : ''
    if (!name) errors.push(`${at} : nom EatUp manquant`)
    else if (names.has(name)) errors.push(`${at} : nom EatUp en double`)
    names.add(name)
    if (!isSafeId(entry.id)) errors.push(`${at} : id invalide ${JSON.stringify(entry.id)} (minuscules, chiffres et tirets)`)
    else if (ids.has(entry.id)) errors.push(`${at} : id en double « ${entry.id} »`)
    ids.add(entry.id)
    for (const { folder } of FORMATS) {
      const file = entry.fichiers?.[folder]
      if (typeof file !== 'string' || !new RegExp(`^${folder}/[\\w-]+\\.jpe?g$`, 'i').test(file)) {
        errors.push(`${at} : fichier « ${folder} » invalide ${JSON.stringify(file)} (attendu ${folder}/<nom>.jpg)`)
      }
    }
  })
  return { entries: errors.length ? [] : data, errors }
}

/**
 * Associe chaque entrée de la correspondance aux produits du restaurant portant exactement ce nom
 * (normalisé). Retourne aussi les entrées sans produit et les produits laissés tels quels.
 */
export function planImport(entries, products) {
  const byName = new Map()
  for (const p of products) {
    const key = normalizeName(p.name)
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(p)
  }
  const assignments = []
  const missing = []
  for (const entry of entries) {
    const found = byName.get(normalizeName(entry.eatup)) || []
    if (found.length) for (const product of found) assignments.push({ entry, product })
    else missing.push(entry)
  }
  const claimed = new Set(assignments.map(a => a.product.id))
  const untouched = products.filter(p => !claimed.has(p.id))
  return { assignments, missing, untouched }
}

/** Produits dont le nom contient tous les mots d'une entrée introuvable (aide à corriger la correspondance). */
export function suggestions(entry, products) {
  const compact = name => normalizeName(name).replace(/ /g, '')
  const words = normalizeName(entry.eatup).split(' ').filter(w => w.length > 2)
  if (!words.length) return []
  return products.filter(p => words.every(w => compact(p.name).includes(w))).map(p => p.name)
}
