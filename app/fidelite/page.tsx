'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import QRCode from 'qrcode'

const S = {
  page: { minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as React.CSSProperties,
  wrap: { maxWidth: 480, margin: '0 auto', padding: '32px 20px 60px' } as React.CSSProperties,
  card: { borderRadius: 24, padding: '24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } as React.CSSProperties,
  input: { width: '100%', borderRadius: 12, padding: '13px 16px', fontSize: 14, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btn: { width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 24px rgba(249,115,22,0.3)' } as React.CSSProperties,
}

export default function LoyaltyHubPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [myAccounts, setMyAccounts] = useState<any[]>([])
  const [directory, setDirectory] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser?.email) {
        const { data: customerRow } = await supabase.from('customers').select('*').eq('email', authUser.email.toLowerCase()).maybeSingle()
        setCustomer(customerRow)

        if (customerRow) {
          const { data: accounts } = await supabase
            .from('loyalty_accounts')
            .select('*, restaurants(name, slug, logo_url)')
            .eq('customer_id', customerRow.id)
          setMyAccounts(accounts || [])

          QRCode.toDataURL(`${window.location.origin}/dashboard/scan/${customerRow.id}`, { width: 220, margin: 1, color: { dark: '#1A1208', light: '#FFFBF5' } })
            .then(setQrDataUrl).catch(() => {})

          const { data: programs } = await supabase
            .from('loyalty_programs')
            .select('restaurant_id, stamps_enabled, points_enabled, restaurants(name, slug, logo_url, is_open)')
            .or('stamps_enabled.eq.true,points_enabled.eq.true')
          const myRestaurantIds = new Set((accounts || []).map((a: any) => a.restaurant_id))
          setDirectory((programs || []).filter((p: any) => !myRestaurantIds.has(p.restaurant_id) && p.restaurants))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/fidelite` },
    })
    setSending(false)
    if (error) { setError("Impossible d'envoyer le lien. Réessayez."); return }
    setSent(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setCustomer(null)
  }

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1208', letterSpacing: '-0.5px', margin: '0 0 6px' }}>🎁 Ma fidélité EatUp</h1>
          <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Tous vos points et récompenses, dans tous vos restaurants préférés.</p>
        </div>

        {!user || !customer ? (
          <div style={S.card}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📧</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 6px' }}>Lien envoyé !</p>
                <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Ouvrez l'email reçu à <strong>{email}</strong> pour accéder à votre espace fidélité.</p>
              </div>
            ) : (
              <form onSubmit={sendMagicLink}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 6px' }}>Connexion</p>
                <p style={{ fontSize: 13, color: '#78716C', margin: '0 0 16px' }}>Entrez l'email utilisé lors de vos commandes, on vous envoie un lien de connexion — aucun mot de passe.</p>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" style={{ ...S.input, marginBottom: 12 }} />
                {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>}
                <button type="submit" disabled={sending} style={{ ...S.btn, opacity: sending ? 0.7 : 1 }}>{sending ? 'Envoi...' : 'Recevoir mon lien de connexion'}</button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* QR carte client */}
            {qrDataUrl && (
              <div style={{ ...S.card, textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#78716C', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ma carte</p>
                <p style={{ fontSize: 12, color: '#A8A29E', margin: '0 0 16px' }}>Présentez ce QR code en caisse, dans n'importe quel restaurant EatUp équipé.</p>
                <img src={qrDataUrl} alt="QR code fidélité" style={{ width: 200, height: 200, borderRadius: 16, border: '1.5px solid rgba(0,0,0,0.07)' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1208', margin: '14px 0 0' }}>{customer.first_name} {customer.last_name}</p>
              </div>
            )}

            {/* Mes restaurants */}
            {myAccounts.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Mes restaurants</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myAccounts.map(acc => (
                    <Link key={acc.id} href={`/restaurant/${acc.restaurants?.slug}/fidelite`} style={{ ...S.card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                      {acc.restaurants?.logo_url
                        ? <img src={acc.restaurants.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍽️</div>
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 3px' }}>{acc.restaurants?.name}</p>
                        <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>
                          {acc.stamps_count > 0 && `🥙 ${acc.stamps_count}`}
                          {acc.stamps_count > 0 && acc.points_balance > 0 && ' · '}
                          {acc.points_balance > 0 && `⭐ ${acc.points_balance}`}
                          {!acc.stamps_count && !acc.points_balance && 'Aucun point pour l\'instant'}
                        </p>
                      </div>
                      <span style={{ color: '#f97316', fontSize: 13 }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Annuaire */}
            {directory.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Autres restaurants équipés</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {directory.map((p: any) => (
                    <Link key={p.restaurant_id} href={`/restaurant/${p.restaurants.slug}`} style={{ ...S.card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                      {p.restaurants.logo_url
                        ? <img src={p.restaurants.logo_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🍽️</div>
                      }
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1208', margin: 0, flex: 1 }}>{p.restaurants.name}</p>
                      <span style={{ fontSize: 11, color: p.restaurants.is_open ? '#4ade80' : '#A8A29E', fontWeight: 700 }}>{p.restaurants.is_open ? '● Ouvert' : 'Fermé'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {myAccounts.length === 0 && directory.length === 0 && (
              <div style={{ ...S.card, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Aucun restaurant fidélité disponible pour l'instant.</p>
              </div>
            )}

            <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#78716C', fontSize: 13, cursor: 'pointer', padding: 8 }}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  )
}
