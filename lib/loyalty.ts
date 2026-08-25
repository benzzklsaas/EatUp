import type { SupabaseClient } from '@supabase/supabase-js'

// Helpers serveur partagés pour le programme de fidélité (tampons + points).
// Toutes ces fonctions attendent un client Supabase déjà instancié
// avec la clé service_role (elles contournent volontairement la RLS).

type CustomerInput = {
  email: string
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
}

export async function getOrCreateCustomer(supabase: SupabaseClient, input: CustomerInput) {
  const email = input.email?.trim().toLowerCase()
  if (!email) return null

  const { data: existing } = await supabase.from('customers').select('*').eq('email', email).maybeSingle()
  if (existing) {
    // Complète les infos manquantes sans écraser ce que le client a déjà renseigné ailleurs.
    const updates: Record<string, any> = {}
    if (!existing.phone && input.phone) updates.phone = input.phone
    if (!existing.first_name && input.firstName) updates.first_name = input.firstName
    if (!existing.last_name && input.lastName) updates.last_name = input.lastName
    if (Object.keys(updates).length > 0) {
      const { data: updated } = await supabase.from('customers').update(updates).eq('id', existing.id).select().single()
      return updated || existing
    }
    return existing
  }

  const { data: created } = await supabase.from('customers').insert({
    email,
    phone: input.phone || null,
    first_name: input.firstName || null,
    last_name: input.lastName || null,
  }).select().single()

  return created
}

async function getOrCreateAccount(supabase: SupabaseClient, restaurantId: string, customerId: string) {
  const { data: existing } = await supabase.from('loyalty_accounts').select('*')
    .eq('restaurant_id', restaurantId).eq('customer_id', customerId).maybeSingle()
  if (existing) return existing

  const { data: created } = await supabase.from('loyalty_accounts')
    .insert({ restaurant_id: restaurantId, customer_id: customerId })
    .select().single()
  return created
}

// Crédite automatiquement une commande payée/passée sur un client déjà identifié.
// Ne fait rien si le programme est désactivé pour ce restaurant.
export async function creditOrderToLoyalty(supabase: SupabaseClient, params: {
  restaurantId: string
  orderId: string
  customerId: string
  amountSpent: number
}) {
  const { restaurantId, orderId, customerId, amountSpent } = params

  const { data: program } = await supabase.from('loyalty_programs').select('*')
    .eq('restaurant_id', restaurantId).maybeSingle()
  if (!program || (!program.stamps_enabled && !program.points_enabled)) return null

  const account = await getOrCreateAccount(supabase, restaurantId, customerId)
  if (!account) return null

  const earnsStamp = !!program.stamps_enabled && amountSpent >= Number(program.min_order_for_stamp || 0)
  const earnedPoints = program.points_enabled ? Math.floor(amountSpent * Number(program.points_per_euro || 0)) : 0

  const updates: Record<string, any> = {
    lifetime_orders: (account.lifetime_orders || 0) + 1,
    lifetime_spent: Number(account.lifetime_spent || 0) + amountSpent,
    updated_at: new Date().toISOString(),
  }
  if (earnsStamp) {
    updates.stamps_count = (account.stamps_count || 0) + 1
    updates.lifetime_stamps = (account.lifetime_stamps || 0) + 1
  }
  if (earnedPoints > 0) {
    updates.points_balance = Number(account.points_balance || 0) + earnedPoints
    updates.lifetime_points = Number(account.lifetime_points || 0) + earnedPoints
  }

  await supabase.from('loyalty_accounts').update(updates).eq('id', account.id)

  const transactions: Record<string, any>[] = []
  if (earnsStamp) transactions.push({ restaurant_id: restaurantId, customer_id: customerId, order_id: orderId, type: 'stamp_earned', stamps_delta: 1, points_delta: 0, created_by: 'system' })
  if (earnedPoints > 0) transactions.push({ restaurant_id: restaurantId, customer_id: customerId, order_id: orderId, type: 'points_earned', stamps_delta: 0, points_delta: earnedPoints, created_by: 'system' })
  if (transactions.length > 0) await supabase.from('loyalty_transactions').insert(transactions)

  return { earnsStamp, earnedPoints }
}

// Crédit manuel déclenché par le commerçant (client venu payer en caisse, hors EatUp).
export async function manualCredit(supabase: SupabaseClient, params: {
  restaurantId: string
  email: string
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  stamps?: number
  points?: number
  note?: string
  actor: string
}) {
  const customer = await getOrCreateCustomer(supabase, {
    email: params.email, phone: params.phone, firstName: params.firstName, lastName: params.lastName,
  })
  if (!customer) throw new Error('Client invalide')

  const stamps = Math.max(0, Math.trunc(params.stamps || 0))
  const points = Math.max(0, Number(params.points || 0))
  if (stamps === 0 && points === 0) throw new Error('Rien à créditer')

  const account = await getOrCreateAccount(supabase, params.restaurantId, customer.id)
  if (!account) throw new Error('Impossible de créer le compte fidélité')

  await supabase.from('loyalty_accounts').update({
    stamps_count: (account.stamps_count || 0) + stamps,
    lifetime_stamps: (account.lifetime_stamps || 0) + stamps,
    points_balance: Number(account.points_balance || 0) + points,
    lifetime_points: Number(account.lifetime_points || 0) + points,
    updated_at: new Date().toISOString(),
  }).eq('id', account.id)

  await supabase.from('loyalty_transactions').insert({
    restaurant_id: params.restaurantId,
    customer_id: customer.id,
    type: 'manual_credit',
    stamps_delta: stamps,
    points_delta: points,
    note: params.note || null,
    created_by: params.actor,
  })

  return customer
}

// Le commerçant valide qu'une récompense a été remise au client (tampon ou points).
export async function redeemReward(supabase: SupabaseClient, params: {
  restaurantId: string
  customerId: string
  type: 'stamps' | 'points'
  actor: string
}) {
  const { data: account } = await supabase.from('loyalty_accounts').select('*')
    .eq('restaurant_id', params.restaurantId).eq('customer_id', params.customerId).single()
  if (!account) throw new Error('Compte fidélité introuvable')

  const { data: program } = await supabase.from('loyalty_programs').select('*')
    .eq('restaurant_id', params.restaurantId).single()
  if (!program) throw new Error('Programme de fidélité introuvable')

  if (params.type === 'stamps') {
    const threshold = Number(program.stamps_threshold || 0)
    if (threshold <= 0 || (account.stamps_count || 0) < threshold) throw new Error('Pas assez de tampons pour cette récompense')
    await supabase.from('loyalty_accounts').update({ stamps_count: account.stamps_count - threshold, updated_at: new Date().toISOString() }).eq('id', account.id)
    await supabase.from('loyalty_transactions').insert({ restaurant_id: params.restaurantId, customer_id: params.customerId, type: 'stamp_redeemed', stamps_delta: -threshold, points_delta: 0, created_by: params.actor })
  } else {
    const cost = Number(program.points_per_reward || 0)
    if (cost <= 0 || Number(account.points_balance || 0) < cost) throw new Error('Pas assez de points pour cette récompense')
    await supabase.from('loyalty_accounts').update({ points_balance: Number(account.points_balance) - cost, updated_at: new Date().toISOString() }).eq('id', account.id)
    await supabase.from('loyalty_transactions').insert({ restaurant_id: params.restaurantId, customer_id: params.customerId, type: 'points_redeemed', stamps_delta: 0, points_delta: -cost, created_by: params.actor })
  }
}
