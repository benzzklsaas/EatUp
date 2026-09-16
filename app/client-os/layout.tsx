import type { Metadata } from 'next'
import { PRODUCT_NAME, PRODUCT_OWNER, PRODUCT_TAGLINE } from '@/lib/client-os/constants'
import { ClientOsShell } from './_components/shell'
import './client-os.css'

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_OWNER} — ${PRODUCT_NAME}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${PRODUCT_TAGLINE} Espace interne de gestion des clients et des projets ${PRODUCT_OWNER}.`,
  // Outil interne : jamais indexé.
  robots: { index: false, follow: false },
}

export default function ClientOsLayout({ children }: { children: React.ReactNode }) {
  return <ClientOsShell>{children}</ClientOsShell>
}
