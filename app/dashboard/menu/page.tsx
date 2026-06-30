'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  is_available: boolean
}

type OptionItem = {
  id: string
  group_id: string
  name: string
  extra_price: number
}

type OptionGroup = {
  id: string
  product_id: string
  name: string
  min_choices: number
  max_choices: number
  items: OptionItem[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: 'white', outline: 'none', boxSizing: 'border-box',
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image_url: '' })
  const [saving, setSaving] = useState(false)

  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMax, setNewGroupMax] = useState('1')
  const [newItemName, setNewItemName] = useState<Record<string, string>>({})
  const [newItemPrice, setNewItemPrice] = useState<Record<string, string>>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurantId(resto.id)
      const { data } = await supabase.from('products').select('*').eq('restaurant_id', resto.id).order('category')
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function openAdd() { setEditProduct(null); setForm({ name: '', description: '', price: '', category: '', image_url: '' }); setShowForm(true) }
  function openEdit(p: Product) { setEditProduct(p); setForm({ name: p.name, description: p.description || '', price: String(p.price), category: p.category || '', image_url: p.image_url || '' }); setShowForm(true) }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    if (editProduct) {
      await supabase.from('products').update({ name: form.name, description: form.description, price: parseFloat(form.price), category: form.category, image_url: form.image_url }).eq('id', editProduct.id)
    } else {
      await supabase.from('products').insert({ restaurant_id: restaurantId, name: form.name, description: form.description, price: parseFloat(form.price), category: form.category, image_url: form.image_url })
    }
    const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('category')
    setProducts(data || [])
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  async function toggleAvailable(p: Product) {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    setProducts(products.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x))
  }

  async function openOptions(p: Product) {
    setOptionsProduct(p)
    setLoadingOptions(true)
    const { data: groups } = await supabase
      .from('product_option_groups')
      .select('*, items:product_option_items(*)')
      .eq('product_id', p.id)
      .order('created_at')
    setOptionGroups((groups || []).map((g: any) => ({ ...g, items: g.items || [] })))
    setLoadingOptions(false)
  }

  async function addGroup() {
    if (!newGroupName.trim() || !optionsProduct) return
    const { data, error } = await supabase.from('product_option_groups').insert({
      product_id: optionsProduct.id,
      name: newGroupName.trim(),
      min_choices: 1,
      max_choices: parseInt(newGroupMax) || 1,
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    if (data) setOptionGroups([...optionGroups, { ...data, items: [] }])
    setNewGroupName('')
    setNewGroupMax('1')
  }

  async function deleteGroup(groupId: string) {
    await supabase.from('product_option_groups').delete().eq('id', groupId)
    setOptionGroups(optionGroups.filter(g => g.id !== groupId))
  }

  async function updateGroupMax(groupId: string, max: number) {
    await supabase.from('product_option_groups').update({ max_choices: max }).eq('id', groupId)
    setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, max_choices: max } : g))
  }

  async function addItem(groupId: string) {
    const name = (newItemName[groupId] || '').trim()
    if (!name) return
    const extra = parseFloat(newItemPrice[groupId] || '0') || 0
    const { data } = await supabase.from('product_option_items').insert({ group_id: groupId, name, extra_price: extra }).select().single()
    if (data) {
      setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, items: [...g.items, data] } : g))
    }
    setNewItemName({ ...newItemName, [groupId]: '' })
    setNewItemPrice({ ...newItemPrice, [groupId]: '' })
  }

  async function deleteItem(groupId: string, itemId: string) {
    await supabase.from('product_option_items').delete().eq('id', itemId)
    setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Menu</p>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600 }}>{products.length} produits</span>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 13 }}>
          + Ajouter
        </button>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🍽️</p>
            <p style={{ color: '#374151', fontSize: 16, marginBottom: 24 }}>Votre menu est vide</p>
            <button onClick={openAdd} style={{ padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15 }}>
              Ajouter votre premier produit
            </button>
          </div>
        ) : (
          <div>
            {(categories.length > 0 ? categories : ['']).map(cat => (
              <div key={cat} style={{ marginBottom: 32 }}>
                {cat && <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{cat}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {products.filter(p => p.category === cat || (!cat && !p.category)).map(p => (
                    <div key={p.id} style={{ borderRadius: 18, padding: '16px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 14 }}>
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>{p.name}</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: '#818cf8', margin: '0 0 0 8px', flexShrink: 0 }}>{Number(p.price).toFixed(2)}€</p>
                        </div>
                        {p.description && <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => toggleAvailable(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', background: p.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', color: p.is_available ? '#4ade80' : '#6b7280', fontWeight: 600 }}>
                            {p.is_available ? '● Dispo' : '○ Indispo'}
                          </button>
                          <button onClick={() => openEdit(p)} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Modifier</button>
                          <button onClick={() => openOptions(p)} style={{ fontSize: 12, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>⚙ Options</button>
                          <button onClick={() => handleDelete(p.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal produit */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 24, padding: '36px 32px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 24px', letterSpacing: '-0.3px' }}>
              {editProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nom du produit *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'none' }} />
              <input placeholder="Prix (ex: 9.90) *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} type="number" step="0.01" style={inputStyle} />
              <div>
                <input placeholder="Catégorie (ex: Burgers, Boissons...)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle} />
                {categories.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat })}
                        style={{
                          fontSize: 11, padding: '4px 12px', borderRadius: 100, cursor: 'pointer', fontWeight: 600,
                          background: form.category === cat ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                          color: form.category === cat ? '#818cf8' : '#6b7280',
                          border: `1px solid ${form.category === cat ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input placeholder="URL de l'image (optionnel)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal options */}
      {optionsProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 24, padding: '32px 28px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.1)', marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>Options — {optionsProduct.name}</h2>
                <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0' }}>Choix proposés au client lors de la commande</p>
              </div>
              <button onClick={() => setOptionsProduct(null)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {loadingOptions ? (
              <p style={{ color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
            ) : (
              <>
                {optionGroups.map(group => (
                  <div key={group.id} style={{ marginBottom: 20, borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: 14 }}>{group.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#4b5563' }}>Max :</span>
                          <select
                            value={group.max_choices}
                            onChange={e => updateGroupMax(group.id, parseInt(e.target.value))}
                            style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8, padding: '4px 8px' }}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} choix</option>)}
                          </select>
                        </div>
                        <button onClick={() => deleteGroup(group.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {group.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 13, color: '#d1d5db' }}>{item.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.extra_price > 0 && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>+{Number(item.extra_price).toFixed(2)}€</span>}
                            <button onClick={() => deleteItem(group.id, item.id)} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        placeholder="Nom (ex: Poulet)"
                        value={newItemName[group.id] || ''}
                        onChange={e => setNewItemName({ ...newItemName, [group.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && addItem(group.id)}
                        style={{ ...inputStyle, flex: 2, padding: '8px 12px', fontSize: 13 }}
                      />
                      <input
                        placeholder="+€"
                        value={newItemPrice[group.id] || ''}
                        onChange={e => setNewItemPrice({ ...newItemPrice, [group.id]: e.target.value })}
                        type="number" step="0.5"
                        style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }}
                      />
                      <button onClick={() => addItem(group.id)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700, fontSize: 18 }}>+</button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: 12, color: '#4b5563', margin: '0 0 10px', fontWeight: 600 }}>+ Nouveau groupe d'options</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder="Nom (ex: Viande)"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addGroup()}
                      style={{ ...inputStyle, flex: 2, padding: '10px 14px', fontSize: 13 }}
                    />
                    <select
                      value={newGroupMax}
                      onChange={e => setNewGroupMax(e.target.value)}
                      style={{ flex: 1, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: 12, padding: '10px 12px' }}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>Max {n}</option>)}
                    </select>
                    <button onClick={addGroup} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700 }}>Ajouter</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
