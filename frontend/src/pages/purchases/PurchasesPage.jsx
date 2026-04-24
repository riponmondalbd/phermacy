import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Trash2, ShoppingBag, X, Check, Calendar } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import clsx from 'clsx'

function PurchaseModal({ onClose, onSave, suppliers, products }) {
  const [form, setForm] = useState({
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
    quantity: 1,
    purchasePrice: 0,
    batchNumber: '',
    expiryDate: '',
    manufactureDate: ''
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addItem = () => {
    if (!itemForm.productId || !itemForm.quantity || !itemForm.purchasePrice || !itemForm.batchNumber || !itemForm.expiryDate) {
      return toast.error('Please fill all item fields')
    }
    const product = products.find(p => p.id === itemForm.productId)
    setForm(f => ({
      ...f,
      items: [...f.items, { ...itemForm, productName: product.name }]
    }))
    setItemForm({
      productId: '',
      quantity: 1,
      purchasePrice: 0,
      batchNumber: '',
      expiryDate: '',
      manufactureDate: ''
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
      const { data } = await api.post('/purchases', form)
      toast.success('Purchase recorded')
      onSave(data)
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
              <select className="select" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="form-group md:col-span-2">
                <label className="label">Product</label>
                <select className="select" value={itemForm.productId} onChange={e => setItemForm({ ...itemForm, productId: e.target.value })}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Batch #</label>
                <input className="input" value={itemForm.batchNumber} onChange={e => setItemForm({ ...itemForm, batchNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Expiry Date</label>
                <input type="date" className="input" value={itemForm.expiryDate} onChange={e => setItemForm({ ...itemForm, expiryDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Qty</label>
                <input type="number" className="input" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })} min="1" />
              </div>
              <div className="form-group">
                <label className="label">Cost Price</label>
                <input type="number" className="input" value={itemForm.purchasePrice} onChange={e => setItemForm({ ...itemForm, purchasePrice: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
              </div>
              <button onClick={addItem} className="btn-primary h-9 md:col-span-1">Add</button>
            </div>
          </div>

          <div className="table-wrap max-h-60 overflow-y-auto border border-[#2a2f45] rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.productName}</td>
                    <td>{item.batchNumber}</td>
                    <td>{item.expiryDate}</td>
                    <td>{item.quantity}</td>
                    <td>৳{item.purchasePrice.toFixed(2)}</td>
                    <td>৳{(item.quantity * item.purchasePrice).toFixed(2)}</td>
                    <td><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {form.items.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-[#94a3b8]">No items added</td></tr>}
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

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const { settings } = useSettingsStore()
  const { isManager } = useAuthStore()
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
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page])

  const handleSaved = () => { setModal(false); fetchData() }

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
                  <td><button className="btn-ghost btn-icon"><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          onClose={() => setModal(false)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
