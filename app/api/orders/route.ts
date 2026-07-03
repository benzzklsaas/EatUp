import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
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

  // Envoi des emails côté serveur (jamais exposé au client)
  if (emailData?.customerEmail && emailData?.restaurantEmail) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eatup-app.fr'
      const itemsHtml = verifiedItems.map((i: any) => `
        <tr>
          <td style="padding:8px 0;color:#cbd5e1;font-size:14px">${i.product_name} <span style="color:#475569">×${i.quantity}</span></td>
          <td style="padding:8px 0;text-align:right;color:#94a3b8;font-size:14px">${(i.price * i.quantity).toFixed(2)}€</td>
        </tr>`).join('')
      const pickupFormatted = new Date(order.pickup_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      const totalStr = recalculatedTotal.toFixed(2)
      const customerName = `${order.first_name} ${order.last_name}`

      await Promise.all([
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: emailData.customerEmail,
          subject: `✅ Commande #${order.order_number} confirmée — ${emailData.restaurantName}`,
          html: `<p>Bonjour ${customerName}, votre commande #${order.order_number} chez ${emailData.restaurantName} est confirmée. Retrait : ${pickupFormatted}. Total : ${totalStr}€</p>`,
        }),
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: emailData.restaurantEmail,
          subject: `🔔 Nouvelle commande #${order.order_number} — ${customerName}`,
          html: `<p>Nouvelle commande #${order.order_number} de ${customerName}. Retrait : ${pickupFormatted}. Total : ${totalStr}€<br><a href="${appUrl}/dashboard/orders">Voir dans le dashboard</a></p>`,
        }),
      ])
    } catch (_) {}
  }

  return NextResponse.json({ order: data })
}
