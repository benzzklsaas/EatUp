'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 1, icon: '🏪', label: 'Votre restaurant' },
  { id: 2, icon: '🏷️', label: 'Catégories' },
  { id: 3, icon: '🍽️', label: 'Menu' },
  { id: 4, icon: '🚀', label: 'C\'est parti !' },
]

const EMOJI_SUGGESTIONS = ['🍔', '🍕', '🌮', '🍜', '🍱', '🥙', '🍣', '🥗', '🍗', '🧆', '🥩', '🍟', '🥤', '🍰', '🫔']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [addressLoading, setAddressLoading] = useState(false)

  // Step 2
  const [categories, setCategories] = useState<{ name: string; emoji: string }[]>([])
  const [catName, setCatName] = useState('')
  const [catEmoji, setCatEmoji] = useState('🍽️')

  // Step 3
  const [products, setProducts] = useState<{ name: string; price: string; category: string }[]>([])
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCat, setProdCat] = useState('')

  const [saving, setSaving] = useState(false)

  async function searchAddress(q: string) {
    setAddress(q)
    if (q.length < 3) { setAddressSuggestions([]); return }
    setAddressLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&accept-language=fr`)
      const data = await res.json()
      setAddressSuggestions(data)
    } catch { setAddressSuggestions([]) }
    setAddressLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (!resto) { router.push('/auth/register'); return }
      setRestaurant(resto)
      setName(resto.name || '')
      setDescription(resto.description || '')
      setAddress(resto.address || '')
      setPhone(resto.phone || '')
      setLoading(false)
    }
    load()
  }, [])

  function goTo(n: number) {
    setAnimating(true)
    setTimeout(() => { setStep(n); setAnimating(false) }, 300)
  }

  async function saveStep1() {
    setSaving(true)
    await supabase.from('restaurants').update({ name, description, address, phone }).eq('id', restaurant.id)
    setSaving(false)
    goTo(2)
  }

  function addCategory() {
    if (!catName.trim()) return
    setCategories([...categories, { name: catName.trim(), emoji: catEmoji }])
    setCatName('')
    setCatEmoji('🍽️')
  }

  async function saveStep2() {
    setSaving(true)
    for (let i = 0; i < categories.length; i++) {
      await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: categories[i].name, emoji: categories[i].emoji, position: i })
    }
    setSaving(false)
    goTo(3)
  }

  function addProduct() {
    if (!prodName.trim() || !prodPrice) return
    setProducts([...products, { name: prodName.trim(), price: prodPrice, category: prodCat }])
    setProdName('')
    setProdPrice('')
  }

  async function saveStep3() {
    setSaving(true)
    for (const p of products) {
      await supabase.from('products').insert({ restaurant_id: restaurant.id, name: p.name, price: parseFloat(p.price), category: p.category, is_available: true, is_online: true })
    }
    setSaving(false)
    goTo(4)
  }

  async function finish() {
    await supabase.from('restaurants').update({ onboarding_done: true }).eq('id', restaurant.id)
    router.push('/dashboard')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 20px #6366f1' }} />
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 14, padding: '13px 16px', fontSize: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Glow background */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-16px); } }
        .step-enter { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .step-exit { animation: fadeOut 0.25s ease forwards; }
        input::placeholder { color: #374151; }
        textarea::placeholder { color: #374151; }
        input:focus, textarea:focus { border-color: rgba(99,102,241,0.5) !important; }
      `}</style>

      {/* Logo + chrono */}
      <div style={{ position: 'fixed', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
        <span style={{ fontWeight: 800, color: 'white', fontSize: 16 }}>EatUp</span>
      </div>
      <div style={{ position: 'fixed', top: 28, right: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>⏱️</span>
        <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>~5 min</span>
      </div>

      {/* Steps indicator */}
      <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              background: step > s.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : step === s.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: step === s.id ? '2px solid #6366f1' : step > s.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.4s ease',
            }}>
              {step > s.id ? '✓' : s.icon}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 40, height: 1, background: step > s.id ? '#6366f1' : 'rgba(255,255,255,0.06)', transition: 'background 0.4s ease', margin: '0 4px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className={animating ? 'step-exit' : 'step-enter'} style={{ width: '100%', maxWidth: 500, borderRadius: 28, padding: '48px 40px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }}>

        {/* ── STEP 1 : Infos restaurant ── */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Étape 1 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 6px' }}>Votre restaurant 🏪</h2>
            <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 32px', lineHeight: 1.6 }}>Ces infos apparaîtront sur votre page client.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nom du restaurant *" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              <textarea placeholder="Description (ambiance, spécialité...)" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Adresse du restaurant"
                  value={address}
                  onChange={e => searchAddress(e.target.value)}
                  style={{ ...inputStyle, paddingRight: addressLoading ? 40 : 16 }}
                  autoComplete="off"
                />
                {addressLoading && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#4b5563' }}>...</span>}
                {addressSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', marginTop: 4 }}>
                    {addressSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setAddress(s.display_name); setAddressSuggestions([]) }}
                        style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#d1d5db', fontSize: 13, borderBottom: i < addressSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', lineHeight: 1.4 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        📍 {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>

            <button onClick={saveStep1} disabled={!name.trim() || saving} style={{ marginTop: 28, width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', background: name.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 700, fontSize: 15, opacity: !name.trim() ? 0.5 : 1, transition: 'all 0.2s', boxShadow: name.trim() ? '0 8px 30px rgba(99,102,241,0.3)' : 'none' }}>
              {saving ? 'Enregistrement...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* ── STEP 2 : Catégories ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Étape 2 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 6px' }}>Vos catégories 🏷️</h2>
            <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 24px', lineHeight: 1.6 }}>Organisez votre menu par catégories (Burgers, Boissons, Desserts...)</p>

            {/* Emojis rapides */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => setCatEmoji(e)} style={{ fontSize: 20, padding: '6px 8px', borderRadius: 8, border: `1px solid ${catEmoji === e ? '#6366f1' : 'rgba(255,255,255,0.06)'}`, background: catEmoji === e ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={catEmoji} onChange={e => setCatEmoji(e.target.value)} style={{ ...inputStyle, width: 60, textAlign: 'center', fontSize: 20, flexShrink: 0 }} />
              <input placeholder="Nom de la catégorie" value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addCategory} disabled={!catName.trim()} style={{ padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>+</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, minHeight: 40 }}>
              {categories.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <span style={{ fontSize: 18 }}>{c.emoji}</span>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 14, flex: 1 }}>{c.name}</span>
                  <button onClick={() => setCategories(categories.filter((_, j) => j !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              ))}
              {categories.length === 0 && <p style={{ color: '#1f2937', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Ajoutez au moins une catégorie</p>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => goTo(1)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#4b5563', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Retour</button>
              <button onClick={categories.length > 0 ? saveStep2 : () => goTo(3)} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
                {saving ? 'Enregistrement...' : categories.length === 0 ? 'Passer →' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 : Premier produit ── */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Étape 3 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 6px' }}>Votre menu 🍽️</h2>
            <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 24px', lineHeight: 1.6 }}>Ajoutez vos premiers plats. Vous pourrez en ajouter autant que vous voulez ensuite.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input placeholder="Nom du plat *" value={prodName} onChange={e => setProdName(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Prix (ex: 9.90) *" value={prodPrice} onChange={e => setProdPrice(e.target.value)} type="number" step="0.5" style={{ ...inputStyle, flex: 1 }} />
                {categories.length > 0 && (
                  <select value={prodCat} onChange={e => setProdCat(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    <option value="">Catégorie</option>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                  </select>
                )}
              </div>
              <button onClick={addProduct} disabled={!prodName.trim() || !prodPrice} style={{ padding: '11px', borderRadius: 12, border: 'none', cursor: prodName.trim() && prodPrice ? 'pointer' : 'not-allowed', background: prodName.trim() && prodPrice ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: '#818cf8', fontWeight: 700, opacity: !prodName.trim() || !prodPrice ? 0.5 : 1 }}>
                + Ajouter ce plat
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, minHeight: 40 }}>
              {products.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 13, flex: 1 }}>{p.name}</span>
                  <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 13 }}>{parseFloat(p.price).toFixed(2)}€</span>
                  <button onClick={() => setProducts(products.filter((_, j) => j !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              ))}
              {products.length === 0 && <p style={{ color: '#1f2937', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Aucun plat ajouté</p>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => goTo(2)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#4b5563', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Retour</button>
              <button onClick={products.length > 0 ? saveStep3 : () => goTo(4)} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
                {saving ? 'Enregistrement...' : products.length === 0 ? 'Passer →' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 : Guide de découverte ── */}
        {step === 4 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', margin: '0 0 8px' }}>Votre restaurant est en ligne !</h2>
              <p style={{ fontSize: 14, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>Voici tout ce qu'EatUp fait pour vous, dès maintenant.</p>
            </div>

            {/* Lien de la page */}
            {restaurant?.slug && (
              <div style={{ borderRadius: 14, padding: '12px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#818cf8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  eatup.fr/restaurant/{restaurant.slug}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || 'https://eatup-app.fr'}/restaurant/${restaurant.slug}`); alert('Lien copié !') }}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: 700, fontSize: 12, flexShrink: 0 }}
                >
                  Copier
                </button>
              </div>
            )}

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>

              {[
                {
                  icon: '🍽️',
                  title: 'Menu digital illimité',
                  desc: 'Ajoutez vos plats, photos, prix et catégories depuis Menu → Produits. Tout se met à jour en temps réel pour vos clients.',
                  color: '#60a5fa',
                },
                {
                  icon: '🍟',
                  title: 'Formules Plat + Boisson',
                  desc: 'Augmentez votre ticket moyen en proposant des menus sur chaque produit. Activez-les depuis Menu → Produits → modifier un plat.',
                  color: '#f59e0b',
                  badge: 'NOUVEAU',
                },
                {
                  icon: '⚙️',
                  title: 'Options & personnalisation',
                  desc: 'Sauces, cuissons, suppléments… Créez des groupes d\'options obligatoires ou facultatifs pour chaque plat dans Menu → Options.',
                  color: '#a78bfa',
                },
                {
                  icon: '🕐',
                  title: 'Horaires intelligents',
                  desc: 'Configurez vos créneaux d\'ouverture par jour et par service (midi/soir). Vos clients voient la prochaine heure de retrait disponible en direct.',
                  color: '#4ade80',
                },
                {
                  icon: '📋',
                  title: 'Commandes en temps réel',
                  desc: 'Toutes vos commandes arrivent dans le dashboard. Mettez-les à jour (En préparation → Prêt) — vos clients sont notifiés automatiquement.',
                  color: '#60a5fa',
                },
                {
                  icon: '💳',
                  title: 'Paiement sur place ou en ligne',
                  desc: 'Chaque client choisit comment payer. Aucune commission EatUp sur vos ventes — vous gardez 100% de vos revenus.',
                  color: '#4ade80',
                },
                {
                  icon: '📊',
                  title: 'Analytics & base clients',
                  desc: 'Suivez vos revenus, commandes et clients depuis les onglets Analytics et Clients. Identifiez vos meilleurs acheteurs.',
                  color: '#818cf8',
                },
                {
                  icon: '🤖',
                  title: 'Agent IA — Réponses Google',
                  desc: 'Répondez à vos avis Google en 10 secondes. L\'IA rédige une réponse professionnelle et personnalisée selon le ton que vous choisissez.',
                  color: '#c084fc',
                  badge: 'PREMIUM',
                  gradient: true,
                },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                  borderRadius: 14,
                  background: f.gradient ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))' : 'rgba(255,255,255,0.02)',
                  border: f.gradient ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{f.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{f.title}</span>
                      {f.badge && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 100,
                          background: f.badge === 'PREMIUM' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(245,158,11,0.2)',
                          color: f.badge === 'PREMIUM' ? 'white' : '#f59e0b',
                          letterSpacing: '0.05em',
                        }}>{f.badge}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: '#4ade80' }}>Pour recevoir vos premières commandes :</strong> allez dans <strong style={{ color: 'white' }}>Paramètres</strong>, configurez vos horaires et activez le statut <strong style={{ color: '#4ade80' }}>Ouvert</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {restaurant?.slug && (
                <a href={`/restaurant/${restaurant.slug}`} target="_blank" rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 14, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  👁️ Voir ma page client
                </a>
              )}
              <button onClick={finish} style={{ padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
                Accéder à mon dashboard →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 24, width: '100%', maxWidth: 500, height: 3, borderRadius: 100, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', width: `${(step / STEPS.length) * 100}%`, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <p style={{ marginTop: 10, fontSize: 12, color: '#1f2937' }}>Étape {step} sur {STEPS.length}</p>

    </div>
  )
}
