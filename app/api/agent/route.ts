import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  // Vérification auth — seuls les abonnés actifs peuvent appeler l'agent
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: resto } = await supabaseAdmin.from('restaurants').select('id').eq('owner_id', user.id).single()
  if (!resto) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: sub } = await supabaseAdmin.from('restaurant_subscriptions').select('status').eq('restaurant_id', resto.id).single()
  if (!sub || (sub.status !== 'active' && sub.status !== 'past_due')) {
    return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 })
  }
  const { review, restaurantName, tone } = await req.json()

  if (!review?.trim()) {
    return NextResponse.json({ error: 'Avis manquant' }, { status: 400 })
  }

  const isNegative = /décevant|nul|mauvais|froid|attente|lent|problème|dommage|déçu|catastrophe|horrible|inacceptable|scandaleux|insupportable|désagréable|impoli|sale|écœurant|trop cher|cher pour|commandé.*jamais|jamais arrivé|1 étoile|pas bon/i.test(review)
  const isMixed = /mais|cependant|cela dit|en revanche|dommage que|malheureusement|malgré|par contre/i.test(review)

  const systemPrompt = `Tu es un expert en réputation en ligne pour les restaurants. Tu rédiges des réponses aux avis Google qui semblent écrites par un vrai gérant — jamais par un robot, jamais par une IA.

TON STYLE SIGNATURE :
- Phrases courtes, naturelles, avec le rythme d'un humain qui parle
- Toujours personnaliser en reprenant un détail concret de l'avis (le plat mentionné, l'attente, le service, l'ambiance…)
- Jamais de formules génériques comme "Nous vous remercions de votre avis" seul en début — ça fait template
- Jamais de "Nous espérons vous revoir prochainement" en fin — trop vu, trop froid
- Une touche d'émotion sincère : fierté, regret, enthousiasme — selon le contexte
- Varie la structure d'une réponse à l'autre, aucune n'est identique`

  const toneInstructions: Record<string, string> = {
    friendly: isNegative
      ? `TON chaleureux pour un avis négatif :
- Vouvoie le client, mais avec chaleur — pas de distance froide
- Commence par reconnaître le problème spécifique qu'il cite, sans excuses excessives ni justifications longues
- Montre que ça compte vraiment pour toi, que ce n'est pas la norme
- Propose concrètement : invite à revenir, offre de contact direct si pertinent
- Termine avec une formule humaine et sincère, jamais froide
Exemple de registre : "C'est un retour qui nous touche, et honnêtement, ce n'est pas l'expérience qu'on veut vous offrir."`
      : `TON chaleureux pour un avis positif :
- Tutoie si l'avis est enthousiaste et informel, vouvoie si plus réservé
- Reprends un détail précis de l'avis pour montrer que tu l'as vraiment lu
- Exprime une fierté authentique, pas de l'auto-congratulation
- Donne envie de revenir en mentionnant quelque chose de concret (un nouveau plat, une saison, une prochaine fois)
- Fin chaleureuse, courte, mémorable
Exemple de registre : "Ça fait vraiment plaisir de lire ça — c'est exactement pour ça qu'on fait ce boulot."`,

    neutral: isMixed || isNegative
      ? `TON neutre pour un avis négatif ou mitigé :
- Vouvoie, ton professionnel sans être distant
- Commence par le positif s'il y en a, puis adresse le point négatif avec précision
- Factuel et concis — reconnaître, pas se justifier longuement
- Montrer que le retour a été entendu et pris au sérieux
- Conclure avec une invitation sobre mais sincère`
      : `TON neutre pour un avis positif :
- Vouvoie, ton professionnel mais agréable
- Remercie en reprenant ce que le client a apprécié
- Sobre, pas de superlatifs — "Nous sommes ravis" plutôt que "Nous sommes absolument enchantés"
- Fin claire, courte, professionnelle`,

    formal: isNegative
      ? `TON formel pour un avis négatif :
- Vouvoiement strict, formules soutenues
- Reconnaître l'insatisfaction avec gravité et respect : "Nous avons pris connaissance de votre retour avec la plus grande attention"
- Exprimer un regret sincère et mesuré, sans sur-promesses
- Proposer une suite concrète (contact, retour en établissement)
- Formule de politesse complète et sobre en clôture`
      : `TON formel pour un avis positif :
- Vouvoiement strict, style institutionnel sobre
- Remercier avec élégance en reprenant l'élément central de l'avis
- Exprimer la satisfaction de l'établissement avec mesure
- Conclure avec une formule de politesse complète et soignée`,
  }

  const instructions = toneInstructions[tone] || toneInstructions.neutral

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Restaurant : "${restaurantName}"
Avis Google reçu :
"${review}"

${instructions}

CONTRAINTES ABSOLUES :
- 4 à 7 phrases — réponse complète et développée, pas expédiée
- Reprends obligatoirement un élément concret de l'avis (nom d'un plat, attente, accueil, ambiance…)
- Zéro formule générique qu'on voit dans toutes les réponses de restaurants
- Zéro répétition mot pour mot de l'avis
- Termine TOUJOURS par la signature : "La Team ${restaurantName}" sur une nouvelle ligne
- Réponds UNIQUEMENT avec le texte final, prêt à coller sur Google — aucune intro, aucun commentaire`,
      },
    ],
  })

  const response = (message.content[0] as any).text
  return NextResponse.json({ response })
}
