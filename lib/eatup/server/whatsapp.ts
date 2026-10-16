import { orderTemplateParams, parseRecipients, type OrderNotification } from '../order-notification'

// Envoi de la nouvelle commande à l'équipe du restaurant par l'API officielle WhatsApp Cloud (Meta) :
// un message privé par employé, via un modèle « Utilitaire » approuvé (obligatoire pour écrire
// en premier). Configuration et mise en place : docs/NOTIFICATIONS-WHATSAPP.md.
//
// Ne lève jamais d'exception : une panne WhatsApp ne doit pas empêcher une commande.

const DEFAULT_TEMPLATE = 'nouvelle_commande_eatup'

export async function sendOrderToTeam(restaurantSlug: string, notification: OrderNotification): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const recipients = parseRecipients(process.env.WHATSAPP_ORDER_RECIPIENTS, restaurantSlug)
  if (!token || !phoneNumberId || recipients.length === 0) return

  const base = (process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com').replace(/\/$/, '')
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0'
  const template = process.env.WHATSAPP_ORDER_TEMPLATE || DEFAULT_TEMPLATE
  const language = process.env.WHATSAPP_TEMPLATE_LANG || 'fr'
  const parameters = orderTemplateParams(notification, new Date()).map(text => ({ type: 'text', text }))

  const results = await Promise.allSettled(recipients.map(async to => {
    const res = await fetch(`${base}/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: { name: template, language: { code: language }, components: [{ type: 'body', parameters }] },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: { code?: number } } | null
      throw new Error(`HTTP ${res.status}, code Meta ${json?.error?.code ?? 'inconnu'}`)
    }
  }))

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      // Journal sans données personnelles : numéro masqué, pas de contenu de commande.
      const reason = r.reason instanceof Error ? r.reason.message : 'erreur'
      console.error('[orders] WhatsApp non envoyé', notification.orderNumber, `destinataire …${recipients[i].slice(-2)}`, reason)
    }
  })
}
