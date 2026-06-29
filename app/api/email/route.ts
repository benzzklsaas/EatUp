import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function customerEmailHtml({ customerName, restaurantName, orderNumber, itemsHtml, total, pickupFormatted }: any) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commande confirmée</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Logo header -->
        <tr><td style="padding-bottom:28px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:10px;display:inline-block;vertical-align:middle"></div>
            <span style="font-size:22px;font-weight:800;color:#0f172a;vertical-align:middle;margin-left:10px">EatUp</span>
          </div>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#0f172a;border-radius:20px 20px 0 0;padding:40px 36px 32px;text-align:center">
          <div style="width:64px;height:64px;background:rgba(59,130,246,0.15);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:32px;line-height:64px">✅</div>
          <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">Commande confirmée !</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0">Bonjour <strong style="color:#e2e8f0">${customerName}</strong>, votre commande chez <strong style="color:#60a5fa">${restaurantName}</strong> est bien enregistrée.</p>
        </td></tr>

        <!-- Order number -->
        <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
          <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0;letter-spacing:-1px">#${orderNumber}</p>
        </td></tr>

        <!-- Items -->
        <tr><td style="background:#1e293b;padding:0 36px 24px;border-top:1px solid #1e293b">
          <div style="background:#0f172a;border-radius:14px;padding:20px 24px">
            <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 16px">Détail de votre commande</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemsHtml}
              <tr><td colspan="2" style="padding-top:14px;border-top:1px solid #334155"></td></tr>
              <tr>
                <td style="color:#ffffff;font-weight:700;font-size:16px;padding-top:4px">Total</td>
                <td style="color:#3b82f6;font-weight:800;font-size:16px;text-align:right;padding-top:4px">${total}€</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Pickup time -->
        <tr><td style="background:#1e293b;padding:0 36px 32px">
          <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca);border-radius:14px;padding:20px 24px">
            <p style="color:#bfdbfe;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 6px">Heure de retrait</p>
            <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;text-transform:capitalize">🕐 ${pickupFormatted}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;border-top:1px solid #334155">
          <p style="color:#475569;font-size:13px;margin:0 0 4px">Des questions ? Contactez directement le restaurant.</p>
          <p style="color:#334155;font-size:11px;margin:0">© 2026 EatUp · Click & Collect pour restaurants</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function restaurantEmailHtml({ customerName, orderNumber, itemsHtml, total, pickupFormatted }: any) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nouvelle commande</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center">
          <span style="font-size:22px;font-weight:800;color:#0f172a">EatUp</span>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#0f172a;border-radius:20px 20px 0 0;padding:36px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">🔔</div>
          <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px">Nouvelle commande !</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0">Client : <strong style="color:#e2e8f0">${customerName}</strong></p>
        </td></tr>

        <!-- Order number -->
        <tr><td style="background:#1e293b;padding:24px 36px;text-align:center;border-top:1px solid #334155">
          <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;font-weight:600">Numéro de commande</p>
          <p style="color:#3b82f6;font-size:32px;font-weight:900;margin:0">#${orderNumber}</p>
        </td></tr>

        <!-- Items -->
        <tr><td style="background:#1e293b;padding:0 36px 24px">
          <div style="background:#0f172a;border-radius:14px;padding:20px 24px">
            <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 16px">Articles commandés</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemsHtml}
              <tr><td colspan="2" style="padding-top:14px;border-top:1px solid #334155"></td></tr>
              <tr>
                <td style="color:#ffffff;font-weight:700;font-size:16px;padding-top:4px">Total</td>
                <td style="color:#10b981;font-weight:800;font-size:16px;text-align:right;padding-top:4px">${total}€</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Pickup -->
        <tr><td style="background:#1e293b;padding:0 36px 32px">
          <div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:14px;padding:20px 24px">
            <p style="color:#6ee7b7;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 6px">Retrait prévu</p>
            <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;text-transform:capitalize">🕐 ${pickupFormatted}</p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#1e293b;padding:0 36px 32px;text-align:center">
          <a href="https://eat-up-sepia.vercel.app/dashboard/orders" style="display:inline-block;background:#3b82f6;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">Voir dans le dashboard →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;border-top:1px solid #334155">
          <p style="color:#334155;font-size:11px;margin:0">© 2026 EatUp · Plateforme Click & Collect</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const { customerEmail, customerName, restaurantEmail, restaurantName, orderNumber, items, total, pickupTime } = await req.json()

  const itemsHtml = items.map((i: any) => `
    <tr>
      <td style="padding:8px 0;color:#cbd5e1;font-size:14px">${i.name} <span style="color:#475569">×${i.quantity}</span></td>
      <td style="padding:8px 0;text-align:right;color:#94a3b8;font-size:14px">${(i.price * i.quantity).toFixed(2)}€</td>
    </tr>
  `).join('')

  const pickupFormatted = new Date(pickupTime).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  await resend.emails.send({
    from: 'EatUp <onboarding@resend.dev>',
    to: customerEmail,
    subject: `✅ Commande #${orderNumber} confirmée — ${restaurantName}`,
    html: customerEmailHtml({ customerName, restaurantName, orderNumber, itemsHtml, total, pickupFormatted }),
  })

  await resend.emails.send({
    from: 'EatUp <onboarding@resend.dev>',
    to: restaurantEmail,
    subject: `🔔 Nouvelle commande #${orderNumber} — ${customerName}`,
    html: restaurantEmailHtml({ customerName, orderNumber, itemsHtml, total, pickupFormatted }),
  })

  return NextResponse.json({ ok: true })
}
