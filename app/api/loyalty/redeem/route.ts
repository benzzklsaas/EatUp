import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { redeemReward } from '@/lib/loyalty'

// Le commerçant valide qu'une récompense (tampon complet / palier de points) a été remise au client.
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: resto } = await service.from('restaurants').select('id').eq('owner_id', user.id).single()
  if (!resto) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })

  const { customerId, type } = await req.json()
  if (!customerId || (type !== 'stamps' && type !== 'points')) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  try {
    await redeemReward(service, { restaurantId: resto.id, customerId, type, actor: `owner:${user.email}` })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 400 })
  }
}
