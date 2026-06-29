import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      event = JSON.parse(body)
    }
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { restaurant_id } = session.metadata || {}

    if (restaurant_id) {
      const { data: existing } = await supabase
        .from('restaurant_subscriptions')
        .select('id')
        .eq('restaurant_id', restaurant_id)
        .single()

      if (existing) {
        await supabase
          .from('restaurant_subscriptions')
          .update({
            status: 'active',
            stripe_subscription_id: session.subscription as string,
          })
          .eq('restaurant_id', restaurant_id)
      } else {
        await supabase.from('restaurant_subscriptions').insert({
          restaurant_id,
          status: 'active',
          stripe_subscription_id: session.subscription as string,
          plan: 'launch',
        })
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase
      .from('restaurant_subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
