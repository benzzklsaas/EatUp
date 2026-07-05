import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { review, restaurantName, tone } = await req.json()

  if (!review?.trim()) {
    return NextResponse.json({ error: 'Avis manquant' }, { status: 400 })
  }

  const toneInstructions: Record<string, string> = {
    friendly: `TON — Chaleureux et humain :
- Tutoie le client si l'avis est positif, vouvoie si négatif ou neutre
- Utilise des formules chaleureuses ("Merci du fond du cœur", "Ça nous touche vraiment", "On a adoré vous accueillir")
- Montre de la personnalité, de l'authenticité — pas de langue de bois
- Termine sur une note enthousiaste et sincère`,

    neutral: `TON — Neutre et équilibré :
- Vouvoie toujours le client
- Formules professionnelles sans être froid ("Nous vous remercions", "Votre retour est précieux")
- Factuel, sans excès d'enthousiasme ni de familiarité
- Répond précisément au contenu de l'avis`,

    formal: `TON — Formel et institutionnel :
- Vouvoiement strict, formules soutenues ("Nous vous adressons nos sincères remerciements", "Nous avons bien pris note de votre retour")
- Jamais d'expression familière ni d'emoji
- Style sobre, structuré — comme une réponse officielle d'établissement
- Conclure avec une formule de politesse complète`,
  }

  const instructions = toneInstructions[tone] || toneInstructions.neutral

  const isNegative = /décevant|nul|mauvais|froid|attente|lent|problème|dommage|déçu|catastrophe|horrible/i.test(review)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Tu es le gérant du restaurant "${restaurantName}". Tu dois répondre à cet avis Google.

${instructions}

RÈGLES ABSOLUES :
- 3 à 5 phrases maximum, jamais plus
- ${isNegative ? 'Reconnais le problème sans te justifier excessivement, propose une amélioration ou une invitation à revenir pour rectifier l\'expérience' : 'Remercie sincèrement et invite à revenir'}
- Jamais de réponse générique copiée-collée — chaque réponse doit sembler écrite à la main
- Ne répète pas mot pour mot ce que dit l'avis
- Réponds uniquement avec la réponse finale, prête à publier sur Google

Avis reçu :
"${review}"`,
      },
    ],
  })

  const response = (message.content[0] as any).text
  return NextResponse.json({ response })
}
