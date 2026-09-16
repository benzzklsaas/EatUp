'use client'

/**
 * BK Labs — Client OS · Stockage
 * ------------------------------
 * L'UI ne parle jamais au stockage directement : elle passe par ce contexte.
 *
 * En V1 l'adaptateur écrit dans le `localStorage` du navigateur. Brancher
 * Postgres / Supabase revient à fournir un autre objet respectant
 * `WorkspaceRepository` — aucun composant n'a à changer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SCHEMA_VERSION, STORAGE_KEY } from './constants'
import { nowISO } from './format'
import { seedClients, SEED_USERS } from './seed'
import type { Client, Workspace } from './types'

/* ------------------------------------------------------------------ */
/* Adaptateur de stockage                                              */
/* ------------------------------------------------------------------ */

export type WorkspaceRepository = {
  load(): Promise<Workspace | null>
  save(workspace: Workspace): Promise<void>
  clear(): Promise<void>
}

export function createEmptyWorkspace(): Workspace {
  return { version: SCHEMA_VERSION, users: SEED_USERS, clients: [], updatedAt: nowISO() }
}

export function createSeededWorkspace(): Workspace {
  return { version: SCHEMA_VERSION, users: SEED_USERS, clients: seedClients(), updatedAt: nowISO() }
}

/** Adaptateur navigateur — suffisant pour un outil interne mono-poste. */
export const localRepository: WorkspaceRepository = {
  async load() {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Workspace
      // Une version de schéma inconnue est ignorée plutôt que d'afficher
      // des dossiers à moitié valides.
      if (parsed.version !== SCHEMA_VERSION) return null
      return parsed
    } catch {
      return null
    }
  },
  async save(workspace) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    } catch {
      // Quota dépassé ou navigation privée : on laisse l'app fonctionner en
      // mémoire plutôt que de la casser.
    }
  },
  async clear() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
  },
}

/* ------------------------------------------------------------------ */
/* Contexte                                                            */
/* ------------------------------------------------------------------ */

type WorkspaceContextValue = {
  workspace: Workspace
  /** `false` tant que les données locales ne sont pas lues (rendu serveur). */
  ready: boolean
  clients: Client[]
  getClient(id: string): Client | undefined
  addClient(client: Client): void
  /** Applique une transformation pure au dossier et horodate l'activité. */
  updateClient(id: string, recipe: (client: Client) => Client): void
  removeClient(id: string): void
  resetToDemo(): void
  clearAll(): void
  exportJson(): string
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  children,
  repository = localRepository,
}: {
  children: React.ReactNode
  repository?: WorkspaceRepository
}) {
  const [workspace, setWorkspace] = useState<Workspace>(createEmptyWorkspace)
  const [ready, setReady] = useState(false)
  const hydrated = useRef(false)

  // Lecture initiale — au premier lancement, on amorce avec la démo pour que
  // l'outil ne s'ouvre jamais sur un écran vide.
  useEffect(() => {
    let cancelled = false
    repository.load().then((loaded) => {
      if (cancelled) return
      const next = loaded ?? createSeededWorkspace()
      setWorkspace(next)
      hydrated.current = true
      setReady(true)
      if (!loaded) void repository.save(next)
    })
    return () => {
      cancelled = true
    }
  }, [repository])

  // Écriture différée : une frappe au clavier ne déclenche pas une écriture.
  useEffect(() => {
    if (!hydrated.current) return
    const timer = window.setTimeout(() => void repository.save(workspace), 250)
    return () => window.clearTimeout(timer)
  }, [workspace, repository])

  const commit = useCallback((recipe: (previous: Workspace) => Workspace) => {
    setWorkspace((previous) => ({ ...recipe(previous), updatedAt: nowISO() }))
  }, [])

  const value = useMemo<WorkspaceContextValue>(() => {
    return {
      workspace,
      ready,
      clients: workspace.clients,
      getClient: (id) => workspace.clients.find((client) => client.id === id),
      addClient: (client) => commit((previous) => ({ ...previous, clients: [client, ...previous.clients] })),
      updateClient: (id, recipe) =>
        commit((previous) => ({
          ...previous,
          clients: previous.clients.map((client) => {
            if (client.id !== id) return client
            const next = recipe(client)
            const stamp = nowISO()
            return { ...next, updatedAt: stamp, lastActivityAt: stamp }
          }),
        })),
      removeClient: (id) =>
        commit((previous) => ({
          ...previous,
          clients: previous.clients.filter((client) => client.id !== id),
        })),
      resetToDemo: () => {
        const next = createSeededWorkspace()
        setWorkspace(next)
        void repository.save(next)
      },
      clearAll: () => {
        const next = createEmptyWorkspace()
        setWorkspace(next)
        void repository.save(next)
      },
      exportJson: () => JSON.stringify(workspace, null, 2),
    }
  }, [workspace, ready, commit, repository])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace doit être utilisé dans <WorkspaceProvider>')
  return context
}

/** Raccourci pour les écrans de fiche client. */
export function useClient(id: string) {
  const { getClient, updateClient, ready } = useWorkspace()
  const client = getClient(id)
  const update = useCallback(
    (recipe: (client: Client) => Client) => updateClient(id, recipe),
    [id, updateClient],
  )
  return { client, update, ready }
}
