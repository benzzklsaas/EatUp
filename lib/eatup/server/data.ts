import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Closure, DaySchedule, OptionGroup, Product, Restaurant } from '../types'
import { byPosition, normalizeGroups } from '../pricing'
import { addDays, dateKey, parisParts } from '../schedule'
import { publicClient } from './supabase'

/* eslint-disable @typescript-eslint/no-explicit-any -- lignes Supabase non typées, normalisées ici */

export type RestaurantData = {
  restaurant: Restaurant
  products: Product[]
  categories: Category[]
  groupsByProduct: Record<string, OptionGroup[]>
  schedules: DaySchedule[]
  closures: Closure[]
}

export class DataError extends Error {}

// Seuls ces champs quittent le serveur : l'email, l'identifiant du propriétaire, etc. restent privés.
export function toRestaurant(row: any): Restaurant {
  const accent = row.accent_color ?? row.brand_color ?? row.primary_color ?? null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || 'Restaurant',
    description: row.description || null,
    address: row.address || null,
    phone: row.phone || null,
    logo_url: row.logo_url || null,
    cover_image_url: row.cover_image_url || null,
    daily_message: row.daily_message || null,
    accent_color: typeof accent === 'string' ? accent : null,
  }
}

export function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || null,
    price: Number(row.price) || 0,
    category: row.category || null,
    image_url: row.image_url || null,
    is_available: row.is_available ?? null,
    is_online: row.is_online ?? null,
    menu_extra_price: row.menu_extra_price == null ? null : Number(row.menu_extra_price),
    menu_label: row.menu_label || null,
    menu_supplement: row.menu_supplement == null ? null : Number(row.menu_supplement),
    has_accompagnement: row.has_accompagnement ?? null,
    position: row.position ?? null,
    created_at: row.created_at ?? null,
  }
}

function toSchedule(row: any): DaySchedule {
  return {
    day_of_week: Number(row.day_of_week),
    is_closed: row.is_closed ?? false,
    opening_time_1: row.opening_time_1 || null,
    closing_time_1: row.closing_time_1 || null,
    opening_time_2: row.opening_time_2 || null,
    closing_time_2: row.closing_time_2 || null,
    slot_duration: row.slot_duration == null ? null : Number(row.slot_duration),
  }
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new DataError(`Lecture impossible (${what}) : ${res.error.message}`)
  return (res.data ?? []) as T
}

/**
 * Carte d'un restaurant : produits en ligne (y compris boissons et accompagnements des formules),
 * options, catégories, horaires et fermetures des 8 prochains jours.
 * La même fonction sert à la page publique et à la validation serveur des commandes.
 */
export async function loadRestaurantData(sb: SupabaseClient, restaurantRow: any, now = new Date()): Promise<RestaurantData> {
  const restaurant = toRestaurant(restaurantRow)
  const today = parisParts(now)
  const from = dateKey(today)
  const to = dateKey(addDays(today, 8))

  const [productsRes, categoriesRes, schedulesRes, closuresRes] = await Promise.all([
    sb.from('products').select('*').eq('restaurant_id', restaurant.id).neq('is_online', false),
    sb.from('categories').select('*').eq('restaurant_id', restaurant.id).order('position'),
    sb.from('restaurant_schedule').select('*').eq('restaurant_id', restaurant.id),
    sb.from('restaurant_closures').select('closed_date').eq('restaurant_id', restaurant.id).gte('closed_date', from).lte('closed_date', to),
  ])

  const products = check<any[]>(productsRes, 'produits').map(toProduct).sort(byPosition)
  const categories = check<any[]>(categoriesRes, 'catégories').map((c): Category => ({
    id: c.id, name: c.name, emoji: c.emoji || null, position: c.position ?? null,
  }))
  const schedules = check<any[]>(schedulesRes, 'horaires').map(toSchedule)
  const closures = check<any[]>(closuresRes, 'fermetures').map((c): Closure => ({ closed_date: String(c.closed_date) }))

  const groupsByProduct: Record<string, OptionGroup[]> = {}
  if (products.length) {
    const groupsRes = await sb
      .from('product_option_groups')
      .select('*, items:product_option_items(*)')
      .in('product_id', products.map(p => p.id))
    const groups = normalizeGroups(check<any[]>(groupsRes, 'options').map((g): OptionGroup => ({
      id: g.id,
      product_id: g.product_id,
      name: g.name,
      min_choices: g.min_choices,
      max_choices: g.max_choices,
      position: g.position ?? null,
      created_at: g.created_at ?? null,
      items: (g.items || []).map((i: any) => ({
        id: i.id, group_id: i.group_id, name: i.name, extra_price: Number(i.extra_price) || 0,
        is_available: i.is_available ?? null, position: i.position ?? null, created_at: i.created_at ?? null,
      })),
    })))
    for (const g of groups) (groupsByProduct[g.product_id] ||= []).push(g)
  }

  return { restaurant, products, categories, groupsByProduct, schedules, closures }
}

/** Page publique : lecture avec les droits d'un visiteur anonyme, mutualisée entre metadata et page. */
export const getRestaurantPageData = cache(async (slug: string): Promise<RestaurantData | null> => {
  const sb = publicClient()
  const res = await sb.from('restaurants').select('*').eq('slug', slug).maybeSingle()
  if (res.error) throw new DataError(`Lecture impossible (restaurant) : ${res.error.message}`)
  if (!res.data) return null
  return loadRestaurantData(sb, res.data)
})
