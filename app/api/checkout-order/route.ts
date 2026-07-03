import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { items, restaurantName, orderNumber, restaurantId, customerEmail } = await req.json()

  if (!restaurantId || !items?.length || !orderNumber) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const { data: resto } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantId)
    .eq('is_open', true)
    .single()

  if (!resto) {
    return NextResponse.json({ error: 'Restaurant introuvable ou fermé' }, { status: 403 })
  }

  // Recalcul des prix depuis la base — les prix client sont ignorés
  const productIds = [...new Set(items.map((i: any) => i.product_id))]
  const { data: products } = await supabase
    .from('products')
    .select('id, price')
    .in('id', productIds)
    .eq('restaurant_id', resto.id)

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 400 })
  }

  const priceMap: Record<string, number> = {}
  for (const p of products) priceMap[p.id] = Number(p.price)

  const lineItems = items.map((i: any) => {
    const basePrice = priceMap[i.product_id]
    const extraPrice = Math.max(0, Math.min(Number(i.price || 0) - basePrice, 50))
    const unitPrice = basePrice + extraPrice
    return {
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${i.product_name} × ${i.quantity}`,
          description: restaurantName,
        },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity: i.quantity,
    }
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/restaurant/${restaurantId}/order-success?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/restaurant/${restaurantId}/checkout`,
    metadata: { orderNumber, restaurantId },
  })

  return NextResponse.json({ url: session.url })
}
