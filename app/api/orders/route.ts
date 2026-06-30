import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { order, items } = await req.json()

  // Vérifie que le restaurant existe bien avant d'insérer
  if (!order?.restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id manquant' }, { status: 400 })
  }
  const { data: resto } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', order.restaurant_id)
    .single()
  if (!resto) {
    return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Erreur' }, { status: 500 })
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((i: any) => ({ ...i, order_id: data.id }))
  )

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ order: data })
}
