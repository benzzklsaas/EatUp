import { NextRequest, NextResponse, after } from 'next/server'
import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { adminClient } from '@/lib/eatup/server/supabase'
import { loadRestaurantData } from '@/lib/eatup/server/data'
import { buildOrderEmails, esc, type EmailItem } from '@/lib/eatup/server/order-emails'
import { sendOrderToTeam } from '@/lib/eatup/server/whatsapp'
import { generateOrderNumber, parseOrderRequest } from '@/lib/eatup/order-request'
import { issueMessage, priceSelection } from '@/lib/eatup/pricing'
import { isValidPickupSlot } from '@/lib/eatup/schedule'
import { round2 } from '@/lib/eatup/money'

// Création d'une commande click & collect (paiement sur place).
// Tout ce qui engage le restaurant est recalculé ici à partir de la base :
// produits et options disponibles, règles de choix, prix, créneau de retrait.
// Statut, mode et état de paiement sont fixés par le serveur, jamais par le navigateur.

async function checkRateLimit(ip: string, route: string): Promise<boolean> {
  const supabase = adminClient()
  const now = new Date()
  const resetAt = new Date(now.getTime() + 3600_000).toISOString()

  const { data } = await supabase
    .from('rate_limits')
    .select('count, reset_at')
    .eq('ip', ip)
    .eq('route', route)
    .single()

  if (!data || new Date(data.reset_at) < now) {
    await supabase.from('rate_limits').upsert({ ip, route, count: 1, reset_at: resetAt }, { onConflict: 'ip,route' })
    return true
  }
  if (data.count >= 30) return false
  await supabase.from('rate_limits').update({ count: data.count + 1 }).eq('ip', ip).eq('route', route)
  return true
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!await checkRateLimit(ip, 'orders')) {
    return fail(429, 'Trop de commandes. Réessayez dans une heure.')
  }

  let body: unknown
  try { body = await req.json() } catch { return fail(400, 'Requête invalide.') }

  // Ancien format (page ouverte avant la mise à jour) : les prix venaient du navigateur.
  if (body && typeof body === 'object' && 'order' in body) {
    return fail(409, 'La carte a été mise à jour. Rechargez la page pour finaliser votre commande.', { code: 'OUTDATED_CLIENT' })
  }

  const supabase = adminClient()
  const parsed = parseOrderRequest(body)
  if (!parsed.ok) return fail(400, parsed.error, { code: 'INVALID', field: parsed.field })
  const request = parsed.value
  const now = new Date()

  const { data: restaurantRow, error: restaurantError } = await supabase.from('restaurants').select('*').eq('id', request.restaurantId).maybeSingle()
  if (restaurantError && restaurantError.code !== '22P02') { // 22P02 : identifiant mal formé → introuvable
    console.error('[orders] lecture du restaurant impossible', restaurantError.code, restaurantError.message)
    return fail(503, 'Le restaurant est momentanément injoignable. Réessayez dans un instant.')
  }
  if (!restaurantRow) return fail(404, 'Restaurant introuvable.')

  let data
  try {
    data = await loadRestaurantData(supabase, restaurantRow, now)
  } catch (e) {
    console.error('[orders] lecture de la carte impossible', (e as Error).message)
    return fail(503, 'Le restaurant est momentanément injoignable. Réessayez dans un instant.')
  }

  // ── Articles : disponibilité, règles de choix et prix relus en base ──
  const problems: { productId: string; message: string }[] = []
  const lines: (EmailItem & { product_id: string })[] = []
  for (const item of request.items) {
    const product = data.products.find(p => p.id === item.productId)
    if (!product) {
      problems.push({ productId: item.productId, message: 'Ce produit n’est plus proposé.' })
      continue
    }
    const groups = data.groupsByProduct[product.id] || []
    const priced = priceSelection(product, groups, item.selection, data.products)
    if (!priced.ok) {
      problems.push({ productId: product.id, message: issueMessage(priced.issues[0], groups) })
      continue
    }
    lines.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      price: priced.unitPrice,
      options: priced.optionsText,
    })
  }
  if (problems.length) {
    return fail(409, 'Certains articles de votre panier ont changé. Vérifiez-les avant de commander.', { code: 'ITEMS_INVALID', items: problems })
  }

  // ── Créneau : doit correspondre aux horaires réels (fermetures comprises) ──
  if (!isValidPickupSlot(request.pickupTime, data.schedules, data.closures, now)) {
    return fail(409, 'Ce créneau de retrait n’est plus disponible. Choisissez-en un autre.', { code: 'SLOT_UNAVAILABLE' })
  }

  const total = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0))
  const pickupTime = new Date(request.pickupTime).toISOString()
  const baseOrder = {
    restaurant_id: data.restaurant.id,
    first_name: request.customer.firstName,
    last_name: request.customer.lastName,
    phone: request.customer.phone,
    email: request.customer.email,
    total_price: total,
    pickup_time: pickupTime,
    payment_method: 'cash',
    payment_status: 'unpaid',
    status: 'pending',
  }

  // ── Insertion idempotente : un renvoi du même numéro (réseau coupé) ne crée pas de doublon ──
  let orderNumber = request.orderNumber
  let created: { id: string; order_number: string } | null = null
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const { data: row, error } = await supabase
      .from('orders')
      .insert({ ...baseOrder, order_number: orderNumber })
      .select('id, order_number')
      .single()
    if (row) { created = row; break }
    if (error?.code !== '23505') {
      console.error('[orders] insertion impossible', error?.code, error?.message)
      return fail(500, 'La commande n’a pas pu être enregistrée. Aucun montant n’a été débité : réessayez.')
    }
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number, restaurant_id, email, total_price, pickup_time')
      .eq('order_number', orderNumber)
      .maybeSingle()
    if (existing && existing.restaurant_id === baseOrder.restaurant_id && existing.email === baseOrder.email
      && Math.abs(Number(existing.total_price) - total) < 0.01) {
      return NextResponse.json({ order: { order_number: existing.order_number, pickup_time: existing.pickup_time, total_price: Number(existing.total_price), status: 'pending' }, duplicate: true })
    }
    orderNumber = generateOrderNumber(n => randomBytes(n))
  }
  if (!created) return fail(500, 'La commande n’a pas pu être enregistrée. Réessayez.')

  const { error: itemsError } = await supabase.from('order_items').insert(
    lines.map(l => ({ order_id: created.id, product_id: l.product_id, product_name: l.product_name, quantity: l.quantity, price: l.price, options: l.options })),
  )
  if (itemsError) {
    // Pas de commande « fantôme » sans articles dans le tableau de bord du restaurant.
    await supabase.from('orders').delete().eq('id', created.id)
    console.error('[orders] insertion des articles impossible', itemsError.code, itemsError.message)
    return fail(500, 'La commande n’a pas pu être enregistrée. Réessayez.')
  }

  // ── Emails envoyés après la réponse : la confirmation s'affiche sans attendre Resend ──
  const restaurantEmail: string | null = restaurantRow.email || null
  after(async () => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eatup-app.fr'
    const pickupFormatted = new Date(pickupTime).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
    const customerName = esc(`${baseOrder.first_name} ${baseOrder.last_name}`)
    const restaurantName = esc(data.restaurant.name)
    const safeNumber = esc(created.order_number)
    const { customerHtml, restaurantHtml } = buildOrderEmails({
      appUrl, customerName, restaurantName, orderNumber: safeNumber, pickupFormatted, totalStr: total.toFixed(2), items: lines,
    })
    const sends = [
      resend.emails.send({
        from: 'EatUp <noreply@eatup-app.fr>',
        to: baseOrder.email,
        subject: `✅ Commande #${safeNumber} confirmée — ${restaurantName}`,
        html: customerHtml,
      }),
    ]
    if (restaurantEmail) {
      sends.push(resend.emails.send({
        from: 'EatUp <noreply@eatup-app.fr>',
        to: restaurantEmail,
        subject: `🔔 Nouvelle commande #${safeNumber} — ${customerName} (${restaurantName})`,
        html: restaurantHtml,
      }))
    }
    const results = await Promise.allSettled(sends)
    for (const r of results) {
      const err = r.status === 'rejected' ? r.reason : r.value.error
      if (err) console.error('[orders] email non envoyé', created.order_number, (err as { name?: string })?.name || 'erreur')
    }
  })

  // ── Équipe du restaurant prévenue sur WhatsApp (si configuré pour ce restaurant) ──
  after(() => sendOrderToTeam(data.restaurant.slug, {
    restaurantName: data.restaurant.name,
    orderNumber: created.order_number,
    firstName: baseOrder.first_name,
    lastName: baseOrder.last_name,
    pickupTime,
    items: lines,
    total,
    paymentLabel: 'à régler sur place',
  }))

  return NextResponse.json({ order: { order_number: created.order_number, pickup_time: pickupTime, total_price: total, status: 'pending' } })
}
