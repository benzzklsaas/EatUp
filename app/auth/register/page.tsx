'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: 'white', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }
const sectionStyle: React.CSSProperties = { borderRadius: 16, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }

export default function RegisterPage() {
  const [form, setForm] = useState({ restaurantName: '', email: '', password: '', phone: '', address: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const addressDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleAddressInput(q: string) {
    update('address', q)
    if (addressDebounce.current) clearTimeout(addressDebounce.current)
    if (q.length < 3) { setAddressSuggestions([]); return }
    addressDebounce.current = setTimeout(async () => {
      setAddressLoading(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&accept-language=fr`)
        const data = await res.json()
        setAddressSuggestions(data)
      } catch { setAddressSuggestions([]) }
      setAddressLoading(false)
    }, 350)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      const baseSlug = form.restaurantName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6)
      const { error: restoError } = await supabase.from('restaurants').insert({
        name: form.restaurantName, email: form.email, phone: form.phone,
        address: form.address, description: form.description, owner_id: data.user.id, slug,
      })
      if (restoError) { setError('Erreur lors de la création — veuillez réessayer.'); setLoading(false); return }
    }

    router.push('/subscribe')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 520, borderRadius: 24, padding: '48px 40px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={56} height={56} style={{ borderRadius: '50%', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 8px' }}>Créez votre restaurant</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Prêt en 5 minutes · 19,99€/mois sans engagement</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Restaurant */}
          <div style={sectionStyle}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Votre restaurant</p>
            <div>
              <label style={labelStyle}>Nom du restaurant *</label>
              <input type="text" value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)} placeholder="Crousty Naan" required style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={e => handleAddressInput(e.target.value)}
                placeholder="13 rue Jean Mermoz, Bordeaux"
                style={inputStyle}
                autoComplete="off"
              />
              {addressLoading && (
                <div style={{ position: 'absolute', right: 12, top: 38, fontSize: 12, color: '#6366f1' }}>...</div>
              )}
              {addressSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginTop: 4, overflow: 'hidden' }}>
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { update('address', s.display_name); setAddressSuggestions([]) }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'white', fontSize: 13, cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      📍 {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="05 56 00 00 00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description courte</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Cuisine indienne, spécialités tandoor..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
          </div>

          {/* Compte */}
          <div style={sectionStyle}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Votre compte</p>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="votre@email.com" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mot de passe *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="8 caractères minimum" required minLength={8} style={inputStyle} />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: 15,
            boxShadow: loading ? 'none' : '0 8px 30px rgba(99,102,241,0.3)',
          }}>
            {loading ? 'Création...' : 'Créer mon restaurant →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#1f2937' }}>
            Après inscription, vous activerez votre abonnement.
          </p>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#374151' }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
