import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/eatup/server/supabase'
import { getPublicOrder } from '@/lib/eatup/server/orders'

// Suivi public d'une commande : statut, retrait, articles. Aucune donnée personnelle du client.
export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  try {
    const data = await getPublicOrder(adminClient(), decodeURIComponent(orderNumber))
    if (!data) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[orders/track]', (e as Error).message)
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
