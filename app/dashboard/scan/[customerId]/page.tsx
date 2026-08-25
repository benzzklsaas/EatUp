'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

const section: React.CSSProperties = { borderRadius: 20, padding: '24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)' }

export default function ScannedCustomerPage() {
  const params = useParams()
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : (params.customerId as string)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [creditForm, setCreditForm] = useState({ stamps: '', points: '' })
  const [crediting, setCrediting] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth/login?next=/dashboard/scan/${customerId}`); return }

    const res = await fetch(`/api/loyalty/customer/${customerId}`)
    if (!res.ok) { setNotFound(true); setLoading(false); return }
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { load() }, [customerId])

  async function handleCredit() {
    if (!data) return
    const stamps = Number(creditForm.stamps || 0)
    const points = Number(creditForm.points || 0)
    if (stamps <= 0 && points <= 0) return
    setCrediting(true)
    setMsg('')
    const res = await fetch('/api/loyalty/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.customer.email, phone: data.customer.phone, firstName: data.customer.first_name, lastName: data.customer.last_name, stamps, points, note: 'Crédit via scan QR' }),
    })
    if (res.ok) { setCreditForm({ stamps: '', points: '' }); setMsg('✓ Crédité'); await load() }
    else { const { error } = await res.json().catch(() => ({ error: 'Erreur' })); setMsg(error || 'Erreur') }
    setCrediting(false)
  }

  async function handleRedeem(type: 'stamps' | 'points') {
    setRedeeming(true)
    setMsg('')
    const res = await fetch('/api/loyalty/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, type }),
    })
    if (res.ok) { setMsg('🎁 Récompense remise'); await load() }
    else { const { error } = await res.json().catch(() => ({ error: 'Erreur' })); setMsg(error || 'Erreur') }
    setRedeeming(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  if (notFound || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <p style={{ color: '#78716C', fontSize: 14 }}>Client introuvable.</p>
      </div>
    </div>
  )

  const { customer, program, account } = data
  const stampsAvailable = program?.stamps_enabled ? Math.floor((account.stamps_count || 0) / program.stamps_threshold) : 0
  const pointsAvailable = program?.points_enabled ? Math.floor((account.points_balance || 0) / program.points_per_reward) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(255,251,245,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard/scan')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Scanner</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1208', margin: 0 }}>Client scanné</p>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
              {(customer.first_name || '?')[0]}{(customer.last_name || '')[0]}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#1A1208', margin: '0 0 4px' }}>{customer.first_name} {customer.last_name}</p>
              <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>{customer.email}</p>
            </div>
          </div>
        </div>

        {!program || (!program.stamps_enabled && !program.points_enabled) ? (
          <div style={{ ...section, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Ton programme de fidélité n'est pas activé. Configure-le dans <strong>Dashboard → Fidélité</strong>.</p>
          </div>
        ) : (
          <div style={{ ...section, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              {program.stamps_enabled && (
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#1A1208', margin: 0 }}>{account.stamps_count ?? 0}<span style={{ fontSize: 13, color: '#A8A29E', fontWeight: 600 }}> / {program.stamps_threshold} 🥙</span></p>
                  {stampsAvailable > 0 && <p style={{ fontSize: 11, color: '#f97316', fontWeight: 700, margin: '2px 0 0' }}>{stampsAvailable} récompense{stampsAvailable > 1 ? 's' : ''} dispo</p>}
                </div>
              )}
              {program.points_enabled && (
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#1A1208', margin: 0 }}>{account.points_balance ?? 0}<span style={{ fontSize: 13, color: '#A8A29E', fontWeight: 600 }}> pts</span></p>
                  {pointsAvailable > 0 && <p style={{ fontSize: 11, color: '#f97316', fontWeight: 700, margin: '2px 0 0' }}>{pointsAvailable} récompense{pointsAvailable > 1 ? 's' : ''} dispo</p>}
                </div>
              )}
            </div>

            {(stampsAvailable > 0 || pointsAvailable > 0) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {stampsAvailable > 0 && (
                  <button onClick={() => handleRedeem('stamps')} disabled={redeeming} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 13 }}>
                    Offrir : {program.stamps_reward_label}
                  </button>
                )}
                {pointsAvailable > 0 && (
                  <button onClick={() => handleRedeem('points')} disabled={redeeming} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 13 }}>
                    Offrir : {program.points_reward_label}
                  </button>
                )}
              </div>
            )}

            <p style={{ fontSize: 11, color: '#78716C', fontWeight: 600, margin: '0 0 8px' }}>Créditer cette visite</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {program.stamps_enabled && (
                <input type="number" min={0} placeholder="Tampons" value={creditForm.stamps} onChange={e => setCreditForm({ ...creditForm, stamps: e.target.value })} style={{ width: 80, borderRadius: 10, padding: '10px', fontSize: 13, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none' }} />
              )}
              {program.points_enabled && (
                <input type="number" min={0} placeholder="Points" value={creditForm.points} onChange={e => setCreditForm({ ...creditForm, points: e.target.value })} style={{ width: 80, borderRadius: 10, padding: '10px', fontSize: 13, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none' }} />
              )}
              <button onClick={handleCredit} disabled={crediting} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid rgba(249,115,22,0.3)', cursor: 'pointer', background: 'white', color: '#f97316', fontWeight: 700, fontSize: 13 }}>
                {crediting ? '...' : 'Créditer'}
              </button>
            </div>
            {msg && <p style={{ fontSize: 12, color: '#78716C', margin: '10px 0 0' }}>{msg}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
