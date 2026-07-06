import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

// Rate limiting: 5 commandes max par IP par heure
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de commandes. Réessayez dans une heure.' }, { status: 429 })
  }
  const { order, items, emailData } = await req.json()

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

  // Récupération des emails depuis la DB — jamais depuis le client
  const { data: restoFull } = await supabase
    .from('restaurants')
    .select('email, name')
    .eq('id', order.restaurant_id)
    .single()

  if (restoFull?.email && emailData?.customerEmail) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eatup-app.fr'
      const esc = (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      const pickupFormatted = new Date(order.pickup_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      const totalStr = recalculatedTotal.toFixed(2)
      const customerName = esc(`${order.first_name} ${order.last_name}`)
      const restaurantName = esc(restoFull.name)
      const orderNumber = esc(order.order_number)

      await Promise.all([
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: 'ben.kacel7@gmail.com',
          subject: `✅ Commande #${orderNumber} confirmée — ${restaurantName}`,
          html: `<p>Bonjour ${customerName}, votre commande #${orderNumber} chez ${restaurantName} est confirmée. Retrait : ${pickupFormatted}. Total : ${totalStr}€</p>`,
        }),
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: 'ben.kacel7@gmail.com',
          subject: `🔔 Nouvelle commande #${orderNumber} — ${customerName} (pour ${restaurantName})`,
          html: `<p>Nouvelle commande #${orderNumber} de ${customerName}. Retrait : ${pickupFormatted}. Total : ${totalStr}€<br><a href="${appUrl}/dashboard/orders">Voir dans le dashboard</a></p>`,
        }),
      ])
    } catch (_) {}
  }

  return NextResponse.json({ order: data })
}
