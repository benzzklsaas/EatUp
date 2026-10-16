import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getRestaurantPageData } from '@/lib/eatup/server/data'
import { RestaurantView } from '@/components/eatup/restaurant-view'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const data = await getRestaurantPageData(slug).catch(() => null)
  if (!data) return { title: 'Restaurant introuvable' }
  const { name, description, cover_image_url } = data.restaurant
  const summary = description || `Commandez chez ${name} en click & collect et récupérez votre repas sur place.`
  return {
    title: `${name} — Commande en ligne`,
    description: summary,
    openGraph: {
      title: `${name} — Commande en ligne`,
      description: summary,
      type: 'website',
      locale: 'fr_FR',
      images: cover_image_url ? [cover_image_url] : undefined,
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  // Rendu à chaque requête : disponibilités, horaires et message du jour toujours à jour.
  await connection()
  const { slug } = await params
  const data = await getRestaurantPageData(slug)
  if (!data) notFound()
  return <RestaurantView {...data} serverNow={new Date().toISOString()} />
}
