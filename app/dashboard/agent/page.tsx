'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const TONES = [
  { value: 'friendly', label: 'Chaleureux', desc: 'Proche et authentique' },
  { value: 'neutral', label: 'Neutre', desc: 'Équilibré et pro' },
  { value: 'formal', label: 'Formel', desc: 'Institutionnel et sobre' },
]

export default function AgentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [review, setReview] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [tone, setTone] = useState('friendly')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadRestaurant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: resto } = await supabase.from('restaurants').select('name').eq('owner_id', user.id).single()
      if (resto?.name) setRestaurantName(resto.name)
    }
    loadRestaurant()
  }, [])

  async function generate() {
    if (!review.trim()) return
    setLoading(true)
    setResponse('')
    setCopied(false)
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review, restaurantName: restaurantName || 'Mon restaurant', tone }),
    })
    const data = await res.json()
    setResponse(data.response || data.error || 'Erreur inconnue')
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        textarea:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; }
      `}</style>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(20px)', zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 8px 4px 0' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✦</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>Agent IA</p>
            <p style={{ fontSize: 11, color: '#6366f1', margin: 0, fontWeight: 600 }}>Réponses Google · Premium</p>
          </div>
        </div>
        {restaurantName && (
          <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{restaurantName}</span>
        )}
      </header>

      <main style={{ padding: '40px 24px', maxWidth: 640, margin: '0 auto' }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 8px' }}>
            Répondez à vos avis<br />comme un pro.
          </h1>
          <p style={{ color: '#374151', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Collez un avis Google — l'IA génère une réponse personnalisée, signée{restaurantName ? ` La Team - ${restaurantName}` : ''}, prête à publier en 10 secondes.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Ton de réponse</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                style={{
                  padding: '12px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: tone === t.value ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                  background: tone === t.value ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: tone === t.value ? '#a78bfa' : 'white', margin: '0 0 2px' }}>{t.label}</p>
                <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Avis reçu</label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Collez ici l'avis Google du client..."
            rows={5}
            style={{ width: '100%', borderRadius: 12, padding: '14px 16px', fontSize: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'white', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading || !review.trim()}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            cursor: loading || !review.trim() ? 'default' : 'pointer',
            background: loading || !review.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: loading || !review.trim() ? '#374151' : 'white',
            fontWeight: 700, fontSize: 15, transition: 'all 0.2s',
            boxShadow: loading || !review.trim() ? 'none' : '0 8px 32px rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 28,
          }}
        >
          {loading
            ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Génération en cours…</>
            : '✦ Générer la réponse'}
        </button>

        {response && (
          <div style={{ animation: 'fade-in 0.3s ease' }}>
            <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Réponse générée</span>
                </div>
                <button
                  onClick={copy}
                  style={{
                    padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(99,102,241,0.15)',
                    color: copied ? '#4ade80' : '#818cf8',
                  }}
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <div style={{ padding: '20px 18px' }}>
                <p style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{response}</p>
              </div>
            </div>

            <button
              onClick={generate}
              style={{ marginTop: 10, width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#4b5563', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ↻ Régénérer
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
