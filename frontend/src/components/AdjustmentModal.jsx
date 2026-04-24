import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import clsx from 'clsx'

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
  const [productDetails, setProductDetails] = useState(null)
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
        setProductDetails(p)
        setBatches(p.batches || [])
      } else {
        api.get(`/products/${form.productId}`).then(r => {
          setProductDetails(r.data)
          setBatches(r.data.batches || [])
        })
      }
    } else {
      setProductDetails(null)
      setBatches([])
      setSelectedBatch(null)
    }
  }, [form.productId, products])

  useEffect(() => {
    const b = batches.find(x => x.id === form.batchId)
    setSelectedBatch(b || null)
  }, [form.batchId, batches])

  const handleSave = async () => {
    let finalQty = parseFloat(form.quantity || 0)
    
    // If user provided a "New Total", calculate the adjustment
    if (newTotal !== '' && selectedBatch) {
      finalQty = parseFloat(newTotal) - selectedBatch.quantity
    }

    if (!form.productId || !form.reason) {
       if (!form.reason) return toast.error('Reason is required')
       if (!form.productId) return toast.error('Product is required')
    }
    
    if (form.type === 'EXPIRED') return toast.error('Expired mode is for viewing only. Use Damage to remove stock.')
    
    if (form.type !== 'ADD_BATCH' && finalQty === 0 && newTotal === '') return toast.error('Please provide a quantity')
    if (form.type !== 'ADD_BATCH' && !form.batchId) return toast.error('Please select a specific batch')
    if (form.type === 'ADD_BATCH' && !form.expiryDate) return toast.error('Expiry date required for new batch')
    
    setSaving(true)
    try {
      await api.post('/inventory/adjust', { ...form, quantity: finalQty })
      toast.success('Stock adjusted')
      onSave()
    } finally { setSaving(false) }
  }

  // Show all batches regardless of type for easy lookup
  const displayedBatches = batches;

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

          {productDetails && (
            <div className="p-3 bg-brand-600/5 border border-brand-600/10 rounded-lg flex justify-between items-center">
              <span className="text-xs text-[#94a3b8]">Current Total Stock:</span>
              <span className="font-bold text-brand-400">{productDetails.totalStock || productDetails.batches?.reduce((a,b)=>a+b.quantity,0) || 0} {productDetails.unit}(s)</span>
            </div>
          )}

          <div className="form-group">
            <label className="label">Adjustment Type</label>
            <select className="select" value={form.type} onChange={e => {
              const newType = e.target.value;
              setForm(prev => ({
                ...prev, 
                type: newType, 
                // Clear batchId ONLY if switching to ADD_BATCH
                batchId: newType === 'ADD_BATCH' ? '' : prev.batchId,
                expiryDate: '', 
                quantity: ''
              }));
              setNewTotal('');
            }}>
              <option value="CORRECTION">Update Existing Batch (Correction)</option>
              <option value="ADD_BATCH">Add New Batch (New Expiry)</option>
              <option value="DAMAGE">Damage (Remove Stock)</option>
              <option value="EXPIRED">Expired (View Only)</option>
            </select>
          </div>

          {form.type !== 'ADD_BATCH' && (
            <div className="form-group">
              <label className="label">Select Batch *</label>
              <select 
                className="select" 
                value={form.batchId} 
                onChange={e => setForm({...form, batchId: e.target.value})} 
                disabled={!!prefill?.batchId && form.type !== 'EXPIRED' && form.type !== 'CORRECTION'}
              >
                <option value="">Choose Batch {form.type === 'EXPIRED' && '(Showing Expired Only)'}</option>
                {displayedBatches.map(b => <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.quantity})</option>)}
                {form.type === 'EXPIRED' && displayedBatches.length === 0 && <option value="" disabled>No expired batches found</option>}
              </select>
            </div>
          )}

          {selectedBatch && form.type !== 'ADD_BATCH' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#21263a] rounded-lg border border-[#2a2f45]">
              <div>
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Batch Expiry</div>
                <div className={clsx("text-xs font-bold", new Date(selectedBatch.expiryDate) < new Date() ? 'text-red-400' : 'text-white')}>
                  {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                  {new Date(selectedBatch.expiryDate) < new Date() && ' (EXPIRED)'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Batch Stock</div>
                <div className="text-xs text-brand-400 font-bold">{selectedBatch.quantity} units</div>
              </div>
            </div>
          )}

          {form.type === 'ADD_BATCH' && (
            <div className="space-y-4">
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
              <div className="form-group">
                <label className="label">Purchase Price (Per Unit)</label>
                <input type="number" className="input" value={form.purchasePrice || ''} onChange={e => setForm({...form, purchasePrice: e.target.value})} placeholder="0.00" />
              </div>
            </div>
          )}

          {form.type !== 'ADD_BATCH' && form.type !== 'EXPIRED' && (
            <div className="form-group">
              <label className="label">Adjustment (+/- Quantity)</label>
              <input 
                type="number" 
                className="input" 
                value={form.quantity} 
                onChange={e => setForm({...form, quantity: e.target.value})} 
                placeholder="e.g. +10 to add, -5 to subtract" 
              />
            </div>
          )}

          {form.type !== 'EXPIRED' && (
            <div className="form-group">
              <label className="label">Reason *</label>
              <input className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Fresh stock received" />
            </div>
          )}

          {form.type === 'EXPIRED' && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-xs text-red-400 italic">
              Expired batches are displayed for reference. To remove this stock from inventory, please use the "Damage" type.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          {form.type !== 'EXPIRED' ? (
            <button onClick={handleSave} disabled={saving || (loadingProducts && !prefill)} className="btn-primary">
              {form.type === 'ADD_BATCH' ? 'Add New Stock' : 'Update Stock'}
            </button>
          ) : (
            <button onClick={onClose} className="btn-primary">Close View</button>
          )}
        </div>
      </div>
    </div>
  )
}
