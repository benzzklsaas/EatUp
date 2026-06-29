import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { items, restaurantName, orderNumber, restaurantId, customerEmail } = await req.json()

  const lineItems = items.map((i: any) => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: `${i.product_name} × ${i.quantity}`,
        description: restaurantName,
      },
      unit_amount: Math.round(i.price * 100),
    },
    quantity: i.quantity,
  }))

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
