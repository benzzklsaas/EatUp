'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

type DaySchedule = {
  day_of_week: number
  is_closed: boolean
  opening_time_1: string
  closing_time_1: string
  opening_time_2: string | null
  closing_time_2: string | null
  slot_duration: number
}

type Closure = {
  id?: string
  closed_date: string
  reason: string
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [newClosure, setNewClosure] = useState({ closed_date: '', reason: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurant(resto)

      const { data: scheduleData } = await supabase
        .from('restaurant_schedule')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('day_of_week')

      if (scheduleData && scheduleData.length === 7) {
        setSchedule(scheduleData.map(d => ({
          ...d,
          opening_time_1: d.opening_time_1?.slice(0, 5) || '11:00',
          closing_time_1: d.closing_time_1?.slice(0, 5) || '15:00',
          opening_time_2: d.opening_time_2?.slice(0, 5) || null,
          closing_time_2: d.closing_time_2?.slice(0, 5) || null,
        })))
      } else {
        // Initialiser les 7 jours par défaut
        const defaults: DaySchedule[] = DAYS.map((_, i) => ({
          day_of_week: i,
          is_closed: i === 6, // dimanche fermé par défaut
          opening_time_1: '11:00',
          closing_time_1: '15:00',
          opening_time_2: '18:00',
          closing_time_2: '23:00',
          slot_duration: 15,
        }))
        setSchedule(defaults)
      }

      const { data: closuresData } = await supabase
        .from('restaurant_closures')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('closed_date')
      setClosures(closuresData || [])
      setLoading(false)
    }
    load()
  }, [])

  function updateDay(i: number, field: string, value: any) {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  async function handleSave() {
    if (!restaurant) return
    setSaving(true)

    for (const day of schedule) {
      await supabase.from('restaurant_schedule').upsert({
        restaurant_id: restaurant.id,
        ...day,
        opening_time_2: day.opening_time_2 || null,
        closing_time_2: day.closing_time_2 || null,
      }, { onConflict: 'restaurant_id,day_of_week' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addClosure() {
    if (!newClosure.closed_date || !restaurant) return
    const { data } = await supabase.from('restaurant_closures').insert({
      restaurant_id: restaurant.id,
      closed_date: newClosure.closed_date,
      reason: newClosure.reason || null,
    }).select().single()
    if (data) {
      setClosures(prev => [...prev, data])
      setNewClosure({ closed_date: '', reason: '' })
    }
  }

  async function removeClosure(id: string) {
    await supabase.from('restaurant_closures').delete().eq('id', id)
    setClosures(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{ background: '#0f172a' }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#64748b' }}>← Retour</button>
        <h1 className="font-bold text-white text-lg">Paramètres</h1>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Horaires par jour */}
        <div className="rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-5">Horaires d'ouverture</h2>
          <div className="space-y-4">
            {DAYS.map((day, i) => {
              const d = schedule[i]
              if (!d) return null
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white">{day}</span>
                    <button
                      onClick={() => updateDay(i, 'is_closed', !d.is_closed)}
                      className="text-xs px-3 py-1 rounded-full font-medium transition"
                      style={{
                        background: d.is_closed ? '#450a0a' : '#052e16',
                        color: d.is_closed ? '#fca5a5' : '#4ade80',
                        border: '1px solid',
                        borderColor: d.is_closed ? '#7f1d1d' : '#14532d',
                      }}
                    >
                      {d.is_closed ? 'Fermé' : 'Ouvert'}
                    </button>
                  </div>

                  {!d.is_closed && (
                    <div className="space-y-3">
                      {/* Plage 1 */}
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748b' }}>Plage 1</p>
                        <div className="flex gap-2 items-center">
                          <input type="time" value={d.opening_time_1} onChange={e => updateDay(i, 'opening_time_1', e.target.value)}
                            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }} />
                          <span style={{ color: '#475569' }}>→</span>
                          <input type="time" value={d.closing_time_1} onChange={e => updateDay(i, 'closing_time_1', e.target.value)}
                            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }} />
                        </div>
                      </div>

                      {/* Plage 2 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs" style={{ color: '#64748b' }}>Plage 2 (optionnel)</p>
                          <button
                            onClick={() => updateDay(i, 'opening_time_2', d.opening_time_2 ? null : '18:00')}
                            className="text-xs" style={{ color: '#3b82f6' }}
                          >
                            {d.opening_time_2 ? '− Supprimer' : '+ Ajouter'}
                          </button>
                        </div>
                        {d.opening_time_2 && (
                          <div className="flex gap-2 items-center">
                            <input type="time" value={d.opening_time_2 || ''} onChange={e => updateDay(i, 'opening_time_2', e.target.value)}
                              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }} />
                            <span style={{ color: '#475569' }}>→</span>
                            <input type="time" value={d.closing_time_2 || ''} onChange={e => updateDay(i, 'closing_time_2', e.target.value)}
                              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }} />
                          </div>
                        )}
                      </div>

                      {/* Durée créneaux */}
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748b' }}>Créneaux</p>
                        <div className="flex gap-2">
                          {[15, 20, 30].map(dur => (
                            <button key={dur} type="button" onClick={() => updateDay(i, 'slot_duration', dur)}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition"
                              style={{
                                background: d.slot_duration === dur ? '#3b82f6' : '#1e293b',
                                color: d.slot_duration === dur ? 'white' : '#64748b',
                                border: '1px solid',
                                borderColor: d.slot_duration === dur ? '#3b82f6' : '#334155',
                              }}>
                              {dur} min
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl font-semibold mt-6 transition"
            style={{ background: saved ? '#10b981' : '#3b82f6', color: 'white' }}>
            {saved ? '✓ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
          </button>
        </div>

        {/* Fermetures ponctuelles */}
        <div className="rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-5">Fermetures exceptionnelles</h2>

          <div className="flex gap-2 mb-4">
            <input type="date" value={newClosure.closed_date}
              onChange={e => setNewClosure({ ...newClosure, closed_date: e.target.value })}
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }} />
            <input placeholder="Raison (optionnel)" value={newClosure.reason}
              onChange={e => setNewClosure({ ...newClosure, reason: e.target.value })}
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white' }} />
            <button onClick={addClosure}
              className="px-4 py-2 rounded-xl font-medium text-sm"
              style={{ background: '#3b82f6', color: 'white' }}>
              +
            </button>
          </div>

          {closures.length === 0 ? (
            <p className="text-sm" style={{ color: '#475569' }}>Aucune fermeture planifiée</p>
          ) : (
            <div className="space-y-2">
              {closures.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(c.closed_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {c.reason && <p className="text-xs" style={{ color: '#64748b' }}>{c.reason}</p>}
                  </div>
                  <button onClick={() => c.id && removeClosure(c.id)} style={{ color: '#ef4444' }} className="text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
