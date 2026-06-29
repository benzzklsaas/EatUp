import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS = {
  launch: 'price_1TngRzFOi1P60mkwELrZBdd6',
  standard: 'price_1TngVqFOi1P60mkw54gxnI3h',
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
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

  const { plan } = await req.json()
  const priceId = plan === 'standard' ? PRICE_IDS.standard : PRICE_IDS.launch

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: resto.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
    metadata: { restaurant_id: resto.id, user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
