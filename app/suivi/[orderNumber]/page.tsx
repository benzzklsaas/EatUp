import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { adminClient } from '@/lib/eatup/server/supabase'
import { getPublicOrder } from '@/lib/eatup/server/orders'
import { OrderTracker } from '@/components/eatup/order-tracker'

type Props = { params: Promise<{ orderNumber: string }> }

export const metadata: Metadata = {
  title: 'Suivi de commande',
  robots: { index: false },
}

export default async function SuiviPage({ params }: Props) {
  await connection()
  const { orderNumber } = await params
  const data = await getPublicOrder(adminClient(), decodeURIComponent(orderNumber))
  if (!data) notFound()
  return <OrderTracker initial={data} serverNow={new Date().toISOString()} />
}
