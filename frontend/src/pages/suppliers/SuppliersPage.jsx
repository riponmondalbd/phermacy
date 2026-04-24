import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, Truck, X, Check, Phone, Mail, MapPin, DollarSign } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import clsx from 'clsx'

function SupplierModal({ supplier, onClose, onSave }) {
  const [form, setForm] = useState(supplier || {
    name: '', contactName: '', phone: '', email: '', address: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    if (!form.name) return toast.error('Name is required')
    setSaving(true)
    try {
      const { data } = supplier
        ? await api.put(`/suppliers/${supplier.id}`, form)
        : await api.post('/suppliers', form)
      toast.success(supplier ? 'Supplier updated' : 'Supplier added')
      onSave(data)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">{supplier ? 'Edit Supplier' : 'New Supplier'}</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Supplier Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Company Name" />
          </div>
          <div className="form-group">
            <label className="label">Contact Person</label>
            <input className="input" value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Full Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email address" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Address</label>
            <textarea className="input h-20 resize-none" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner w-4 h-4" /> : <><Check size={14} /> Save Supplier</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentModal({ supplier, onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', method: 'cash', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Valid amount required')
    setSaving(true)
    try {
      await api.post(`/suppliers/${supplier.id}/payments`, form)
      toast.success('Payment recorded')
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">Record Payment</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-xs text-red-400 font-medium">Total Due</div>
            <div className="text-xl font-bold text-red-400">৳{supplier.dueAmount.toFixed(2)}</div>
          </div>
          <div className="form-group">
            <label className="label">Amount to Pay</label>
            <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="label">Payment Method</label>
            <select className="select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
              <option value="cash">Cash</option>
              <option value="card">Bank/Card</option>
              <option value="mobile">Mobile Banking</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Reference #" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">Record</button>
        </div>
      </div>
    </div>
  )
}

function SupplierLedgerModal({ supplier, onClose, cur }) {
  const [data, setData] = useState({ purchases: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('due') // 'due' | 'paid'

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true)
      try {
        const { data: res } = await api.get(`/suppliers/${supplier.id}/ledger`)
        setData(res)
      } finally { setLoading(false) }
    }
    fetchLedger()
  }, [supplier.id])

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-3xl">
        <div className="modal-header">
          <div>
            <h3 className="font-semibold text-[#e2e8f0]">{supplier.name} - Ledger</h3>
            <p className="text-xs text-[#94a3b8]">Financial history and account status</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="flex p-1 bg-[#1a1d27] border border-[#2a2f45] rounded-xl w-fit">
            <button 
              onClick={() => setTab('due')} 
              className={clsx('px-4 py-1.5 text-xs font-medium rounded-lg transition-all', tab === 'due' ? 'bg-brand-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}
            >
              Due List (Purchases)
            </button>
            <button 
              onClick={() => setTab('paid')} 
              className={clsx('px-4 py-1.5 text-xs font-medium rounded-lg transition-all', tab === 'paid' ? 'bg-green-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}
            >
              Paid List (Payments)
            </button>
          </div>

          <div className="table-wrap border border-[#2a2f45] rounded-lg min-h-[300px]">
            <table className="table table-sm">
              <thead>
                {tab === 'due' ? (
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right text-red-400">Due</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Ref/Notes</th>
                    <th className="text-right">Amount</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
                ) : tab === 'due' ? (
                  data.purchases.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#94a3b8]">No purchase history</td></tr>
                  ) : data.purchases.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs">{format(new Date(p.purchaseDate), 'MMM d, yyyy')}</td>
                      <td className="font-mono text-[10px]">{p.invoiceNo || 'N/A'}</td>
                      <td className="text-right">{cur}{p.totalAmount.toFixed(2)}</td>
                      <td className="text-right text-green-400">{cur}{p.paidAmount.toFixed(2)}</td>
                      <td className="text-right text-red-400 font-bold">{cur}{p.dueAmount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  data.payments.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-[#94a3b8]">No payment history</td></tr>
                  ) : data.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs">{format(new Date(p.paymentDate), 'MMM d, yyyy p')}</td>
                      <td className="capitalize text-xs">{p.method}</td>
                      <td className="text-xs text-[#94a3b8]">{p.notes || '—'}</td>
                      <td className="text-right text-green-400 font-bold">{cur}{p.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary w-full">Close Ledger</button>
        </div>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | supplier
  const [paymentModal, setPaymentModal] = useState(null)
  const [ledgerModal, setLedgerModal] = useState(null)
  const { settings } = useSettingsStore()
  const { isManager } = useAuthStore()
  const cur = settings.currency || '৳'

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/suppliers?search=${search}`)
      setSuppliers(data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchSuppliers() }, [search])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage manufacturers and distributors</p>
        </div>
        {isManager() && (
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
        <input className="input pl-9" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center"><div className="spinner w-8 h-8" /></div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#94a3b8]">No suppliers found</div>
        ) : suppliers.map(s => (
          <div key={s.id} className="card p-5 space-y-4 relative group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center text-brand-400">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#e2e8f0]">{s.name}</h3>
                  <p className="text-xs text-[#94a3b8]">{s.contactName || 'No contact person'}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setLedgerModal(s)} className="btn-ghost btn-icon text-brand-400" title="View Ledger"><DollarSign size={14} /></button>
                <button onClick={() => setModal(s)} className="btn-ghost btn-icon"><Edit2 size={14} /></button>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#2a2f45] pt-4">
              <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                <Phone size={14} /> <span>{s.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                <Mail size={14} /> <span>{s.email || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-[#94a3b8]">
                <MapPin size={14} className="mt-1 shrink-0" /> <span className="line-clamp-1">{s.address || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2a2f45]">
              <div>
                <div className="text-[10px] text-[#94a3b8] uppercase font-semibold">Total Due</div>
                <div className={clsx('text-lg font-bold', s.dueAmount > 0 ? 'text-red-400' : 'text-green-400')}>
                  {cur}{s.dueAmount.toFixed(2)}
                </div>
              </div>
              {s.dueAmount > 0 && (
                <button onClick={() => setPaymentModal(s)} className="btn-secondary btn-sm gap-1.5">
                  <DollarSign size={13} /> Pay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <SupplierModal
          supplier={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchSuppliers() }}
        />
      )}

      {paymentModal && (
        <PaymentModal
          supplier={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSave={() => { setPaymentModal(null); fetchSuppliers() }}
        />
      )}

      {ledgerModal && (
        <SupplierLedgerModal
          supplier={ledgerModal}
          cur={cur}
          onClose={() => setLedgerModal(null)}
        />
      )}
    </div>
  )
}
