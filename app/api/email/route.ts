import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { customerEmail, customerName, restaurantEmail, restaurantName, orderNumber, items, total, pickupTime } = await req.json()

  const itemsHtml = items.map((i: any) => `<tr><td style="padding:6px 0;color:#334155">${i.name} x${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#334155">${(i.price * i.quantity).toFixed(2)}€</td></tr>`).join('')

  const pickupFormatted = new Date(pickupTime).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  // Email au client
  await resend.emails.send({
    from: 'EatUp <noreply@eatup.fr>',
    to: customerEmail,
    subject: `✅ Commande #${orderNumber} confirmée — ${restaurantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#0f172a;font-size:24px;margin:0">🍽️ EatUp</h1>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <h2 style="color:#0f172a;margin:0 0 8px">Bonjour ${customerName} !</h2>
          <p style="color:#64748b;margin:0">Votre commande chez <strong>${restaurantName}</strong> est confirmée.</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <p style="color:#64748b;font-size:13px;margin:0 0 4px">Numéro de commande</p>
          <p style="color:#3b82f6;font-size:22px;font-weight:bold;margin:0">#${orderNumber}</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <h3 style="color:#0f172a;margin:0 0 12px;font-size:15px">Votre commande</h3>
          <table style="width:100%">${itemsHtml}</table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
          <div style="display:flex;justify-content:space-between">
            <strong style="color:#0f172a">Total</strong>
            <strong style="color:#0f172a">${total}€</strong>
          </div>
        </div>
        <div style="background:#eff6ff;border-radius:12px;padding:24px">
          <p style="color:#1e40af;margin:0;font-size:15px">🕐 Retrait prévu : <strong>${pickupFormatted}</strong></p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">EatUp — Click & Collect pour restaurants</p>
      </div>
    `,
  })

  // Email au restaurant
  await resend.emails.send({
    from: 'EatUp <noreply@eatup.fr>',
    to: restaurantEmail,
    subject: `🔔 Nouvelle commande #${orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <h2 style="color:#0f172a;margin:0 0 8px">Nouvelle commande !</h2>
          <p style="color:#64748b;margin:0">Client : <strong>${customerName}</strong></p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <p style="color:#64748b;font-size:13px;margin:0 0 4px">Numéro de commande</p>
          <p style="color:#3b82f6;font-size:22px;font-weight:bold;margin:0">#${orderNumber}</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px">
          <table style="width:100%">${itemsHtml}</table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
          <div style="display:flex;justify-content:space-between">
            <strong style="color:#0f172a">Total</strong>
            <strong style="color:#0f172a">${total}€</strong>
          </div>
        </div>
        <div style="background:#f0fdf4;border-radius:12px;padding:24px">
          <p style="color:#166534;margin:0;font-size:15px">🕐 Retrait prévu : <strong>${pickupFormatted}</strong></p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
