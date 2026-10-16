import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Clients Supabase réservés au serveur.
// - publicClient : clé anonyme, sans session → mêmes droits (RLS) qu'un visiteur anonyme.
// - adminClient : clé service role → uniquement dans les routes API / composants serveur,
//   jamais transmise au navigateur.

const options = { auth: { persistSession: false, autoRefreshToken: false } }

let publicInstance: SupabaseClient | null = null
let adminInstance: SupabaseClient | null = null

export function publicClient(): SupabaseClient {
  publicInstance ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options)
  return publicInstance
}

export function adminClient(): SupabaseClient {
  adminInstance ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options)
  return adminInstance
}
