import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Stripe from 'stripe'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, sessionId } = await req.json()
    if (!orderNumber || !sessionId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    // Vérifier que la session Stripe est bien paid
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 403 })
    if (session.metadata?.orderNumber !== orderNumber) return NextResponse.json({ error: 'Commande invalide' }, { status: 403 })

    // Récupérer la commande
    const { data: order } = await supabase
      .from('orders')
      .select('*, restaurants(name, email)')
      .eq('order_number', orderNumber)
      .single()

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id)

    const esc = (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.eatup-app.fr'
    const pickupFormatted = new Date(order.pickup_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
    const totalStr = Number(order.total_price).toFixed(2)
    const customerName = esc(`${order.first_name} ${order.last_name}`)
    const restaurantName = esc(order.restaurants?.name || '')
    const orderNum = esc(orderNumber)

    const itemsHtml = (items || []).map((i: any) => `
      <tr>
        <td style="padding:8px 0;color:#cbd5e1;font-size:14px">${esc(i.product_name)} <span style="color:#475569">×${i.quantity}</span></td>
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
        <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px">Paiement confirmé !</h1>
        <p style="color:#94a3b8;font-size:15px;margin:0">Bonjour <strong style="color:#e2e8f0">${customerName}</strong>, votre commande chez <strong style="color:#60a5fa">${restaurantName}</strong> est bien enregistrée.</p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
        <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0;letter-spacing:-1px">#${orderNum}</p>
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
      <tr><td style="background:#1e293b;padding:0 36px 32px;border-top:1px solid #334155;text-align:center">
        <a href="${appUrl}/suivi/${orderNum}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none">
          📍 Suivre ma commande en temps réel
        </a>
      </td></tr>
      <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#475569;font-size:13px;margin:0 0 4px">Des questions ? Contactez directement le restaurant.</p>
        <p style="color:#334155;font-size:11px;margin:0">© 2026 EatUp · Click &amp; Collect pour restaurants</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

    const restaurantHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="background:#0f172a;border-radius:20px 20px 0 0;padding:36px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">💳</div>
        <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px">Commande payée en ligne !</h1>
        <p style="color:#94a3b8;font-size:15px;margin:0">Client : <strong style="color:#e2e8f0">${customerName}</strong></p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
        <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
        <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0">#${orderNum}</p>
      </td></tr>
      <tr><td style="background:#1e293b;padding:0 36px 24px">
        <div style="background:#0f172a;border-radius:14px;padding:20px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr><td colspan="2" style="padding-top:14px;border-top:1px solid #334155"></td></tr>
            <tr><td style="color:#ffffff;font-weight:700;font-size:16px;padding-top:4px">Total</td><td style="color:#10b981;font-weight:800;font-size:16px;text-align:right;padding-top:4px">${totalStr}€ <span style="color:#4ade80;font-size:12px">✓ Payé</span></td></tr>
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
        from: 'EatUp <noreply@eatup-app.fr>',
        to: order.email,
        subject: `✅ Commande #${orderNum} confirmée — ${restaurantName}`,
        html: customerHtml,
      }),
      order.restaurants?.email && resend.emails.send({
        from: 'EatUp <noreply@eatup-app.fr>',
        to: order.restaurants.email,
        subject: `💳 Commande payée #${orderNum} — ${customerName}`,
        html: restaurantHtml,
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
