'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Program = {
  stamps_enabled: boolean
  stamps_threshold: number
  stamps_reward_label: string
  min_order_for_stamp: number
  points_enabled: boolean
  points_per_euro: number
  points_per_reward: number
  points_reward_label: string
}

const DEFAULT_PROGRAM: Program = {
  stamps_enabled: true,
  stamps_threshold: 10,
  stamps_reward_label: 'Un article offert',
  min_order_for_stamp: 0,
  points_enabled: false,
  points_per_euro: 1,
  points_per_reward: 100,
  points_reward_label: '5€ de réduction',
}

const section: React.CSSProperties = { borderRadius: 20, padding: '24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)' }
const inp: React.CSSProperties = { width: '100%', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none', boxSizing: 'border-box' }
const label: React.CSSProperties = { fontSize: 12, color: '#78716C', fontWeight: 600, marginBottom: 6, display: 'block' }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 46, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative',
      background: on ? '#f97316' : 'rgba(0,0,0,0.15)', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function LoyaltyPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [program, setProgram] = useState<Program>(DEFAULT_PROGRAM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ members: 0, stampsGiven: 0, rewardsGiven: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurant(resto)

      const { data: existing } = await supabase.from('loyalty_programs').select('*').eq('restaurant_id', resto.id).maybeSingle()
      if (existing) setProgram({ ...DEFAULT_PROGRAM, ...existing })

      const { data: accounts } = await supabase.from('loyalty_accounts').select('lifetime_stamps').eq('restaurant_id', resto.id)
      const { count: redeemedCount } = await supabase.from('loyalty_transactions').select('id', { count: 'exact', head: true }).eq('restaurant_id', resto.id).in('type', ['stamp_redeemed', 'points_redeemed'])
      setStats({
        members: accounts?.length || 0,
        stampsGiven: (accounts || []).reduce((sum, a: any) => sum + (a.lifetime_stamps || 0), 0),
        rewardsGiven: redeemedCount || 0,
      })

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!restaurant) return
    setSaving(true)
    await supabase.from('loyalty_programs').upsert(
      { restaurant_id: restaurant.id, ...program },
      { onConflict: 'restaurant_id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 48 }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(255,251,245,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1208', margin: 0 }}>Fidélité</p>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Membres', value: stats.members, icon: '👥' },
            { label: 'Tampons donnés', value: stats.stampsGiven, icon: '🥙' },
            { label: 'Récompenses données', value: stats.rewardsGiven, icon: '🎁' },
          ].map((s, i) => (
            <div key={i} style={{ ...section, padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#1A1208', margin: '0 0 2px', letterSpacing: '-0.5px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Carte tampon */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: program.stamps_enabled ? 20 : 0 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 3px' }}>🥙 Carte tampon</p>
              <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>Ex : 9 commandes achetées, la 10e offerte.</p>
            </div>
            <Toggle on={program.stamps_enabled} onClick={() => setProgram({ ...program, stamps_enabled: !program.stamps_enabled })} />
          </div>

          {program.stamps_enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Nombre de tampons requis</label>
                  <input type="number" min={1} value={program.stamps_threshold} onChange={e => setProgram({ ...program, stamps_threshold: Number(e.target.value) })} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Commande minimum pour 1 tampon (€)</label>
                  <input type="number" min={0} step={0.5} value={program.min_order_for_stamp} onChange={e => setProgram({ ...program, min_order_for_stamp: Number(e.target.value) })} style={inp} />
                </div>
              </div>
              <div>
                <label style={label}>Récompense offerte</label>
                <input value={program.stamps_reward_label} onChange={e => setProgram({ ...program, stamps_reward_label: e.target.value })} placeholder="Ex : Un menu offert" style={inp} />
              </div>
              <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>
                Un tampon est ajouté automatiquement à chaque commande EatUp (dès {program.min_order_for_stamp}€). Après {program.stamps_threshold} tampons, le client peut réclamer : <strong style={{ color: '#78716C' }}>{program.stamps_reward_label || '—'}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Points */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: program.points_enabled ? 20 : 0 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 3px' }}>⭐ Points par euro dépensé</p>
              <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>Convertibles en réduction une fois un palier atteint.</p>
            </div>
            <Toggle on={program.points_enabled} onClick={() => setProgram({ ...program, points_enabled: !program.points_enabled })} />
          </div>

          {program.points_enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Points gagnés par euro dépensé</label>
                  <input type="number" min={0} step={0.5} value={program.points_per_euro} onChange={e => setProgram({ ...program, points_per_euro: Number(e.target.value) })} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Points requis pour la récompense</label>
                  <input type="number" min={1} value={program.points_per_reward} onChange={e => setProgram({ ...program, points_per_reward: Number(e.target.value) })} style={inp} />
                </div>
              </div>
              <div>
                <label style={label}>Récompense offerte</label>
                <input value={program.points_reward_label} onChange={e => setProgram({ ...program, points_reward_label: e.target.value })} placeholder="Ex : 5€ de réduction" style={inp} />
              </div>
              <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>
                1€ dépensé = {program.points_per_euro} point{program.points_per_euro > 1 ? 's' : ''}. À {program.points_per_reward} points, le client peut réclamer : <strong style={{ color: '#78716C' }}>{program.points_reward_label || '—'}</strong>.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '15px', borderRadius: 14, border: 'none', cursor: saving ? 'default' : 'pointer', background: saved ? '#4ade80' : '#f97316', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}
        >
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        <p style={{ fontSize: 12, color: '#A8A29E', textAlign: 'center', margin: 0 }}>
          Les clients consultent leur solde sur <strong>eatup-app.fr/restaurant/{restaurant?.slug}/fidelite</strong>. Créditez un client venu payer en caisse depuis l'onglet <strong>Clients</strong>.
        </p>

      </main>
    </div>
  )
}
