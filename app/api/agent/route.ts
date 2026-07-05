import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { review, restaurantName, tone } = await req.json()

  if (!review?.trim()) {
    return NextResponse.json({ error: 'Avis manquant' }, { status: 400 })
  }

  const toneGuide = tone === 'formal'
    ? 'professionnel et courtois'
    : tone === 'friendly'
    ? 'chaleureux, humain et proche du client'
    : 'professionnel mais accessible'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Tu es le gérant du restaurant "${restaurantName}". Tu dois répondre à cet avis Google de façon ${toneGuide}.

La réponse doit :
- Être courte (3-5 phrases max)
- Remercier si l'avis est positif, ou reconnaître le problème si négatif
- Inviter à revenir
- Ne jamais être générique ou robotique
- Être directement utilisable sans modification

Avis reçu :
"${review}"

Réponds uniquement avec la réponse à publier, sans explication ni guillemets.`,
      },
    ],
  })

  const response = (message.content[0] as any).text
  return NextResponse.json({ response })
}
