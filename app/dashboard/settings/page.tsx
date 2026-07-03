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

type Closure = { id?: string; closed_date: string; reason: string }

const inp: React.CSSProperties = { width: '100%', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none', boxSizing: 'border-box' }
const timeInput: React.CSSProperties = { flex: 1, borderRadius: 10, padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }
const label: React.CSSProperties = { fontSize: 12, color: '#4b5563', fontWeight: 600, marginBottom: 6, display: 'block' }

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [newClosure, setNewClosure] = useState({ closed_date: '', reason: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [infoForm, setInfoForm] = useState({ name: '', description: '', address: '', phone: '', daily_message: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [savedInfo, setSavedInfo] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurant(resto)
      setInfoForm({ name: resto.name || '', description: resto.description || '', address: resto.address || '', phone: resto.phone || '', daily_message: resto.daily_message || '' })

      const { data: scheduleData } = await supabase.from('restaurant_schedule').select('*').eq('restaurant_id', resto.id).order('day_of_week')
      if (scheduleData && scheduleData.length === 7) {
        setSchedule(scheduleData.map((d: any) => ({ ...d, opening_time_1: d.opening_time_1?.slice(0, 5) || '11:00', closing_time_1: d.closing_time_1?.slice(0, 5) || '15:00', opening_time_2: d.opening_time_2?.slice(0, 5) || null, closing_time_2: d.closing_time_2?.slice(0, 5) || null })))
      } else {
        setSchedule(DAYS.map((_, i) => ({ day_of_week: i, is_closed: i === 6, opening_time_1: '11:00', closing_time_1: '15:00', opening_time_2: '18:00', closing_time_2: '23:00', slot_duration: 15 })))
      }

      const { data: closuresData } = await supabase.from('restaurant_closures').select('*').eq('restaurant_id', resto.id).order('closed_date')
      setClosures(closuresData || [])
      setLoading(false)
    }
    load()
  }, [])

  function updateDay(i: number, field: string, value: any) {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  async function handleSaveSchedule() {
    if (!restaurant) return
    setSaving(true)
    for (const day of schedule) {
      await supabase.from('restaurant_schedule').upsert({ restaurant_id: restaurant.id, ...day, opening_time_2: day.opening_time_2 || null, closing_time_2: day.closing_time_2 || null }, { onConflict: 'restaurant_id,day_of_week' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function uploadImage(file: File, type: 'logo' | 'cover') {
    if (!restaurant) return
    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${restaurant.id}/${type}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      const field = type === 'logo' ? 'logo_url' : 'cover_image_url'
      await supabase.from('restaurants').update({ [field]: publicUrl }).eq('id', restaurant.id)
      setRestaurant({ ...restaurant, [field]: publicUrl })
    }
    setUploading(false)
  }

  async function handleSaveInfo() {
    if (!restaurant) return
    setSavingInfo(true)
    await supabase.from('restaurants').update({
      name: infoForm.name,
      description: infoForm.description,
      address: infoForm.address,
      phone: infoForm.phone,
      daily_message: infoForm.daily_message,
    }).eq('id', restaurant.id)
    setSavingInfo(false)
    setSavedInfo(true)
    setTimeout(() => setSavedInfo(false), 2000)
  }

  async function toggleOpen() {
    const next = !restaurant.is_open
    await supabase.from('restaurants').update({ is_open: next }).eq('id', restaurant.id)
    setRestaurant({ ...restaurant, is_open: next })
  }

  async function addClosure() {
    if (!newClosure.closed_date || !restaurant) return
    const { data } = await supabase.from('restaurant_closures').insert({ restaurant_id: restaurant.id, closed_date: newClosure.closed_date, reason: newClosure.reason || null }).select().single()
    if (data) { setClosures(prev => [...prev, data]); setNewClosure({ closed_date: '', reason: '' }) }
  }

  async function removeClosure(id: string) {
    await supabase.from('restaurant_closures').delete().eq('id', id)
    setClosures(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  const section: React.CSSProperties = { borderRadius: 20, padding: '24px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)' }

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 48 }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Paramètres</p>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Statut en direct */}
        <div style={{ ...section }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>⚡ Statut en direct</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: 14, background: restaurant.is_open ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${restaurant.is_open ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <div>
              <p style={{ color: restaurant.is_open ? '#4ade80' : '#f87171', fontWeight: 800, fontSize: 16, margin: 0 }}>
                {restaurant.is_open ? '● Ouvert' : '○ Fermé'}
              </p>
              <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Visible par les clients</p>
            </div>
            <button
              onClick={toggleOpen}
              style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: restaurant.is_open ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)', color: restaurant.is_open ? '#f87171' : '#4ade80' }}
            >
              {restaurant.is_open ? 'Fermer maintenant' : 'Ouvrir maintenant'}
            </button>
          </div>
        </div>

        {/* Visuels du restaurant */}
        <div style={{ ...section }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>🖼️ Visuels</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

            {/* Logo */}
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ ...label }}>Logo</p>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <div style={{ width: 96, height: 96, borderRadius: 20, background: '#000', border: '2px dashed rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {restaurant.logo_url
                    ? <img src={restaurant.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'screen' }} />
                    : <span style={{ fontSize: 28 }}>🍽️</span>
                  }
                  {uploadingLogo && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>...</div>}
                </div>
                <p style={{ fontSize: 11, color: '#6366f1', marginTop: 8, fontWeight: 600 }}>Cliquer pour changer</p>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')} />
              </label>
            </div>

            {/* Photo de couverture */}
            <div style={{ flex: 2, minWidth: 200 }}>
              <p style={{ ...label }}>Photo de couverture</p>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <div style={{ height: 96, borderRadius: 16, border: '2px dashed rgba(99,102,241,0.4)', overflow: 'hidden', position: 'relative', background: '#0d1424', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {restaurant.cover_image_url
                    ? <img src={restaurant.cover_image_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 13, color: '#374151' }}>Aucune photo</span>
                  }
                  {uploadingCover && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>Envoi...</div>}
                </div>
                <p style={{ fontSize: 11, color: '#6366f1', marginTop: 8, fontWeight: 600 }}>Cliquer pour changer</p>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'cover')} />
              </label>
            </div>

          </div>
        </div>

        {/* Informations du restaurant */}
        <div style={{ ...section }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>🏪 Informations du restaurant</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Nom du restaurant</label>
              <input value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={label}>Description (affichée aux clients)</label>
              <textarea value={infoForm.description} onChange={e => setInfoForm({ ...infoForm, description: e.target.value })} rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <div>
              <label style={label}>Adresse</label>
              <input value={infoForm.address} onChange={e => setInfoForm({ ...infoForm, address: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={label}>Téléphone</label>
              <input value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} type="tel" style={inp} />
            </div>
            <div>
              <label style={label}>Message du jour 💬 (affiché aux clients sur la page du restaurant)</label>
              <input value={infoForm.daily_message} onChange={e => setInfoForm({ ...infoForm, daily_message: e.target.value })} placeholder="Ex: Spécial du jour : Burger XXL à 8€ !" style={inp} />
            </div>
          </div>
          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            style={{ marginTop: 16, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: savedInfo ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: savedInfo ? '#4ade80' : 'white', fontWeight: 700, fontSize: 13 }}
          >
            {savedInfo ? '✓ Sauvegardé' : savingInfo ? 'Sauvegarde...' : 'Enregistrer les infos'}
          </button>
        </div>

        {/* Horaires */}
        <div style={{ ...section }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>🕐 Horaires d'ouverture</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAYS.map((day, i) => {
              const d = schedule[i]
              if (!d) return null
              return (
                <div key={i} style={{ borderRadius: 14, padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.is_closed ? 0 : 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: d.is_closed ? '#374151' : 'white' }}>{day}</span>
                    <button onClick={() => updateDay(i, 'is_closed', !d.is_closed)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', background: d.is_closed ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', color: d.is_closed ? '#f87171' : '#4ade80', fontWeight: 700 }}>
                      {d.is_closed ? 'Fermé' : 'Ouvert'}
                    </button>
                  </div>
                  {!d.is_closed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 6 }}>Plage 1</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="time" value={d.opening_time_1} onChange={e => updateDay(i, 'opening_time_1', e.target.value)} style={timeInput} />
                          <span style={{ color: '#374151', fontSize: 12 }}>→</span>
                          <input type="time" value={d.closing_time_1} onChange={e => updateDay(i, 'closing_time_1', e.target.value)} style={timeInput} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, margin: 0 }}>Plage 2</p>
                          <button onClick={() => updateDay(i, 'opening_time_2', d.opening_time_2 ? null : '18:00')} style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            {d.opening_time_2 ? '− Supprimer' : '+ Ajouter'}
                          </button>
                        </div>
                        {d.opening_time_2 && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="time" value={d.opening_time_2 || ''} onChange={e => updateDay(i, 'opening_time_2', e.target.value)} style={timeInput} />
                            <span style={{ color: '#374151', fontSize: 12 }}>→</span>
                            <input type="time" value={d.closing_time_2 || ''} onChange={e => updateDay(i, 'closing_time_2', e.target.value)} style={timeInput} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 6 }}>Créneaux</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[15, 20, 30].map(dur => (
                            <button key={dur} onClick={() => updateDay(i, 'slot_duration', dur)} style={{ padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: d.slot_duration === dur ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: d.slot_duration === dur ? '#818cf8' : '#4b5563' }}>
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
          <button onClick={handleSaveSchedule} disabled={saving} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: saved ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: saved ? '#4ade80' : 'white', fontWeight: 700, fontSize: 13 }}>
            {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde...' : 'Enregistrer les horaires'}
          </button>
        </div>

        {/* Fermetures exceptionnelles */}
        <div style={{ ...section }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>📅 Fermetures exceptionnelles</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="date" value={newClosure.closed_date} onChange={e => setNewClosure({ ...newClosure, closed_date: e.target.value })} style={{ flex: 1, borderRadius: 10, padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }} />
            <input placeholder="Raison (optionnel)" value={newClosure.reason} onChange={e => setNewClosure({ ...newClosure, reason: e.target.value })} style={{ flex: 2, borderRadius: 10, padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }} />
            <button onClick={addClosure} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 16 }}>+</button>
          </div>
          {closures.length === 0 ? (
            <p style={{ fontSize: 13, color: '#374151' }}>Aucune fermeture planifiée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {closures.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: '0 0 2px' }}>{new Date(c.closed_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    {c.reason && <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>{c.reason}</p>}
                  </div>
                  <button onClick={() => c.id && removeClosure(c.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
