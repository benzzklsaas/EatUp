'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'

const S = {
  page: { minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as React.CSSProperties,
  wrap: { maxWidth: 440, margin: '0 auto', padding: '32px 20px 60px' } as React.CSSProperties,
  card: { borderRadius: 24, padding: '28px 24px', background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } as React.CSSProperties,
  input: { width: '100%', borderRadius: 12, padding: '13px 16px', fontSize: 14, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btn: { width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 24px rgba(249,115,22,0.3)' } as React.CSSProperties,
}

export default function LoyaltyCardPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string)
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: resto } = await supabase.from('restaurants').select('id, name, slug, logo_url').eq('slug', slug).single()
      if (!resto) { setLoading(false); return }
      setRestaurant(resto)

      const { data: programData } = await supabase.from('loyalty_programs').select('*').eq('restaurant_id', resto.id).maybeSingle()
      setProgram(programData)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser?.email) {
        const { data: customer } = await supabase.from('customers').select('id').eq('email', authUser.email.toLowerCase()).maybeSingle()
        if (customer) {
          const { data: acc } = await supabase.from('loyalty_accounts').select('*').eq('restaurant_id', resto.id).eq('customer_id', customer.id).maybeSingle()
          setAccount(acc)
          QRCode.toDataURL(`${window.location.origin}/dashboard/scan/${customer.id}`, { width: 200, margin: 1, color: { dark: '#1A1208', light: '#FFFBF5' } })
            .then(setQrDataUrl).catch(() => {})
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/restaurant/${slug}/fidelite` },
    })
    setSending(false)
    if (error) { setError("Impossible d'envoyer le lien. Réessayez."); return }
    setSent(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setAccount(null)
  }

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  if (!restaurant) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Restaurant introuvable</p>
    </div>
  )

  const programActive = program && (program.stamps_enabled || program.points_enabled)

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href={`/restaurant/${slug}`} style={{ display: 'inline-block', marginBottom: 20, fontSize: 13, color: '#78716C', textDecoration: 'none', fontWeight: 600 }}>← Retour au menu</Link>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {restaurant.logo_url && <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px', objectFit: 'cover' }} />}
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1208', letterSpacing: '-0.5px', margin: '0 0 4px' }}>🎁 Fidélité — {restaurant.name}</h1>
        </div>

        {!programActive ? (
          <div style={{ ...S.card, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#78716C', margin: 0 }}>Ce restaurant n'a pas encore activé son programme de fidélité.</p>
          </div>
        ) : !user ? (
          <div style={S.card}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📧</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 6px' }}>Lien envoyé !</p>
                <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>Ouvrez l'email reçu à <strong>{email}</strong> pour voir votre carte fidélité.</p>
              </div>
            ) : (
              <form onSubmit={sendMagicLink}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1208', margin: '0 0 6px' }}>Consultez votre solde</p>
                <p style={{ fontSize: 13, color: '#78716C', margin: '0 0 16px' }}>Entrez l'email utilisé lors de vos commandes, on vous envoie un lien de connexion.</p>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" style={{ ...S.input, marginBottom: 12 }} />
                {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>}
                <button type="submit" disabled={sending} style={{ ...S.btn, opacity: sending ? 0.7 : 1 }}>{sending ? 'Envoi...' : 'Recevoir mon lien de connexion'}</button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {program.stamps_enabled && (() => {
              const threshold = program.stamps_threshold
              const stampsCount = account?.stamps_count ?? 0
              const rewardsAvailable = Math.floor(stampsCount / threshold)
              const progress = rewardsAvailable > 0 && stampsCount % threshold === 0 ? threshold : stampsCount % threshold
              return (
                <div style={S.card}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#78716C', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Carte tampon</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                    {Array.from({ length: threshold }).map((_, i) => (
                      <div key={i} style={{
                        aspectRatio: '1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                        background: i < progress ? 'rgba(249,115,22,0.12)' : '#FAFAF8', border: `1.5px dashed ${i < progress ? '#f97316' : 'rgba(0,0,0,0.12)'}`,
                      }}>
                        {i < progress ? '🥙' : ''}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: '#78716C', margin: 0, textAlign: 'center' }}>
                    {rewardsAvailable > 0
                      ? <span style={{ color: '#f97316', fontWeight: 700 }}>🎉 Récompense disponible chez le commerçant : {program.stamps_reward_label}</span>
                      : <>{progress} / {threshold} — encore {threshold - progress} pour : <strong>{program.stamps_reward_label}</strong></>
                    }
                  </p>
                </div>
              )
            })()}

            {program.points_enabled && (
              <div style={S.card}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#78716C', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Points</p>
                <p style={{ fontSize: 40, fontWeight: 900, color: '#1A1208', textAlign: 'center', margin: '0 0 8px', letterSpacing: '-1px' }}>{account?.points_balance ?? 0}</p>
                <div style={{ height: 8, borderRadius: 100, background: '#FAFAF8', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', borderRadius: 100, background: '#f97316', width: `${Math.min(100, ((account?.points_balance ?? 0) % program.points_per_reward) / program.points_per_reward * 100)}%` }} />
                </div>
                <p style={{ fontSize: 13, color: '#78716C', margin: 0, textAlign: 'center' }}>
                  {Math.floor((account?.points_balance ?? 0) / program.points_per_reward) > 0
                    ? <span style={{ color: '#f97316', fontWeight: 700 }}>🎉 Récompense disponible chez le commerçant : {program.points_reward_label}</span>
                    : <>À {program.points_per_reward} points : <strong>{program.points_reward_label}</strong></>
                  }
                </p>
              </div>
            )}

            {qrDataUrl && (
              <div style={{ ...S.card, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#78716C', margin: '0 0 14px' }}>Ou présentez directement ce QR code en caisse</p>
                <img src={qrDataUrl} alt="QR code fidélité" style={{ width: 180, height: 180, borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.07)' }} />
              </div>
            )}

            <Link href="/fidelite" style={{ textAlign: 'center', fontSize: 13, color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
              Voir tous mes restaurants fidélité →
            </Link>

            <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#78716C', fontSize: 13, cursor: 'pointer', padding: 8 }}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  )
}
