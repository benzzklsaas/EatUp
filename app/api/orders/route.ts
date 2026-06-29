import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { order, items } = await req.json()

  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Erreur' }, { status: 500 })
  }

  await supabase.from('order_items').insert(
    items.map((i: any) => ({ ...i, order_id: data.id }))
  )

  return NextResponse.json({ order: data })
}
