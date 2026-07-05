'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentPage() {
  const router = useRouter()
  const [review, setReview] = useState('')
  const [restaurantName, setRestaurantName] = useState('Crousty Naan')
  const [tone, setTone] = useState('friendly')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!review.trim()) return
    setLoading(true)
    setResponse('')
    setCopied(false)

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review, restaurantName, tone }),
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

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Agent IA</p>
        </div>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>BETA</span>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 720, margin: '0 auto' }}>

        {/* Intro */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 24, margin: '0 0 8px' }}>Réponse aux avis Google</h1>
          <p style={{ color: '#4b5563', fontSize: 14, margin: 0 }}>Colle un avis reçu — l'agent génère une réponse professionnelle prête à publier.</p>
        </div>

        {/* Config */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurant</label>
            <input
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              style={{ width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ton</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              style={{ height: 44, borderRadius: 12, padding: '0 14px', fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', outline: 'none', cursor: 'pointer' }}
            >
              <option value="friendly">Chaleureux</option>
              <option value="neutral">Neutre</option>
              <option value="formal">Formel</option>
            </select>
          </div>
        </div>

        {/* Avis input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avis Google reçu</label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Colle ici l'avis Google du client..."
            rows={5}
            style={{ width: '100%', borderRadius: 14, padding: '14px 16px', fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Bouton */}
        <button
          onClick={generate}
          disabled={loading || !review.trim()}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: loading || !review.trim() ? 'default' : 'pointer', background: loading || !review.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: loading || !review.trim() ? '#374151' : 'white', fontWeight: 800, fontSize: 15, transition: 'all 0.2s', boxShadow: loading || !review.trim() ? 'none' : '0 6px 24px rgba(99,102,241,0.4)', marginBottom: 24 }}
        >
          {loading ? '✨ Génération en cours...' : '✨ Générer une réponse'}
        </button>

        {/* Réponse générée */}
        {response && (
          <div style={{ borderRadius: 16, padding: '20px 22px', background: 'linear-gradient(145deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ color: '#818cf8', fontWeight: 700, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✨ Réponse générée</p>
              <button
                onClick={copy}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.2)', color: copied ? '#4ade80' : '#818cf8', fontWeight: 700, fontSize: 12, transition: 'all 0.2s' }}
              >
                {copied ? '✓ Copié !' : 'Copier'}
              </button>
            </div>
            <p style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{response}</p>
          </div>
        )}
      </main>
    </div>
  )
}
