'use client'

import { useCallback, useEffect, useMemo } from 'react'
import type { Catalog, Product, Selection } from '@/lib/eatup/types'
import {
  addLine, cartStorageKey, legacyCartStorageKey, makeLine, migrateLegacyCart, parseStoredCart,
  replaceLine, setLineQuantity, summarizeCart, type CartLine,
} from '@/lib/eatup/cart'
import { readRaw, useStoredValue, writeRaw } from '@/lib/eatup/client-store'

const EMPTY: CartLine[] = []

export function useCart(slug: string, catalog: Catalog) {
  const key = cartStorageKey(slug)
  const lines = useStoredValue(key, parseStoredCart, EMPTY)

  // Reprise unique d'un panier enregistré par l'ancienne version de la page.
  useEffect(() => {
    const legacyKey = legacyCartStorageKey(slug)
    const legacy = readRaw(legacyKey)
    if (!legacy) return
    if (!parseStoredCart(readRaw(key)).length) {
      const migrated = migrateLegacyCart(legacy, catalog.products)
      if (migrated.length) writeRaw(key, JSON.stringify(migrated))
    }
    writeRaw(legacyKey, null)
  }, [slug, key, catalog.products])

  const save = useCallback((next: CartLine[]) => {
    writeRaw(key, next.length ? JSON.stringify(next) : null)
  }, [key])

  const current = useCallback(() => parseStoredCart(readRaw(key)), [key])

  const add = useCallback((product: Product, selection: Selection, quantity: number) => {
    save(addLine(current(), makeLine(product, selection, quantity)))
  }, [current, save])

  const update = useCallback((oldKey: string, product: Product, selection: Selection, quantity: number) => {
    save(replaceLine(current(), oldKey, makeLine(product, selection, quantity)))
  }, [current, save])

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    save(setLineQuantity(current(), lineKey, quantity))
  }, [current, save])

  const clear = useCallback(() => save([]), [save])
  const restore = useCallback((snapshot: CartLine[]) => save(snapshot), [save])

  const summary = useMemo(() => summarizeCart(lines, catalog), [lines, catalog])

  return { lines, summary, add, update, setQuantity, clear, restore }
}

export type CartApi = ReturnType<typeof useCart>
