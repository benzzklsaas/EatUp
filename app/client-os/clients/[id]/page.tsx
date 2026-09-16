import { Suspense } from 'react'
import { ClientWorkspace } from './workspace'

/**
 * `ClientWorkspace` lit `?tab=` via `useSearchParams` : la frontière Suspense
 * est exigée par Next pour les pages statiques qui lisent les paramètres
 * d'URL côté client.
 */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={null}>
      <ClientWorkspace id={id} />
    </Suspense>
  )
}
