'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    opening_time: '09:00',
    closing_time: '22:00',
    slot_duration: 15,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurant(resto)
      setForm({
        opening_time: resto.opening_time?.slice(0, 5) || '09:00',
        closing_time: resto.closing_time?.slice(0, 5) || '22:00',
        slot_duration: resto.slot_duration || 15,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!restaurant) return
    setSaving(true)
    await supabase.from('restaurants').update(form).eq('id', restaurant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
        <h1 className="font-bold text-white text-lg">Paramètres</h1>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        <div className="rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-5">Horaires de commande</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>Heure d'ouverture</label>
              <input
                type="time"
                value={form.opening_time}
                onChange={e => setForm({ ...form, opening_time: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>Heure de fermeture</label>
              <input
                type="time"
                value={form.closing_time}
                onChange={e => setForm({ ...form, closing_time: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>Durée des créneaux</label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 20, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, slot_duration: d })}
                    className="py-3 rounded-xl text-sm font-semibold transition"
                    style={{
                      background: form.slot_duration === d ? '#3b82f6' : '#0f172a',
                      color: form.slot_duration === d ? 'white' : '#94a3b8',
                      border: '1px solid',
                      borderColor: form.slot_duration === d ? '#3b82f6' : '#334155',
                    }}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold mt-6 transition"
            style={{ background: saved ? '#10b981' : '#3b82f6', color: 'white' }}
          >
            {saved ? '✓ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Les créneaux de retrait proposés aux clients seront générés entre <strong style={{ color: '#94a3b8' }}>{form.opening_time}</strong> et <strong style={{ color: '#94a3b8' }}>{form.closing_time}</strong>, toutes les <strong style={{ color: '#94a3b8' }}>{form.slot_duration} minutes</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}
