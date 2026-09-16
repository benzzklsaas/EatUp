import type { Client } from '@/lib/client-os/types'

/** Contrat commun à tous les onglets de la fiche client. */
export type PanelProps = {
  client: Client
  update: (recipe: (client: Client) => Client) => void
}
