import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

export default function AdjustmentModal({ onClose, onSave, prefill = null }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ 
    productId: prefill?.productId || '', 
    batchId: prefill?.batchId || '', 
    type: prefill?.type || 'CORRECTION', 
    quantity: '', 
    reason: '', 
    notes: '' 
  })
  const [batches, setBatches] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/inventory/stock')
        setProducts(data)
      } finally { setLoadingProducts(false) }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    if (form.productId) {
      const p = products.find(p => p.id === form.productId)
      if (p) {
        setBatches(p.batches || [])
      } else {
        // If not found in memory (e.g. if we are on Products page and didn't load full inventory)
        // We might need to fetch batches specifically
        api.get(`/products/${form.productId}`).then(r => {
          setBatches(r.data.batches || [])
        })
      }
    } else setBatches([])
  }, [form.productId, products])

  const handleSave = async () => {
    if (!form.productId || !form.quantity || !form.reason) return toast.error('Required fields missing')
    if (form.quantity !== '0' && !form.batchId) return toast.error('Please select a specific batch for quantity adjustment')
    setSaving(true)
    try {
      await api.post('/inventory/adjust', form)
      toast.success('Stock adjusted')
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">Manual Stock Adjustment</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Product *</label>
            <select className="select" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, batchId: ''})} disabled={!!prefill?.productId}>
              <option value="">{loadingProducts ? 'Loading products...' : 'Select Product'}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Select Batch *</label>
            <select className="select" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})} disabled={!!prefill?.batchId}>
              <option value="">Choose Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.quantity})</option>)}
              {batches.length === 0 && <option value="" disabled>No active batches found</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Adjustment Type</label>
              <select className="select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="CORRECTION">Correction</option>
                <option value="DAMAGE">Damage</option>
                <option value="EXPIRED">Expired</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Quantity Change (+/-) *</label>
              <input type="number" className="input" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="e.g. -5 or 10" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Reason *</label>
            <input className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Found damaged in storage" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || (loadingProducts && !prefill)} className="btn-primary">Adjust Stock</button>
        </div>
      </div>
    </div>
  )
}
