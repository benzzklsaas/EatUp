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
    const { restaurant_id, orderNumber } = session.metadata || {}

    // Paiement commande client
    if (orderNumber) {
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('order_number', orderNumber)
    }

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

      // Notification admin
      await resend.emails.send({
        from: 'EatUp <noreply@eatup-app.fr>',
        to: 'ben.kacel7@gmail.com',
        subject: `🎉 Nouveau client — ${newResto?.name || 'Restaurant inconnu'}`,
        html: `<p>Nouveau client EatUp !</p><p><strong>${newResto?.name || ''}</strong> (${newResto?.email || ''}) vient de souscrire à EatUp Pro à 29,99€/mois.</p>`,
      }).catch(() => {})

      // Email de bienvenue au partenaire
      if (newResto?.email) {
        await resend.emails.send({
          from: 'EatUp <noreply@eatup-app.fr>',
          to: newResto.email,
          subject: `🎉 Bienvenue sur EatUp, ${newResto.name} !`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#050810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><div style="max-width:560px;margin:0 auto;padding:40px 24px;"><div style="text-align:center;margin-bottom:32px;"><div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:20px;padding:16px;margin-bottom:16px;"><span style="font-size:32px;">🍽️</span></div><h1 style="color:white;font-size:28px;font-weight:900;letter-spacing:-1px;margin:0 0 8px;">Bienvenue sur EatUp !</h1><p style="color:#6b7280;font-size:15px;margin:0;">Votre restaurant <strong style="color:#818cf8;">${newResto.name}</strong> est maintenant en ligne.</p></div><div style="background:linear-gradient(145deg,#0f172a,#111827);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:28px;margin-bottom:20px;"><h2 style="color:white;font-size:16px;font-weight:700;margin:0 0 16px;">Vos prochaines étapes :</h2><div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;"><div style="background:rgba(99,102,241,0.15);border-radius:10px;padding:8px;font-size:18px;flex-shrink:0;">🍽️</div><div><p style="color:white;font-weight:600;font-size:14px;margin:0 0 3px;">Configurez votre menu</p><p style="color:#4b5563;font-size:13px;margin:0;line-height:1.5;">Ajoutez vos plats, catégories et prix depuis l'onglet Menu.</p></div></div><div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;"><div style="background:rgba(99,102,241,0.15);border-radius:10px;padding:8px;font-size:18px;flex-shrink:0;">⚙️</div><div><p style="color:white;font-weight:600;font-size:14px;margin:0 0 3px;">Vérifiez vos horaires</p><p style="color:#4b5563;font-size:13px;margin:0;line-height:1.5;">Paramètres → Horaires pour ajuster vos créneaux d'ouverture.</p></div></div><div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:0;"><div style="background:rgba(99,102,241,0.15);border-radius:10px;padding:8px;font-size:18px;flex-shrink:0;">📋</div><div><p style="color:white;font-weight:600;font-size:14px;margin:0 0 3px;">Partagez votre lien</p><p style="color:#4b5563;font-size:13px;margin:0;line-height:1.5;">Donnez l'URL de votre page à vos clients pour recevoir vos premières commandes.</p></div></div></div><div style="text-align:center;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:14px;text-decoration:none;">Accéder à mon dashboard →</a></div><p style="text-align:center;color:#1f2937;font-size:12px;margin-top:24px;">EatUp · Click &amp; Collect pour restaurants</p></div></body></html>`,
        }).catch(() => {})
      }
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
            from: 'EatUp <noreply@eatup-app.fr>',
            to: resto.email,
            subject: '⚠️ Paiement échoué — votre abonnement EatUp',
            html: `<p>Bonjour,</p><p>Le renouvellement de votre abonnement EatUp pour <strong>${resto.name}</strong> a échoué.</p><p>Vous avez <strong>2 jours</strong> pour mettre à jour votre moyen de paiement, sinon votre accès sera suspendu.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/subscribe">Mettre à jour mon abonnement</a></p>`,
          }).catch(() => {})
        }
      }
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge & { invoice?: string }
    if (charge.refunded && charge.amount_refunded === charge.amount && charge.invoice) {
      const invoice = await stripe.invoices.retrieve(charge.invoice) as Stripe.Invoice & { subscription?: string }
      if (invoice.subscription) {
        await supabase
          .from('restaurant_subscriptions')
          .update({ status: 'cancelled', past_due_since: null })
          .eq('stripe_subscription_id', invoice.subscription)
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
