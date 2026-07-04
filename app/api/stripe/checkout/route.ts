import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TngVqFOi1P60mkw54gxnI3h' // 29,99€/mois
const COUPON_ID = process.env.STRIPE_COUPON_ID // coupon -10€ pendant 2 mois

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: resto } = await supabase
    .from('restaurants')
    .select('id, name, email')
    .eq('owner_id', user.id)
    .single()

  if (!resto) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

  try {
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: resto.email,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/welcome`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
      metadata: { restaurant_id: resto.id, user_id: user.id },
    }
    if (COUPON_ID) sessionParams.discounts = [{ coupon: COUPON_ID }]
    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('Stripe error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Erreur Stripe' }, { status: 500 })
  }
}
