import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, Package, X, Check, ArrowUpDown } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import AdjustmentModal from '../../components/AdjustmentModal'
import clsx from 'clsx'

function ProductModal({ product, categories, products, onClose, onSave }) {
  const [form, setForm] = useState(product ? {
    ...product,
    categoryId: product.category?.name || '' // Show name for searchable input
  } : {
    name: '', genericName: '', barcode: '', categoryId: '',
    unit: 'strip', piecesPerStrip: 10, stripsPerBox: 10,
    salePrice: '', minStockLevel: 10, description: '', requiresPrescription: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.salePrice) return toast.error('Name and price required')
    setSaving(true)
    try {
      const { data } = product
        ? await api.put(`/products/${product.id}`, form)
        : await api.post('/products', form)
      toast.success(product ? 'Product updated' : 'Product created')
      onSave(data)
    } catch (_) {} finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-xl">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">{product ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="label">Product Name *</label>
            <input 
              className={clsx("input", product && "bg-[#1a1d27] cursor-not-allowed")} 
              value={form.name} 
              onChange={e => !product && set('name', e.target.value)} 
              readOnly={!!product}
              placeholder="e.g. Napa 500mg" 
            />
            {product && <p className="text-[10px] text-[#475569] mt-1 italic">Product name cannot be changed after creation.</p>}
          </div>
          <div className="form-group">
            <label className="label">Generic Name</label>
            <input 
              list="generic-names-list"
              className="input" 
              value={form.genericName || ''} 
              onChange={e => set('genericName', e.target.value)} 
              placeholder="e.g. Paracetamol" 
            />
            <datalist id="generic-names-list">
              {[...new Set(products.map(p => p.genericName).filter(Boolean))].map((g, idx) => (
                <option key={idx} value={g}>{g}</option>
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <input 
              list="product-categories-list"
              className="input" 
              value={form.categoryId || ''} 
              onChange={e => set('categoryId', e.target.value)}
              placeholder="Type or select category..."
            />
            <datalist id="product-categories-list">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="label">Unit</label>
            <select className="select" value={form.unit} onChange={e => set('unit', e.target.value)}>
              <option value="piece">Piece</option>
              <option value="strip">Strip</option>
              <option value="box">Box</option>
            </select>
          </div>
          {form.unit === 'strip' && (
            <div className="form-group">
              <label className="label">Pieces per Strip</label>
              <input type="number" className="input" value={form.piecesPerStrip} onChange={e => set('piecesPerStrip', e.target.value)} min="1" />
            </div>
          )}
          {form.unit === 'box' && (
            <div className="form-group">
              <label className="label">Strips per Box</label>
              <input type="number" className="input" value={form.stripsPerBox} onChange={e => set('stripsPerBox', e.target.value)} min="1" />
            </div>
          )}
          <div className="form-group">
            <label className="label">Sale Price (৳) *</label>
            <input type="number" className="input" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} min="0" step="0.01" />
          </div>
          <div className="form-group">
            <label className="label">Min Stock Alert Level</label>
            <input type="number" className="input" value={form.minStockLevel} onChange={e => set('minStockLevel', e.target.value)} min="0" />
          </div>

          {/* Initial Stock Fields (Only for new products) */}
          {!product && (
            <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-brand-600/5 border border-brand-600/10 rounded-xl mt-2">
              <div className="col-span-2 text-xs font-bold text-brand-400 uppercase tracking-wider mb-1">Initial Stock (Optional)</div>
              <div className="form-group">
                <label className="label">Initial Quantity</label>
                <input type="number" className="input" value={form.initialQuantity || ''} onChange={e => set('initialQuantity', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="label">Expiry Date</label>
                <input type="date" className="input" value={form.expiryDate || ''} onChange={e => set('expiryDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Purchase Price</label>
                <input type="number" className="input" value={form.purchasePrice || ''} onChange={e => set('purchasePrice', e.target.value)} placeholder="0.00" />
              </div>
            </div>
          )}

          <div className="form-group col-span-2">
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="rx" checked={!!form.requiresPrescription} onChange={e => set('requiresPrescription', e.target.checked)} className="accent-brand-600" />
            <label htmlFor="rx" className="text-sm text-[#94a3b8] cursor-pointer">Requires Prescription</label>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner w-4 h-4" /> : <><Check size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | product
  const [adjustModal, setAdjustModal] = useState(null) // null | { productId }
  const { settings } = useSettingsStore()
  const { isManager } = useAuthStore()
  const cur = settings.currency || '৳'
  const LIMIT = 20

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (search) params.append('search', search)
      if (catFilter) params.append('categoryId', catFilter)
      if (lowStock) params.append('lowStock', 'true')
      const { data } = await api.get(`/products?${params}`)
      setProducts(data.data); setTotal(data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)) }, [])
  useEffect(() => { fetchProducts() }, [page, search, catFilter, lowStock])

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this product?')) return
    await api.delete(`/products/${id}`)
    toast.success('Product deactivated')
    fetchProducts()
  }

  const handleSaved = () => { setModal(null); fetchProducts() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{total} total products</p>
        </div>
        {isManager() && (
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input className="input pl-9" placeholder="Search products..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="select w-44" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setLowStock(!lowStock)}
          className={clsx('btn-secondary gap-2', lowStock && 'border-yellow-500 text-yellow-400')}>
          Low Stock {lowStock && '✓'}
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Generic</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                {isManager() && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12">
                  <div className="spinner w-6 h-6 mx-auto" />
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-[#94a3b8]">No products found</td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium text-[#e2e8f0]">{p.name}</div>
                    {p.requiresPrescription && <span className="badge-yellow text-[10px] mt-0.5">Rx</span>}
                  </td>
                  <td className="text-[#94a3b8]">{p.genericName || '—'}</td>
                  <td>{p.category?.name || <span className="text-[#475569]">—</span>}</td>
                  <td className="font-mono text-xs text-[#94a3b8]">{p.barcode || '—'}</td>
                  <td className="capitalize">{p.unit}</td>
                  <td className="font-semibold text-brand-400">{cur}{p.salePrice.toFixed(2)}</td>
                  <td>
                    <span className={clsx('font-semibold', p.isLowStock ? 'text-yellow-400' : 'text-green-400')}>
                      {p.totalStock}
                    </span>
                    {p.isLowStock && <span className="ml-1 badge-yellow">Low</span>}
                  </td>
                  <td>
                    {p.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
                  </td>
                  {isManager() && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(p)} className="btn-ghost btn-icon" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => setAdjustModal({ productId: p.id })} className="btn-ghost btn-icon text-brand-400" title="Adjust Stock"><ArrowUpDown size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="btn-ghost btn-icon text-red-400 hover:text-red-300" title="Deactivate"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2f45] text-sm">
            <span className="text-[#94a3b8]">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">Prev</button>
              <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          categories={categories}
          products={products}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      {adjustModal && (
        <AdjustmentModal
          prefill={adjustModal}
          onClose={() => setAdjustModal(null)}
          onSave={() => { setAdjustModal(null); fetchProducts() }}
        />
      )}
    </div>
  )
}
