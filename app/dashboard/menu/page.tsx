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
  position?: number
}

type Category = {
  id: string
  name: string
  emoji: string
  position: number
}

type OptionItem = {
  id: string
  group_id: string
  name: string
  extra_price: number
  is_available: boolean
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
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image_url: '', menu_extra_price: '', menu_label: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [tab, setTab] = useState<'produits' | 'categories'>('produits')
  const [globalSaving, setGlobalSaving] = useState(false)
  const [globalSaved, setGlobalSaved] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null)
  const [dragOverItemKey, setDragOverItemKey] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🍽️')
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatEmoji, setEditCatEmoji] = useState('')

  const [catInput, setCatInput] = useState('')
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMax, setNewGroupMax] = useState('1')
  const [newItemName, setNewItemName] = useState<Record<string, string>>({})
  const [newItemPrice, setNewItemPrice] = useState<Record<string, string>>({})
  const [showCopyFrom, setShowCopyFrom] = useState(false)
  const [copyingFrom, setCopyingFrom] = useState(false)
  const [allOptionGroups, setAllOptionGroups] = useState<(OptionGroup & { product_name: string })[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: resto } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (!resto) { router.push('/dashboard'); return }
      setRestaurantId(resto.id)
      const { data } = await supabase.from('products').select('*').eq('restaurant_id', resto.id).order('category').order('position', { ascending: true, nullsFirst: true })
      setProducts(data || [])
      const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).order('position')
      setCategories(cats || [])
      setLoading(false)
    }
    load()
  }, [])

  function openAdd() { setEditProduct(null); setForm({ name: '', description: '', price: '', category: '', image_url: '', menu_extra_price: '', menu_label: '' }); setCatInput(''); setShowForm(true) }
  function openEdit(p: Product) { setEditProduct(p); setForm({ name: p.name, description: p.description || '', price: String(p.price), category: p.category || '', image_url: p.image_url || '', menu_extra_price: String((p as any).menu_extra_price || ''), menu_label: (p as any).menu_label || '' }); setCatInput(p.category || ''); setShowForm(true) }
  function openAddWithCategory(catName: string) { setEditProduct(null); setForm({ name: '', description: '', price: '', category: catName, image_url: '', menu_extra_price: '', menu_label: '' }); setCatInput(catName); setShowForm(true) }

  async function dropProduct(dragId: string, overId: string, catName: string) {
    if (dragId === overId) return
    const catProducts = products.filter(p => (p.category || '') === catName).sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    const from = catProducts.findIndex(p => p.id === dragId)
    const to = catProducts.findIndex(p => p.id === overId)
    if (from < 0 || to < 0) return
    const updated = [...catProducts]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    const reordered = updated.map((p, i) => ({ ...p, position: i }))
    setProducts(products.map(p => reordered.find(r => r.id === p.id) ?? p))
    setDraggedId(null); setDragOverId(null)
    for (const p of reordered) {
      await supabase.from('products').update({ position: p.position }).eq('id', p.id)
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('products').upload(filename, file, { upsert: true })
    if (error) { alert('Erreur upload : ' + error.message); setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(data.path)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploadingImage(false)
  }

  async function selectOrCreateCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) { setForm(f => ({ ...f, category: '' })); setCatInput(''); return }
    const existing = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      setForm(f => ({ ...f, category: existing.name }))
      setCatInput(existing.name)
    } else {
      const { data } = await supabase.from('categories').insert({ restaurant_id: restaurantId, name: trimmed, emoji: '🍽️', position: categories.length }).select().single()
      if (data) { setCategories(prev => [...prev, data]); setForm(f => ({ ...f, category: trimmed })); setCatInput(trimmed) }
    }
    setShowCatDropdown(false)
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    setSaveError(null)
    const fields = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      image_url: form.image_url,
      menu_extra_price: form.menu_extra_price ? parseFloat(form.menu_extra_price) : 0,
      menu_label: form.menu_label,
    }
    if (editProduct) {
      const { error } = await supabase.from('products').update(fields).eq('id', editProduct.id)
      if (error) { setSaveError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('products').insert({ restaurant_id: restaurantId, ...fields })
      if (error) { setSaveError(error.message); setSaving(false); return }
    }
    const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('category').order('position', { ascending: true, nullsFirst: true })
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
    setShowCopyFrom(false)
    const [{ data: groups }, { data: allGroups }] = await Promise.all([
      supabase.from('product_option_groups').select('*, items:product_option_items(*)').eq('product_id', p.id).order('created_at'),
      supabase.from('product_option_groups').select('*, items:product_option_items(*)').in('product_id', products.map(x => x.id)),
    ])
    setOptionGroups((groups || []).map((g: any) => ({ ...g, items: g.items || [] })))
    setAllOptionGroups((allGroups || []).map((g: any) => ({
      ...g,
      items: g.items || [],
      product_name: products.find(x => x.id === g.product_id)?.name || '',
    })))
    setLoadingOptions(false)
  }

  async function saveEditCat() {
    if (!editCat || !editCatName.trim()) return
    await supabase.from('categories').update({ name: editCatName.trim(), emoji: editCatEmoji }).eq('id', editCat.id)
    setCategories(categories.map(c => c.id === editCat.id ? { ...c, name: editCatName.trim(), emoji: editCatEmoji } : c))
    setEditCat(null)
  }

  async function toggleOnline(p: Product) {
    const val = !(p as any).is_online
    await supabase.from('products').update({ is_online: val }).eq('id', p.id)
    setProducts(products.map(x => x.id === p.id ? { ...x, is_online: val } as any : x))
  }

  async function addCategory() {
    if (!newCatName.trim() || !restaurantId) return
    const { data } = await supabase.from('categories').insert({ restaurant_id: restaurantId, name: newCatName.trim(), emoji: newCatEmoji, position: categories.length }).select().single()
    if (data) setCategories([...categories, data])
    setNewCatName('')
    setNewCatEmoji('🍽️')
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories(categories.filter(c => c.id !== id))
  }

  async function dropCat(dragId: string, overId: string) {
    if (dragId === overId) return
    const from = categories.findIndex(c => c.id === dragId)
    const to = categories.findIndex(c => c.id === overId)
    if (from < 0 || to < 0) return
    const updated = [...categories]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    const reordered = updated.map((c, i) => ({ ...c, position: i }))
    setCategories(reordered)
    setDraggedCatId(null); setDragOverCatId(null)
    for (const c of reordered) await supabase.from('categories').update({ position: c.position }).eq('id', c.id)
  }

  async function dropGroup(dragId: string, overId: string) {
    if (dragId === overId) return
    const from = optionGroups.findIndex(g => g.id === dragId)
    const to = optionGroups.findIndex(g => g.id === overId)
    if (from < 0 || to < 0) return
    const updated = [...optionGroups]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setOptionGroups(updated)
    setDraggedGroupId(null); setDragOverGroupId(null)
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('product_option_groups').update({ position: i }).eq('id', updated[i].id)
    }
  }

  async function dropItem(dragKey: string, overKey: string, groupId: string) {
    if (dragKey === overKey) return
    const group = optionGroups.find(g => g.id === groupId)
    if (!group) return
    const from = group.items.findIndex(i => i.id === dragKey)
    const to = group.items.findIndex(i => i.id === overKey)
    if (from < 0 || to < 0) return
    const updated = [...group.items]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, items: updated } : g))
    setDraggedItemKey(null); setDragOverItemKey(null)
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('product_option_items').update({ position: i }).eq('id', updated[i].id)
    }
  }

  async function addGroup() {
    if (!newGroupName.trim() || !optionsProduct) return
    const { data, error } = await supabase.from('product_option_groups').insert({
      product_id: optionsProduct.id,
      name: newGroupName.trim(),
      min_choices: 0,
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

  async function toggleGroupRequired(groupId: string, currentMin: number) {
    const min = currentMin > 0 ? 0 : 1
    await supabase.from('product_option_groups').update({ min_choices: min }).eq('id', groupId)
    setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, min_choices: min } : g))
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

  async function copyOptionsFrom(sourceGroupId: string) {
    if (!optionsProduct) return
    setCopyingFrom(true)
    const source = allOptionGroups.find(g => g.id === sourceGroupId)
    if (source) {
      const { data: newGroup } = await supabase.from('product_option_groups').insert({
        product_id: optionsProduct.id,
        name: source.name,
        min_choices: source.min_choices,
        max_choices: source.max_choices,
      }).select().single()
      if (newGroup) {
        let newItems: any[] = []
        if (source.items?.length) {
          const { data } = await supabase.from('product_option_items').insert(
            source.items.map((i: any) => ({ group_id: newGroup.id, name: i.name, extra_price: i.extra_price }))
          ).select()
          newItems = data || []
        }
        setOptionGroups(prev => [...prev, { ...newGroup, items: newItems }])
      }
    }
    setShowCopyFrom(false)
    setCopyingFrom(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
      <p style={{ color: '#374151', fontSize: 14 }}>Chargement...</p>
    </div>
  )


  return (
    <div style={{ minHeight: '100vh', background: '#050810', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Menu</p>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600 }}>{products.length} produits</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
            {(['produits', 'categories'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: tab === t ? '#818cf8' : '#4b5563' }}>
                {t === 'produits' ? '🍽️ Produits' : '🏷️ Catégories'}
              </button>
            ))}
          </div>
          {tab === 'produits' && (
            <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 13 }}>
              + Ajouter
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>

        {/* Onglet Catégories */}
        {tab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>Catégories</p>
                <p style={{ color: '#4b5563', fontSize: 13, margin: 0 }}>{categories.length} catégorie{categories.length !== 1 ? 's' : ''} · glissez pour réordonner</p>
              </div>
            </div>

            {/* Liste */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categories.length === 0 && (
                <div style={{ borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', color: '#374151', fontSize: 14 }}>
                  Aucune catégorie — créez-en une ci-dessous
                </div>
              )}
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => setDraggedCatId(cat.id)}
                  onDragOver={e => { e.preventDefault(); setDragOverCatId(cat.id) }}
                  onDrop={() => draggedCatId && dropCat(draggedCatId, cat.id)}
                  onDragEnd={() => { setDraggedCatId(null); setDragOverCatId(null) }}
                  style={{ borderRadius: 16, background: dragOverCatId === cat.id && draggedCatId !== cat.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${dragOverCatId === cat.id && draggedCatId !== cat.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`, opacity: draggedCatId === cat.id ? 0.35 : 1, cursor: 'grab', transition: 'all 0.15s' }}
                >
                  {editCat?.id === cat.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px' }}>
                      <input value={editCatEmoji} onChange={e => setEditCatEmoji(e.target.value)} style={{ width: 52, borderRadius: 10, padding: '8px', fontSize: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', textAlign: 'center' }} />
                      <input value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditCat()} style={{ flex: 1, borderRadius: 10, padding: '9px 14px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
                      <button onClick={saveEditCat} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 13 }}>✓</button>
                      <button onClick={() => setEditCat(null)} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 13 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>{cat.name}</p>
                        <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>{products.filter(p => p.category === cat.name).length} produit{products.filter(p => p.category === cat.name).length !== 1 ? 's' : ''}</p>
                      </div>
                      <span style={{ color: '#2d3748', fontSize: 18, cursor: 'grab', flexShrink: 0 }}>⠿</span>
                      <button onClick={() => { setEditCat(cat); setEditCatName(cat.name); setEditCatEmoji(cat.emoji) }} style={{ fontSize: 12, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>Modifier</button>
                      <button onClick={() => deleteCategory(cat.id)} style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>Supprimer</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nouvelle catégorie */}
            <div style={{ borderRadius: 20, padding: '20px 22px', background: 'linear-gradient(145deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: '#818cf8', fontWeight: 700, fontSize: 13, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>+ Nouvelle catégorie</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input placeholder="🍔" value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} style={{ width: 56, borderRadius: 12, padding: '11px', fontSize: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', outline: 'none', textAlign: 'center' }} />
                <input placeholder="Nom (ex: Burgers, Tacos...)" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} style={{ flex: 1, borderRadius: 12, padding: '11px 16px', fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', outline: 'none' }} />
                <button onClick={addCategory} style={{ padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Produits */}
        {tab === 'produits' && (products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <img src="/LogoEatUp.PNG" alt="EatUp" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 16, opacity: 0.4 }} />
            <p style={{ color: '#374151', fontSize: 16, marginBottom: 24 }}>Votre menu est vide</p>
            <button onClick={openAdd} style={{ padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15 }}>
              Ajouter votre premier produit
            </button>
          </div>
        ) : (
          <div>
            {(() => {
              const catNames = [...new Set(categories.map(c => c.name))]
              const orphanCats = [...new Set(products.map(p => p.category).filter(c => c && !catNames.includes(c)))]
              const hasUncategorized = products.some(p => !p.category)
              const allCats = [...catNames, ...orphanCats, ...(hasUncategorized ? [''] : [])]
              return allCats.length > 0 ? allCats : ['']
            })().map(cat => {
              const catObj = categories.find(c => c.name === cat)
              return (
              <div
                key={cat}
                style={{ marginBottom: 32 }}
                draggable={!!catObj}
                onDragStart={() => catObj && setDraggedCatId(catObj.id)}
                onDragOver={e => { e.preventDefault(); catObj && setDragOverCatId(catObj.id) }}
                onDrop={() => draggedCatId && catObj && dropCat(draggedCatId, catObj.id)}
                onDragEnd={() => { setDraggedCatId(null); setDragOverCatId(null) }}
              >
                {(cat !== undefined) && (() => {
                  if (!cat) return <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Sans catégorie</p>
                  const catObj = categories.find(c => c.name === cat)
                  return editCat?.id === catObj?.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <input value={editCatEmoji} onChange={e => setEditCatEmoji(e.target.value)} style={{ width: 44, borderRadius: 8, padding: '5px', fontSize: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', textAlign: 'center' }} />
                      <input value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditCat()} style={{ flex: 1, maxWidth: 200, borderRadius: 8, padding: '6px 10px', fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
                      <button onClick={saveEditCat} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 12 }}>✓</button>
                      <button onClick={() => setEditCat(null)} style={{ padding: '5px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      {catObj && (
                        <span style={{ color: '#374151', fontSize: 16, cursor: 'grab', paddingRight: 2 }}>⠿</span>
                      )}
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>{catObj?.emoji} {cat}</p>
                      {catObj && <button onClick={() => { setEditCat(catObj); setEditCatName(catObj.name); setEditCatEmoji(catObj.emoji) }} style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Modifier</button>}
                      <button
                        onClick={() => openAddWithCategory(cat)}
                        title={`Ajouter un produit dans ${cat}`}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, flexShrink: 0 }}
                      >+</button>
                    </div>
                  )
                })()}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {products.filter(p => p.category === cat || (!cat && !p.category)).sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDraggedId(p.id)}
                      onDragOver={e => { e.preventDefault(); setDragOverId(p.id) }}
                      onDrop={() => draggedId && dropProduct(draggedId, p.id, cat)}
                      onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                      style={{
                        borderRadius: 18, padding: '16px',
                        background: 'linear-gradient(145deg, #0f172a, #111827)',
                        border: `1px solid ${dragOverId === p.id && draggedId !== p.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex', gap: 10, alignItems: 'stretch',
                        opacity: draggedId === p.id ? 0.4 : 1,
                        transition: 'border-color 0.15s, opacity 0.15s',
                        cursor: 'grab',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 4, flexShrink: 0, cursor: 'grab' }}>
                        <span style={{ color: '#374151', fontSize: 16, letterSpacing: '-1px', lineHeight: 1 }}>⠿</span>
                      </div>
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>{p.name}</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: '#818cf8', margin: '0 0 0 8px', flexShrink: 0 }}>{Number(p.price).toFixed(2)}€</p>
                        </div>
                        {p.description && <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          <button onClick={() => toggleOnline(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', background: (p as any).is_online !== false ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: (p as any).is_online !== false ? '#818cf8' : '#4b5563', fontWeight: 700 }}>
                            {(p as any).is_online !== false ? '🌐 En ligne' : '📴 Hors ligne'}
                          </button>
                          <button onClick={() => toggleAvailable(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', background: p.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', color: p.is_available ? '#4ade80' : '#6b7280', fontWeight: 600 }}>
                            {p.is_available ? '● Dispo' : '○ Indispo'}
                          </button>
                          <button onClick={() => openEdit(p)} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Modifier</button>
                          <button onClick={() => openOptions(p)} style={{ fontSize: 12, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>⚙ Options</button>
                          <button onClick={() => handleDelete(p.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        ))}
      </main>

      {/* Bouton enregistrer global */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 24px', background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <button
          onClick={async () => {
            setGlobalSaving(true)
            setGlobalSaved(false)
            for (const p of products) await supabase.from('products').update({ position: p.position ?? 0, category: p.category }).eq('id', p.id)
            for (const c of categories) await supabase.from('categories').update({ position: c.position }).eq('id', c.id)
            setGlobalSaving(false)
            setGlobalSaved(true)
            setTimeout(() => setGlobalSaved(false), 3000)
          }}
          disabled={globalSaving}
          style={{ padding: '12px 40px', borderRadius: 14, border: 'none', cursor: globalSaving ? 'default' : 'pointer', background: globalSaved ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: globalSaved ? '#4ade80' : 'white', fontWeight: 700, fontSize: 14, transition: 'all 0.3s', boxShadow: globalSaved ? 'none' : '0 6px 24px rgba(99,102,241,0.45)' }}
        >
          {globalSaving ? 'Enregistrement...' : globalSaved ? '✓ Enregistré' : 'Enregistrer les modifications'}
        </button>
      </div>

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
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Catégorie (ex: Burgers, Parfums...)"
                  value={catInput}
                  onChange={e => { setCatInput(e.target.value); setForm(f => ({ ...f, category: e.target.value })); setShowCatDropdown(true) }}
                  onFocus={() => setShowCatDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCatDropdown(false), 150)}
                  style={inputStyle}
                  autoComplete="off"
                />
                {showCatDropdown && (() => {
                  const filtered = categories.filter(c => c.name.toLowerCase().includes(catInput.toLowerCase()))
                  const exactMatch = categories.some(c => c.name.toLowerCase() === catInput.trim().toLowerCase())
                  const showCreate = catInput.trim().length > 0 && !exactMatch
                  if (!filtered.length && !showCreate) return null
                  return (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginTop: 4, overflow: 'hidden' }}>
                      {filtered.map(cat => (
                        <button key={cat.id} type="button"
                          onMouseDown={() => { setForm(f => ({ ...f, category: cat.name })); setCatInput(cat.name); setShowCatDropdown(false) }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'white', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          {cat.emoji} {cat.name}
                        </button>
                      ))}
                      {showCreate && (
                        <button type="button"
                          onMouseDown={() => selectOrCreateCategory(catInput)}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#818cf8', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          + Créer &quot;{catInput.trim()}&quot;
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#4b5563', marginBottom: 8, fontWeight: 600 }}>Option Menu (facultatif)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Prix du menu (ex: 2.00)" value={form.menu_extra_price} onChange={e => setForm({ ...form, menu_extra_price: e.target.value })} type="number" step="0.5" style={{ ...inputStyle, flex: 1 }} />
                  <input placeholder="Contenu (ex: Frites + Boisson)" value={form.menu_label} onChange={e => setForm({ ...form, menu_label: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4b5563', marginBottom: 8, fontWeight: 600 }}>Photo du produit</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {form.image_url && (
                    <img src={form.image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                  )}
                  <label style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.03)', color: uploadingImage ? '#4b5563' : '#818cf8',
                    cursor: uploadingImage ? 'default' : 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600,
                  }}>
                    {uploadingImage ? 'Upload en cours...' : form.image_url ? '📷 Changer la photo' : '📷 Ajouter une photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                  )}
                </div>
              </div>
            </div>
            {saveError && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', fontSize: 13 }}>
                ❌ {saveError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowForm(false); setSaveError(null) }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
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
                  <div
                    key={group.id}
                    draggable
                    onDragStart={() => setDraggedGroupId(group.id)}
                    onDragOver={e => { e.preventDefault(); setDragOverGroupId(group.id) }}
                    onDrop={() => draggedGroupId && dropGroup(draggedGroupId, group.id)}
                    onDragEnd={() => { setDraggedGroupId(null); setDragOverGroupId(null) }}
                    style={{ marginBottom: 20, borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${dragOverGroupId === group.id && draggedGroupId !== group.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, opacity: draggedGroupId === group.id ? 0.4 : 1, transition: 'border-color 0.15s, opacity 0.15s', cursor: 'grab' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#374151', fontSize: 16, cursor: 'grab' }}>⠿</span>
                        <p style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: 14 }}>{group.name}</p>
                      </div>
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
                        <button
                          onClick={() => toggleGroupRequired(group.id, group.min_choices)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: group.min_choices > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: group.min_choices > 0 ? '#ef4444' : '#4b5563' }}
                        >
                          {group.min_choices > 0 ? '● Requis' : '○ Optionnel'}
                        </button>
                        <button onClick={() => deleteGroup(group.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {group.items.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => { e.stopPropagation(); setDraggedItemKey(item.id) }}
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverItemKey(item.id) }}
                          onDrop={e => { e.stopPropagation(); draggedItemKey && dropItem(draggedItemKey, item.id, group.id) }}
                          onDragEnd={() => { setDraggedItemKey(null); setDragOverItemKey(null) }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: item.is_available !== false ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.07)', border: dragOverItemKey === item.id && draggedItemKey !== item.id ? '1px solid rgba(99,102,241,0.5)' : item.is_available !== false ? 'none' : '1px solid rgba(239,68,68,0.2)', opacity: draggedItemKey === item.id ? 0.4 : 1, cursor: 'grab', transition: 'border 0.1s, opacity 0.1s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#374151', fontSize: 14, cursor: 'grab' }}>⠿</span>
                            <span style={{ fontSize: 13, color: item.is_available !== false ? '#d1d5db' : '#6b7280', textDecoration: item.is_available !== false ? 'none' : 'line-through' }}>{item.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.extra_price > 0 && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>+{Number(item.extra_price).toFixed(2)}€</span>}
                            <button
                              onClick={async () => {
                                const val = item.is_available === false ? true : false
                                await supabase.from('product_option_items').update({ is_available: val }).eq('id', item.id)
                                setOptionGroups(optionGroups.map(g => g.id === group.id ? { ...g, items: g.items.map(i => i.id === item.id ? { ...i, is_available: val } : i) } : g))
                              }}
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, background: item.is_available !== false ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.15)', color: item.is_available !== false ? '#4ade80' : '#f87171' }}
                            >
                              {item.is_available !== false ? 'Dispo' : 'Rupture'}
                            </button>
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

                {/* Options existantes à ajouter */}
                {(() => {
                  const currentIds = new Set(optionGroups.map(g => g.name.toLowerCase()))
                  const available = allOptionGroups.filter(g => g.product_id !== optionsProduct?.id && !currentIds.has(g.name.toLowerCase()))
                  if (!available.length) return null
                  return (
                    <div style={{ marginBottom: 10 }}>
                      {!showCopyFrom ? (
                        <button
                          onClick={() => setShowCopyFrom(true)}
                          style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                        >
                          + Ajouter une option existante
                        </button>
                      ) : (
                        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                          <p style={{ fontSize: 12, color: '#818cf8', fontWeight: 700, margin: '0 0 10px' }}>Options déjà créées :</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {available.map(g => (
                              <button
                                key={g.id}
                                onClick={() => copyOptionsFrom(g.id)}
                                disabled={copyingFrom}
                                style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {g.name}
                                <span style={{ color: '#4b5563', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                                  {g.items.length} choix · depuis {g.product_name}
                                </span>
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowCopyFrom(false)} style={{ marginTop: 8, fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                        </div>
                      )}
                    </div>
                  )
                })()}

                <button
                  onClick={() => setOptionsProduct(null)}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}
                >
                  ✓ Fermer les options
                </button>

                <div style={{ marginTop: 0, padding: 16, borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
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
                    <button onClick={async () => { await addGroup(); setOptionsProduct(null) }} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700 }}>Confirmer</button>
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
