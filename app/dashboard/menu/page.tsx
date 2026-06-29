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

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!resto) { router.push('/dashboard'); return }
      setRestaurantId(resto.id)

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('category')

      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function openAdd() {
    setEditProduct(null)
    setForm({ name: '', description: '', price: '', category: '', image_url: '' })
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({ name: p.name, description: p.description || '', price: String(p.price), category: p.category || '', image_url: p.image_url || '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)

    if (editProduct) {
      await supabase.from('products').update({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        image_url: form.image_url,
      }).eq('id', editProduct.id)
    } else {
      await supabase.from('products').insert({
        restaurant_id: restaurantId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        image_url: form.image_url,
      })
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-blue-600">← Retour</button>
          <h1 className="font-bold text-gray-900 text-lg">Gestion du menu</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + Ajouter un produit
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">Aucun produit dans votre menu</p>
            <button onClick={openAdd} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
              Ajouter votre premier produit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{p.name}</p>
                      {p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.category}</span>}
                    </div>
                    <p className="font-bold text-blue-600 flex-shrink-0">{Number(p.price).toFixed(2)}€</p>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => toggleAvailable(p)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition ${p.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {p.is_available ? 'Disponible' : 'Indisponible'}
                    </button>
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-lg mb-4">{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</h2>
            <div className="space-y-3">
              <input
                placeholder="Nom du produit *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <input
                placeholder="Prix (ex: 9.90) *"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Catégorie (ex: Burgers, Boissons...)"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="URL de l'image (optionnel)"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
