import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Trash2, ShoppingBag, X, Check, Calendar, Pencil } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import clsx from 'clsx'

function PurchaseModal({ onClose, onSave, suppliers, products, categories, initialData }) {
  const [form, setForm] = useState(initialData ? {
    ...initialData,
    purchaseDate: format(new Date(initialData.purchaseDate), 'yyyy-MM-dd'),
    items: initialData.items.map(i => ({
      ...i,
      productName: i.product?.name,
      genericName: i.product?.genericName,
      unit: i.product?.unit,
      sellingPrice: i.product?.salePrice,
      category: i.product?.categoryId
    }))
  } : {
    supplierId: '', 
    invoiceNo: '',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    discount: 0,
    paidAmount: 0,
    paymentMethod: 'cash',
    notes: '',
    items: []
  })

  const [itemForm, setItemForm] = useState({
    productId: '', 
    productName: '',
    genericName: '',
    category: '',
    unit: 'piece',
    quantity: 1,
    purchasePrice: 0,
    sellingPrice: 0,
    expiryDate: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleProductInput = (val) => {
    const existing = products.find(p => p.name === val || p.id === val)
    if (existing) {
      setItemForm(prev => ({
        ...prev,
        productId: existing.id,
        productName: existing.name,
        genericName: existing.genericName || '',
        unit: existing.unit || 'piece',
        sellingPrice: existing.salePrice || 0,
        category: existing.category?.name || '' // Use name instead of ID
      }))
    } else {
      setItemForm(prev => ({ ...prev, productId: val, productName: val }))
    }
  }

  const addItem = () => {
    if (!itemForm.productId || !itemForm.quantity || !itemForm.purchasePrice || !itemForm.expiryDate) {
      return toast.error('Please fill required fields (Product, Qty, Cost, Expiry)')
    }
    setForm(f => ({
      ...f,
      items: [...f.items, { ...itemForm }]
    }))
    setItemForm({
      productId: '',
      productName: '',
      genericName: '',
      category: '',
      unit: 'piece',
      quantity: 1,
      purchasePrice: 0,
      sellingPrice: 0,
      expiryDate: ''
    })
  }

  const removeItem = (index) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }))
  }

  const subtotal = form.items.reduce((s, i) => s + (i.quantity * i.purchasePrice), 0)
  const total = Math.max(0, subtotal - parseFloat(form.discount || 0))

  const handleSave = async () => {
    if (!form.supplierId || form.items.length === 0) return toast.error('Supplier and at least one item required')
    setSaving(true)
    try {
      if (initialData) {
        await api.put(`/purchases/${initialData.id}`, form)
        toast.success('Purchase updated')
      } else {
        await api.post('/purchases', form)
        toast.success('Purchase recorded')
      }
      onSave()
    } catch (_) {} finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-4xl">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">New Purchase Entry</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Supplier *</label>
              <input 
                list="suppliers-list"
                className="input" 
                value={form.supplierId} 
                onChange={e => set('supplierId', e.target.value)}
                placeholder="Type or select supplier..."
              />
              <datalist id="suppliers-list">
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="label">Invoice No</label>
              <input className="input" value={form.invoiceNo} onChange={e => set('invoiceNo', e.target.value)} placeholder="Supplier Invoice #" />
            </div>
            <div className="form-group">
              <label className="label">Purchase Date</label>
              <input type="date" className="input" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
            </div>
          </div>

          <div className="card p-4 bg-[#21263a]/50">
            <h4 className="text-xs font-semibold text-brand-400 uppercase mb-3">Add Items</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="form-group md:col-span-1">
                <label className="label">Product *</label>
                <input 
                  list="products-list"
                  className="input" 
                  value={itemForm.productName || itemForm.productId} 
                  onChange={e => handleProductInput(e.target.value)}
                  placeholder="Type product name..."
                />
                <datalist id="products-list">
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Generic Name</label>
                <input className="input" value={itemForm.genericName} onChange={e => setItemForm({ ...itemForm, genericName: e.target.value })} placeholder="Generic..." />
              </div>
              <div className="form-group">
                <label className="label">Category</label>
                <input 
                  list="categories-list"
                  className="input" 
                  value={itemForm.category} 
                  onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                  placeholder="Category..."
                />
                <datalist id="categories-list">
                  {(Array.isArray(categories) ? categories : []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Unit</label>
                <select className="select" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>
                  <option value="pice">Piece</option>
                  <option value="stripe">Stripe</option>
                  <option value="box">Box</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Expiry Date *</label>
                <input type="date" className="input" value={itemForm.expiryDate} onChange={e => setItemForm({ ...itemForm, expiryDate: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label className="label">Purchase Qty *</label>
                <input type="number" className="input" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })} min="1" />
              </div>
              <div className="form-group">
                <label className="label">Cost Price *</label>
                <input type="number" className="input" value={itemForm.purchasePrice} onChange={e => setItemForm({ ...itemForm, purchasePrice: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="label">Selling Price</label>
                <input type="number" className="input" value={itemForm.sellingPrice} onChange={e => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
              </div>
              <div className="flex items-end">
                <button onClick={addItem} className="btn-primary w-full h-10">Add to List</button>
              </div>
            </div>
          </div>

          <div className="table-wrap max-h-60 overflow-y-auto border border-[#2a2f45] rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Generic</th>
                  <th>Unit</th>
                  <th>Expiry</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Sale</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.productName || item.productId}</td>
                    <td className="text-xs text-[#94a3b8]">{item.genericName}</td>
                    <td className="text-xs">{item.unit}</td>
                    <td className="text-xs">{item.expiryDate}</td>
                    <td className="text-right font-bold">{item.quantity}</td>
                    <td className="text-right">৳{item.purchasePrice.toFixed(2)}</td>
                    <td className="text-right text-brand-400 font-bold">৳{(item.sellingPrice || 0).toFixed(2)}</td>
                    <td className="text-right"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {form.items.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-[#94a3b8]">No items added</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-group">
              <label className="label">Notes</label>
              <textarea className="input h-24 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#94a3b8]">Subtotal</span>
                <span className="text-white font-medium">৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-[#94a3b8]">Discount</label>
                <input type="number" className="input-sm w-32 text-right" value={form.discount} onChange={e => set('discount', e.target.value)} />
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-[#2a2f45] pt-2">
                <span className="text-white">Total</span>
                <span className="text-brand-400">৳{total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2">
                <label className="text-sm text-[#94a3b8]">Paid Amount</label>
                <input type="number" className="input-sm w-32 text-right" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} />
              </div>
              <div className="flex justify-between text-sm text-red-400">
                <span>Due Amount</span>
                <span>৳{(total - parseFloat(form.paidAmount || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner w-4 h-4" /> : <><Check size={14} /> Submit Purchase</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewPurchaseModal({ purchase, onClose, cur }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!purchase) return null
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <div>
            <h3 className="font-semibold text-[#e2e8f0]">Purchase Details</h3>
            <p className="text-xs text-[#94a3b8]">Invoice: {purchase.invoiceNo || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1d27] p-3 rounded-lg border border-white/5">
              <label className="text-[10px] uppercase text-[#475569] font-bold">Supplier</label>
              <div className="text-sm text-white">{purchase.supplier?.name}</div>
            </div>
            <div className="bg-[#1a1d27] p-3 rounded-lg border border-white/5">
              <label className="text-[10px] uppercase text-[#475569] font-bold">Purchase Date</label>
              <div className="text-sm text-white">{format(new Date(purchase.purchaseDate), 'PPP')}</div>
            </div>
          </div>

          <div className="table-wrap border border-[#2a2f45] rounded-lg">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.product?.name}</td>
                    <td className="font-mono text-[10px]">{item.batch?.batchNumber}</td>
                    <td className="text-[10px]">{format(new Date(item.batch?.expiryDate), 'MMM yyyy')}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{cur}{item.purchasePrice.toFixed(2)}</td>
                    <td className="text-right font-medium">{cur}{(item.quantity * item.purchasePrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#2a2f45]">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#94a3b8]">Discount</span>
                <span className="text-white">{cur}{purchase.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-400">{cur}{purchase.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span className="text-[#94a3b8]">Paid</span>
                <span className="text-green-400">{cur}{purchase.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#94a3b8]">Due</span>
                <span className="text-red-400">{cur}{purchase.dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {purchase.notes && (
            <div className="p-3 bg-[#1a1d27] rounded-lg border border-white/5 italic text-xs text-[#94a3b8]">
              {purchase.notes}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | true (new) | purchase object (edit)
  const [viewing, setViewing] = useState(null) // null | purchase object
  const { settings } = useSettingsStore()
  const { isManager, isAdmin } = useAuthStore()
  const cur = settings.currency || '৳'
  const LIMIT = 20

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: pData } = await api.get(`/purchases?page=${page}&limit=${LIMIT}`)
      setPurchases(pData.data); setTotal(pData.total)
      const { data: sData } = await api.get('/suppliers?limit=100')
      setSuppliers(sData.data)
      const { data: prData } = await api.get('/products?limit=1000')
      setProducts(prData.data)
      const { data: cData } = await api.get('/categories')
      setCategories(cData)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page])

  const handleSaved = () => { setModal(null); fetchData() }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase? This will remove associated stock batches!')) return
    try {
      await api.delete(`/purchases/${id}`)
      toast.success('Purchase deleted')
      fetchData()
    } catch (_) {}
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Track incoming stock and supplier invoices</p>
        </div>
        {isManager() && (
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} /> New Purchase
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[#94a3b8]">No purchases found</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id}>
                  <td>{format(new Date(p.purchaseDate), 'MMM d, yyyy')}</td>
                  <td className="font-mono text-xs">{p.invoiceNo || 'N/A'}</td>
                  <td>{p.supplier?.name}</td>
                  <td className="font-semibold">{cur}{p.totalAmount.toFixed(2)}</td>
                  <td className="text-green-400">{cur}{p.paidAmount.toFixed(2)}</td>
                  <td className="text-red-400 font-medium">{cur}{p.dueAmount.toFixed(2)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setViewing(p)} 
                        className="btn-ghost btn-icon" 
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {isManager() && (
                        <button 
                          onClick={() => setModal(p)} 
                          className="btn-ghost btn-icon text-brand-400" 
                          title="Edit Purchase"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin() && (
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="btn-ghost btn-icon text-red-400" 
                          title="Delete & Reverse Stock"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <ViewPurchaseModal
          purchase={viewing}
          cur={cur}
          onClose={() => setViewing(null)}
        />
      )}

      {modal && (
        <PurchaseModal
          initialData={typeof modal === 'object' ? modal : null}
          suppliers={suppliers}
          products={products}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
