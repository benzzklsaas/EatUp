import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { order, items } = await req.json()

  if (!order?.restaurant_id || !items?.length) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const { data: resto } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', order.restaurant_id)
    .single()
  if (!resto) {
    return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })
  }

  // Recalcul des prix côté serveur — les prix client ne sont pas acceptés tels quels
  const productIds = [...new Set(items.map((i: any) => i.product_id))]
  const { data: products } = await supabase
    .from('products')
    .select('id, price')
    .in('id', productIds)
    .eq('restaurant_id', order.restaurant_id)

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 400 })
  }

  const priceMap: Record<string, number> = {}
  for (const p of products) priceMap[p.id] = Number(p.price)

  const verifiedItems = items.map((i: any) => {
    const basePrice = priceMap[i.product_id]
    if (basePrice === undefined) throw new Error('Produit invalide')
    const extraPrice = Math.max(0, Math.min(Number(i.price) - basePrice, 50)) // extra option max 50€
    const unitPrice = basePrice + extraPrice
    return { ...i, price: unitPrice }
  })

  const recalculatedTotal = verifiedItems.reduce(
    (sum: number, i: any) => sum + i.price * Number(i.quantity), 0
  )

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...order, total_price: recalculatedTotal })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Erreur' }, { status: 500 })
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    verifiedItems.map((i: any) => ({ ...i, order_id: data.id }))
  )

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ order: data })
}
