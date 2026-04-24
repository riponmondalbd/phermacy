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
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [newTotal, setNewTotal] = useState('')

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
        api.get(`/products/${form.productId}`).then(r => {
          setBatches(r.data.batches || [])
        })
      }
    } else {
      setBatches([])
      setSelectedBatch(null)
    }
  }, [form.productId, products])

  useEffect(() => {
    const b = batches.find(x => x.id === form.batchId)
    setSelectedBatch(b || null)
  }, [form.batchId, batches])

  const handleSave = async () => {
    let finalQty = parseFloat(form.quantity)
    
    // If user provided a "New Total", calculate the adjustment
    if (newTotal !== '' && selectedBatch) {
      finalQty = parseFloat(newTotal) - selectedBatch.quantity
    }

    if (!form.productId || isNaN(finalQty) || !form.reason) return toast.error('Required fields missing')
    if (form.type !== 'ADD_BATCH' && finalQty !== 0 && !form.batchId) return toast.error('Please select a specific batch')
    if (form.type === 'ADD_BATCH' && !form.expiryDate) return toast.error('Expiry date required for new batch')
    
    setSaving(true)
    try {
      await api.post('/inventory/adjust', { ...form, quantity: finalQty })
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
            <label className="label">Adjustment Type</label>
            <select className="select" value={form.type} onChange={e => setForm({...form, type: e.target.value, batchId: '', expiryDate: ''})}>
              <option value="CORRECTION">Update Existing Batch (Correction)</option>
              <option value="ADD_BATCH">Add New Batch (New Expiry)</option>
              <option value="DAMAGE">Damage (Remove Stock)</option>
              <option value="EXPIRED">Expired (Remove Stock)</option>
            </select>
          </div>

          {form.type !== 'ADD_BATCH' && (
            <div className="form-group">
              <label className="label">Select Batch *</label>
              <select className="select" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})} disabled={!!prefill?.batchId}>
                <option value="">Choose Batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.quantity})</option>)}
              </select>
            </div>
          )}

          {selectedBatch && form.type !== 'ADD_BATCH' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#21263a] rounded-lg border border-[#2a2f45]">
              <div>
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Expiry Date</div>
                <div className="text-xs text-white">{new Date(selectedBatch.expiryDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Current Stock</div>
                <div className="text-xs text-brand-400 font-bold">{selectedBatch.quantity} units</div>
              </div>
            </div>
          )}

          {form.type === 'ADD_BATCH' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">New Expiry Date *</label>
                <input type="date" className="input" value={form.expiryDate || ''} onChange={e => setForm({...form, expiryDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Quantity to Add *</label>
                <input type="number" className="input" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="0" />
              </div>
            </div>
          )}

          {form.type !== 'ADD_BATCH' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">New Total Quantity</label>
                  <input 
                    type="number" 
                    className="input border-brand-500/30 focus:border-brand-500" 
                    value={newTotal} 
                    onChange={e => { setNewTotal(e.target.value); setForm({...form, quantity: ''}) }} 
                    placeholder={`Current: ${selectedBatch?.quantity || 0}`} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Adjustment (+/- Qty)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={form.quantity} 
                    onChange={e => { setForm({...form, quantity: e.target.value}); setNewTotal('') }} 
                    placeholder="+10 or -5" 
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="label">Reason *</label>
            <input className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Fresh stock received" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || (loadingProducts && !prefill)} className="btn-primary">
            {form.type === 'ADD_BATCH' ? 'Add New Stock' : 'Update Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}
