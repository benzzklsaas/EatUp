import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getRestaurantPageData } from '@/lib/eatup/server/data'
import { CheckoutView } from '@/components/eatup/checkout-view'

type Props = { params: Promise<{ slug: string }> }

export const metadata: Metadata = {
  title: 'Finaliser la commande',
  robots: { index: false },
}

export default async function CheckoutPage({ params }: Props) {
  // Carte et horaires relus à chaque visite : prix et créneaux affichés = ceux validés par le serveur.
  await connection()
  const { slug } = await params
  const data = await getRestaurantPageData(slug)
  if (!data) notFound()
  return (
    <CheckoutView
      restaurant={data.restaurant}
      products={data.products}
      groupsByProduct={data.groupsByProduct}
      schedules={data.schedules}
      closures={data.closures}
      serverNow={new Date().toISOString()}
    />
  )
}
