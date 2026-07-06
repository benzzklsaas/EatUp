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
      const pickupFormatted = new Date(order.pickup_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      const totalStr = recalculatedTotal.toFixed(2)
      const customerName = esc(`${order.first_name} ${order.last_name}`)
      const restaurantName = esc(restoFull.name)
      const orderNumber = esc(order.order_number)

      const itemsHtml = verifiedItems.map((i: any) => `
        <tr>
          <td style="padding:8px 0;color:#cbd5e1;font-size:14px">${esc(i.product_name)} <span style="color:#475569">×${i.quantity}</span>${i.options ? `<br><span style="color:#475569;font-size:12px">${esc(i.options)}</span>` : ''}</td>
          <td style="padding:8px 0;text-align:right;color:#94a3b8;font-size:14px">${(i.price * i.quantity).toFixed(2)}€</td>
        </tr>
      `).join('')

      const customerHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding-bottom:28px;text-align:center">
        <span style="font-size:22px;font-weight:800;color:#0f172a">EatUp</span>
      </td></tr>
      <tr><td style="background:#0f172a;border-radius:20px 20px 0 0;padding:40px 36px 32px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">Commande confirmée !</h1>
        <p style="color:#94a3b8;font-size:15px;margin:0">Bonjour <strong style="color:#e2e8f0">${customerName}</strong>, votre commande chez <strong style="color:#60a5fa">${restaurantName}</strong> est bien enregistrée.</p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
        <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0;letter-spacing:-1px">#${orderNumber}</p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 24px;border-top:1px solid #334155">
        <div style="background:#0f172a;border-radius:14px;padding:20px 24px">
          <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 16px">Détail de votre commande</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr><td colspan="2" style="padding-top:14px;border-top:1px solid #334155"></td></tr>
            <tr><td style="color:#ffffff;font-weight:700;font-size:16px;padding-top:4px">Total</td><td style="color:#3b82f6;font-weight:800;font-size:16px;text-align:right;padding-top:4px">${totalStr}€</td></tr>
          </table>
        </div>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 32px">
        <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca);border-radius:14px;padding:20px 24px">
          <p style="color:#bfdbfe;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 6px">Heure de retrait</p>
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;text-transform:capitalize">🕐 ${pickupFormatted}</p>
        </div>
      </td></tr>
      <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#475569;font-size:13px;margin:0 0 4px">Des questions ? Contactez directement le restaurant.</p>
        <p style="color:#334155;font-size:11px;margin:0">© 2026 EatUp · Click &amp; Collect pour restaurants</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

      const restaurantHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding-bottom:28px;text-align:center">
        <span style="font-size:22px;font-weight:800;color:#0f172a">EatUp</span>
      </td></tr>
      <tr><td style="background:#0f172a;border-radius:20px 20px 0 0;padding:36px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🔔</div>
        <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px">Nouvelle commande !</h1>
        <p style="color:#94a3b8;font-size:15px;margin:0">Client : <strong style="color:#e2e8f0">${customerName}</strong></p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
        <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0">#${orderNumber}</p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 24px">
        <div style="background:#0f172a;border-radius:14px;padding:20px 24px">
          <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 16px">Articles commandés</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr><td colspan="2" style="padding-top:14px;border-top:1px solid #334155"></td></tr>
            <tr><td style="color:#ffffff;font-weight:700;font-size:16px;padding-top:4px">Total</td><td style="color:#10b981;font-weight:800;font-size:16px;text-align:right;padding-top:4px">${totalStr}€</td></tr>
          </table>
        </div>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 24px">
        <div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:14px;padding:20px 24px">
          <p style="color:#6ee7b7;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 6px">Retrait prévu</p>
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;text-transform:capitalize">🕐 ${pickupFormatted}</p>
        </div>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 32px;text-align:center">
        <a href="${appUrl}/dashboard/orders" style="display:inline-block;background:#3b82f6;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">Voir dans le dashboard →</a>
      </td></tr>
      <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#334155;font-size:11px;margin:0">© 2026 EatUp · Plateforme Click &amp; Collect</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

      await Promise.all([
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: 'ben.kacel7@gmail.com',
          subject: `✅ Commande #${orderNumber} confirmée — ${restaurantName}`,
          html: customerHtml,
        }),
        resend.emails.send({
          from: 'EatUp <onboarding@resend.dev>',
          to: 'ben.kacel7@gmail.com',
          subject: `🔔 Nouvelle commande #${orderNumber} — ${customerName} (${restaurantName})`,
          html: restaurantHtml,
        }),
      ])
    } catch (_) {}
  }

  return NextResponse.json({ order: data })
}
