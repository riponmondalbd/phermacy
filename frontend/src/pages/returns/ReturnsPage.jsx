import { useState, useEffect } from 'react'
import api from '../../api/client'
import { format } from 'date-fns'
import { Search, RotateCcw, Truck, User, X, Check, Eye, Trash2, ShoppingBag } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function ReturnModal({ onClose, onSave, cur }) {
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(false)
  const [returnItems, setReturnItems] = useState([]) // { productId, batchId, quantity, unitPrice }
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const findSale = async () => {
    if (!invoiceSearch) return
    setLoading(true)
    try {
      const { data } = await api.get(`/sales?invoiceNo=${invoiceSearch}`)
      if (data.data.length === 0) return toast.error('Invoice not found')
      const fullSale = await api.get(`/sales/${data.data[0].id}`)
      setSale(fullSale.data)
      setReturnItems([])
    } finally { setLoading(false) }
  }

  const toggleItem = (item) => {
    const existing = returnItems.find(i => i.batchId === item.batchId)
    if (existing) {
      setReturnItems(returnItems.filter(i => i.batchId !== item.batchId))
    } else {
      setReturnItems([...returnItems, { ...item, returnQty: 1 }])
    }
  }

  const updateQty = (batchId, qty) => {
    const saleItem = sale.items.find(i => i.batchId === batchId)
    const max = saleItem.quantity
    const newQty = Math.min(Math.max(1, parseInt(qty) || 1), max)
    setReturnItems(returnItems.map(i => i.batchId === batchId ? { ...i, returnQty: newQty } : i))
  }

  const handleSave = async () => {
    if (returnItems.length === 0) return toast.error('No items selected for return')
    setSaving(true)
    try {
      await api.post('/returns/customer', {
        saleId: sale.id,
        reason,
        items: returnItems.map(i => ({
          productId: i.productId,
          batchId: i.batchId,
          quantity: i.returnQty,
          unitPrice: i.unitPrice
        }))
      })
      toast.success('Return processed successfully')
      onSave()
    } finally { setSaving(false) }
  }

  const totalReturn = returnItems.reduce((s, i) => s + (i.returnQty * i.unitPrice), 0)

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">New Customer Return</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-5">
          {!sale ? (
            <div className="flex gap-2">
              <input className="input" placeholder="Enter Invoice Number..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && findSale()} />
              <button onClick={findSale} disabled={loading} className="btn-primary">Find Sale</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#21263a] p-3 rounded-lg">
                <div>
                  <div className="text-xs text-[#94a3b8]">Invoice</div>
                  <div className="font-bold text-brand-400">{sale.invoiceNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#94a3b8]">Customer</div>
                  <div className="font-medium">{sale.customer?.name || 'Walk-in'}</div>
                </div>
                <button onClick={() => setSale(null)} className="btn-ghost btn-icon"><X size={14} /></button>
              </div>

              <div className="text-xs font-semibold text-[#94a3b8] uppercase">Select items to return</div>
              <div className="table-wrap border border-[#2a2f45] rounded-lg">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Sold Qty</th>
                      <th>Return Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map(item => {
                      const isSelected = returnItems.some(ri => ri.batchId === item.batchId)
                      const returnItem = returnItems.find(ri => ri.batchId === item.batchId)
                      return (
                        <tr key={item.id} className={clsx(isSelected && 'bg-brand-600/5')}>
                          <td><input type="checkbox" checked={isSelected} onChange={() => toggleItem(item)} className="accent-brand-600" /></td>
                          <td>
                            <div className="font-medium text-xs">{item.product.name}</div>
                            <div className="text-[10px] text-[#94a3b8]">{item.batch?.batchNumber}</div>
                          </td>
                          <td className="text-center">{item.quantity}</td>
                          <td>
                            {isSelected && (
                              <input type="number" className="input-sm w-16" value={returnItem.returnQty} onChange={e => updateQty(item.batchId, e.target.value)} />
                            )}
                          </td>
                          <td className="text-right font-medium">
                            {isSelected ? `${cur}${(returnItem.returnQty * item.unitPrice).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="form-group">
                <label className="label">Reason for Return</label>
                <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Expired product found, Damaged pack" />
              </div>

              <div className="flex justify-end pt-2 border-t border-[#2a2f45]">
                <div className="text-right">
                  <div className="text-xs text-[#94a3b8]">Refund Amount</div>
                  <div className="text-xl font-bold text-brand-400">{cur}{totalReturn.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !sale || returnItems.length === 0} className="btn-primary">Process Return</button>
        </div>
      </div>
    </div>
  )
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('customer') // customer | supplier
  const [modal, setModal] = useState(false)
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'
  const curLabel = settings.currency || '৳'

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/returns/customer`)
      setReturns(data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchReturns() }, [])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Returns</h1>
          <p className="page-subtitle">Manage customer returns and refunds</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <RotateCcw size={16} /> New Return
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Refund Total</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94a3b8]">No return records found</td></tr>
              ) : returns.map(r => (
                <tr key={r.id}>
                  <td>{format(new Date(r.returnDate), 'MMM d, yyyy')}</td>
                  <td className="font-mono text-xs text-brand-400">{r.sale?.invoiceNo}</td>
                  <td>{r.customer?.name || <span className="text-[#475569]">Walk-in</span>}</td>
                  <td>
                    <div className="text-xs">
                      {r.items.map(i => (
                        <div key={i.id}>{i.product?.name} ({i.quantity})</div>
                      ))}
                    </div>
                  </td>
                  <td className="font-bold text-red-400">{cur}{r.totalAmount.toFixed(2)}</td>
                  <td className="text-xs text-[#94a3b8]">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ReturnModal
          onClose={() => setModal(false)}
          cur={cur}
          onSave={() => { setModal(false); fetchReturns() }}
        />
      )}
    </div>
  )
}
