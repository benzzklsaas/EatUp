// Fonctions pures du script d'import de photos (testées par photo-import.test.mjs).

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
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Associe chaque photo de la table de correspondance aux produits du restaurant (nom exact, normalisé).
 * Retourne aussi les photos sans produit et les produits laissés tels quels.
 */
export function planImport(map, products) {
  const byName = new Map()
  for (const p of products) {
    const key = normalizeName(p.name)
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(p)
  }
  const assignments = []
  const missing = []
  const claimed = new Set()
  for (const photo of map.photos) {
    const found = []
    for (const name of photo.products) {
      for (const p of byName.get(normalizeName(name)) || []) {
        if (!claimed.has(p.id)) { found.push(p); claimed.add(p.id) }
      }
    }
    if (found.length) for (const product of found) assignments.push({ file: photo.file, product })
    else missing.push(photo)
  }
  const untouched = products.filter(p => !claimed.has(p.id))
  return { assignments, missing, untouched }
}

/** Produits dont le nom contient un des mots-clés d'une photo introuvable (aide à corriger la table). */
export function suggestions(photo, products) {
  const words = normalizeName(photo.products[0]).split(' ').filter(w => w.length > 2)
  return products.filter(p => words.every(w => normalizeName(p.name).includes(w))).map(p => p.name)
}
