import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { manualCredit } from '@/lib/loyalty'

// Crédit manuel de tampons/points par le commerçant (client payé en caisse, hors EatUp).
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: resto } = await service.from('restaurants').select('id').eq('owner_id', user.id).single()
  if (!resto) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })

  const { email, phone, firstName, lastName, stamps, points, note } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  try {
    const customer = await manualCredit(service, {
      restaurantId: resto.id, email, phone, firstName, lastName, stamps, points, note,
      actor: `owner:${user.email}`,
    })
    return NextResponse.json({ customer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 400 })
  }
}
