import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
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

      const { data: newResto } = await supabase
        .from('restaurants')
        .select('name, email')
        .eq('id', restaurant_id)
        .single()

      await resend.emails.send({
        from: 'EatUp <onboarding@resend.dev>',
        to: 'ben.kacel7@gmail.com',
        subject: `🎉 Nouveau client — ${newResto?.name || 'Restaurant inconnu'}`,
        html: `<p>Nouveau client EatUp !</p><p><strong>${newResto?.name || ''}</strong> (${newResto?.email || ''}) vient de souscrire à EatUp Pro à 29,99€/mois.</p>`,
      }).catch(() => {})
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    if (sub.status === 'past_due' || sub.status === 'unpaid') {
      const { data: subRow } = await supabase
        .from('restaurant_subscriptions')
        .select('restaurant_id, past_due_since')
        .eq('stripe_subscription_id', sub.id)
        .single()

      if (subRow && !subRow.past_due_since) {
        const pastDueSince = new Date().toISOString()
        await supabase
          .from('restaurant_subscriptions')
          .update({ status: 'past_due', past_due_since: pastDueSince })
          .eq('stripe_subscription_id', sub.id)

        const { data: resto } = await supabase
          .from('restaurants')
          .select('email, name')
          .eq('id', subRow.restaurant_id)
          .single()

        if (resto?.email) {
          await resend.emails.send({
            from: 'EatUp <onboarding@resend.dev>',
            to: resto.email,
            subject: '⚠️ Paiement échoué — votre abonnement EatUp',
            html: `<p>Bonjour,</p><p>Le renouvellement de votre abonnement EatUp pour <strong>${resto.name}</strong> a échoué.</p><p>Vous avez <strong>2 jours</strong> pour mettre à jour votre moyen de paiement, sinon votre accès sera suspendu.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/subscribe">Mettre à jour mon abonnement</a></p>`,
          }).catch(() => {})
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase
      .from('restaurant_subscriptions')
      .update({ status: 'cancelled', past_due_since: null })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
