'use client'

// Petit magasin persistant (localStorage) compatible useSyncExternalStore :
// rendu serveur sans panier, synchronisation entre onglets, repli en mémoire
// si le stockage est indisponible (navigation privée, quota, cookies bloqués).

import { useCallback, useSyncExternalStore } from 'react'

const memory = new Map<string, string>()
let storageBroken = false
const listeners = new Set<() => void>()

export function readRaw(key: string): string | null {
  if (!storageBroken) {
    try { return window.localStorage.getItem(key) } catch { storageBroken = true }
  }
  return memory.get(key) ?? null
}

export function writeRaw(key: string, value: string | null) {
  if (!storageBroken) {
    try {
      if (value === null) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, value)
    } catch {
      storageBroken = true
    }
  }
  if (storageBroken) {
    if (value === null) memory.delete(key)
    else memory.set(key, value)
  }
  listeners.forEach(l => l())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

const parsedCache = new Map<string, { raw: string | null; value: unknown }>()

/** Valeur JSON persistée, avec une référence stable tant que le contenu ne change pas. */
export function useStoredValue<T>(key: string, parse: (raw: string | null) => T, serverValue: T): T {
  const getSnapshot = useCallback(() => {
    const raw = readRaw(key)
    const cached = parsedCache.get(key)
    if (cached && cached.raw === raw) return cached.value as T
    const value = parse(raw)
    parsedCache.set(key, { raw, value })
    return value
  }, [key, parse])
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue)
}
