import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

// Le commerçant scanne le QR fidélité d'un client (identifiant = customerId) et récupère
// sa fiche + son solde à SON restaurant. Passe par le service_role car, au tout premier
// scan chez ce commerçant, il n'existe pas encore de loyalty_accounts qui autoriserait
// la lecture via RLS classique — la vérification de propriété du restaurant fait office
// de garde-fou à la place.
export async function GET(req: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params

  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: resto } = await service.from('restaurants').select('id').eq('owner_id', user.id).single()
  if (!resto) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })

  const { data: customer } = await service.from('customers').select('id, email, phone, first_name, last_name').eq('id', customerId).maybeSingle()
  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const { data: program } = await service.from('loyalty_programs').select('*').eq('restaurant_id', resto.id).maybeSingle()

  const { data: account } = await service.from('loyalty_accounts').select('*')
    .eq('restaurant_id', resto.id).eq('customer_id', customerId).maybeSingle()

  return NextResponse.json({
    customer,
    program,
    account: account || { stamps_count: 0, points_balance: 0 },
  })
}
