import type { SupabaseClient } from '@supabase/supabase-js'
import { LEGACY_ORDER_NUMBER_PATTERN } from '../order-request'
import { toRestaurant } from './data'
import type { OrderStatus, Restaurant } from '../types'

// Vue publique d'une commande (page de suivi) : aucune donnée personnelle du client.
export type PublicOrder = {
  order: {
    order_number: string
    status: OrderStatus | string
    pickup_time: string
    total_price: number
    payment_method: string | null
    payment_status: string | null
    created_at: string | null
  }
  items: { product_name: string; quantity: number; price: number; options: string | null }[]
  restaurant: Pick<Restaurant, 'name' | 'slug' | 'logo_url' | 'address' | 'phone' | 'accent_color'>
}

export function isOrderNumber(value: string): boolean {
  return LEGACY_ORDER_NUMBER_PATTERN.test(value)
}

export async function getPublicOrder(sb: SupabaseClient, orderNumber: string): Promise<PublicOrder | null> {
  const number = orderNumber.trim().toUpperCase()
  if (!isOrderNumber(number)) return null
  const { data: order, error } = await sb
    .from('orders')
    .select('id, order_number, status, pickup_time, total_price, payment_method, payment_status, created_at, restaurant_id')
    .eq('order_number', number)
    .maybeSingle()
  if (error) throw new Error(`Lecture de la commande impossible : ${error.message}`)
  if (!order) return null

  const [itemsRes, restoRes] = await Promise.all([
    sb.from('order_items').select('product_name, quantity, price, options').eq('order_id', order.id),
    sb.from('restaurants').select('*').eq('id', order.restaurant_id).maybeSingle(),
  ])
  const r = restoRes.data ? toRestaurant(restoRes.data) : null

  return {
    order: {
      order_number: order.order_number,
      status: order.status,
      pickup_time: order.pickup_time,
      total_price: Number(order.total_price) || 0,
      payment_method: order.payment_method ?? null,
      payment_status: order.payment_status ?? null,
      created_at: order.created_at ?? null,
    },
    items: (itemsRes.data || []).map(i => ({
      product_name: i.product_name,
      quantity: Number(i.quantity) || 0,
      price: Number(i.price) || 0,
      options: i.options || null,
    })),
    restaurant: {
      name: r?.name || 'Restaurant',
      slug: r?.slug || '',
      logo_url: r?.logo_url || null,
      address: r?.address || null,
      phone: r?.phone || null,
      accent_color: r?.accent_color || null,
    },
  }
}
