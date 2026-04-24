import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Search, AlertTriangle, Clock, History, ArrowUpDown, X, Check, Package } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function AdjustmentModal({ onClose, onSave, prefill = null }) {
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
      setBatches(p?.batches || [])
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
            <select className="select" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, batchId: ''})}>
              <option value="">{loadingProducts ? 'Loading products...' : 'Select Product'}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Select Batch *</label>
            <select className="select" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})}>
              <option value="">Choose Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.quantity})</option>)}
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
          <button onClick={handleSave} disabled={saving || loadingProducts} className="btn-primary">Adjust Stock</button>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('stock') // stock | expired | adjustments
  const [modal, setModal] = useState(null) // null | { productId, batchId, type }
  const { settings } = useSettingsStore()
  const { isManager } = useAuthStore()
  const cur = settings.currency || '৳'

  const fetchData = async () => {
    setLoading(true)
    setData([]) // Clear data to avoid rendering mismatch
    try {
      if (tab === 'stock') {
        const { data } = await api.get('/inventory/stock')
        setData(data)
      } else if (tab === 'expired') {
        const { data } = await api.get('/inventory/expiry-alerts')
        setData([...data.expired, ...data.expiringSoon])
      } else if (tab === 'adjustments') {
        const { data } = await api.get('/inventory/adjustments')
        setData(data.data)
      }
    } catch (err) {
      toast.error('Failed to load inventory data')
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchData() }, [tab])

  const filtered = data.filter(item => {
    const name = item?.name || item?.product?.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Batch tracking and stock control</p>
        </div>
        {isManager() && (
          <button onClick={() => setModal({})} className="btn-primary">
            <ArrowUpDown size={16} /> Adjust Stock
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex p-1 bg-[#1a1d27] border border-[#2a2f45] rounded-xl shrink-0">
          <button onClick={() => setTab('stock')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all', tab === 'stock' ? 'bg-brand-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Stock Level</button>
          <button onClick={() => setTab('expired')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all', tab === 'expired' ? 'bg-red-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Expiry Alerts</button>
          <button onClick={() => setTab('adjustments')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all', tab === 'adjustments' ? 'bg-brand-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Logs</button>
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input className="input pl-9" placeholder="Search by product name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              {tab === 'stock' && (
                <tr>
                  <th>Product</th>
                  <th>Total Stock</th>
                  <th>Value (Cost)</th>
                  <th>Batches</th>
                  <th>Status</th>
                </tr>
              )}
              {tab === 'expired' && (
                <tr>
                  <th>Product</th>
                  <th>Batch #</th>
                  <th>Expiry Date</th>
                  <th>Remaining Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              )}
              {tab === 'adjustments' && (
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>User</th>
                  <th>Reason</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94a3b8]">No records found for this view</td></tr>
              ) : filtered.map((item, idx) => (
                <tr key={item?.id || idx}>
                  {tab === 'stock' && (
                    <>
                      <td>
                        <div className="font-medium text-[#e2e8f0]">{item?.name}</div>
                        <div className="text-[10px] text-[#94a3b8]">{item?.genericName} • {item?.category?.name}</div>
                      </td>
                      <td className="font-bold">{item?.totalStock} <span className="text-[10px] font-normal text-[#94a3b8]">{item?.unit}s</span></td>
                      <td className="text-[#94a3b8]">{cur}{item?.stockValue?.toFixed(2)}</td>
                      <td className="text-xs">
                        <div className="flex flex-col gap-1">
                          {item?.batches?.slice(0, 2).map(b => (
                            <div key={b.id} className="bg-[#21263a] px-2 py-0.5 rounded text-[10px] flex justify-between">
                              <span>{b.batchNumber}</span>
                              <span className="font-bold">{b.quantity}</span>
                            </div>
                          ))}
                          {item?.batches?.length > 2 && <span className="text-[10px] text-brand-400">+{item.batches.length - 2} more batches</span>}
                        </div>
                      </td>
                      <td>
                        {item?.totalStock <= item?.minStockLevel && <span className="badge-red">Low Stock</span>}
                        {item?.hasExpired && <span className="badge-red ml-1">Expired</span>}
                        {!item?.hasExpired && item?.hasExpiringSoon && <span className="badge-yellow ml-1">Expiring Soon</span>}
                        {item?.totalStock > item?.minStockLevel && !item?.hasExpired && !item?.hasExpiringSoon && <span className="badge-green">Healthy</span>}
                      </td>
                    </>
                  )}
                  {tab === 'expired' && (
                    <>
                      <td>{item?.product?.name}</td>
                      <td className="font-mono text-xs">{item?.batchNumber}</td>
                      <td className={clsx('font-medium', new Date(item?.expiryDate) < new Date() ? 'text-red-400' : 'text-yellow-400')}>
                        {item?.expiryDate ? format(new Date(item.expiryDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td>{item?.quantity}</td>
                      <td>
                        {new Date(item?.expiryDate) < new Date() ? <span className="badge-red">Expired</span> : <span className="badge-yellow">Expiring Soon</span>}
                      </td>
                      <td>
                        <button 
                          onClick={() => setModal({ 
                            productId: item.productId, 
                            batchId: item.id, 
                            type: new Date(item?.expiryDate) < new Date() ? 'EXPIRED' : 'CORRECTION' 
                          })} 
                          className="btn-ghost btn-icon text-brand-400" 
                          title="Adjust Stock"
                        >
                          <ArrowUpDown size={14} />
                        </button>
                      </td>
                    </>
                  )}
                  {tab === 'adjustments' && (
                    <>
                      <td>{item?.createdAt ? format(new Date(item.createdAt), 'MMM d, h:mm a') : '—'}</td>
                      <td>{item?.product?.name}</td>
                      <td><span className={clsx('badge', item?.type === 'DAMAGE' || item?.type === 'EXPIRED' ? 'badge-red' : 'badge-blue')}>{item?.type}</span></td>
                      <td className={clsx('font-bold', item?.quantity > 0 ? 'text-green-400' : 'text-red-400')}>
                        {item?.quantity > 0 ? '+' : ''}{item?.quantity}
                      </td>
                      <td>{item?.user?.name}</td>
                      <td className="text-xs text-[#94a3b8]">{item?.reason}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <AdjustmentModal
          prefill={modal.productId ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData() }}
        />
      )}
    </div>
  )
}
