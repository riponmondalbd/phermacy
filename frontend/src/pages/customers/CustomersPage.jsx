import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, User, X, Check, Phone, Mail, MapPin, DollarSign, History } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'
import { format } from 'date-fns'

function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(customer || { name: '', phone: '', email: '', address: '' })
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
      const { data } = customer
        ? await api.put(`/customers/${customer.id}`, form)
        : await api.post('/customers', form)
      toast.success(customer ? 'Customer updated' : 'Customer added')
      onSave(data)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">{customer ? 'Edit Customer' : 'New Customer'}</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div className="form-group">
            <label className="label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="01XXX-XXXXXX" />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
          </div>
          <div className="form-group">
            <label className="label">Address</label>
            <textarea className="input h-20 resize-none" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" />
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

function PaymentModal({ customer, onClose, onSave, cur }) {
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
      await api.post(`/customers/${customer.id}/payments`, form)
      toast.success('Payment recorded')
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">Customer Payment</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-xs text-red-400 font-medium">Outstanding Due</div>
            <div className="text-xl font-bold text-red-400">{cur}{customer.dueAmount.toFixed(2)}</div>
          </div>
          <div className="form-group">
            <label className="label">Amount Received</label>
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
            <input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Payment reference" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">Record Payment</button>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ customer, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/sales?customerId=${customer.id}`)
        setHistory(data.data)
      } finally { setLoading(false) }
    }
    fetchHistory()
  }, [customer.id])

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">Purchase History: {customer.name}</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body p-0">
          <div className="table-wrap max-h-96 overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8"><div className="spinner w-5 h-5 mx-auto" /></td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#94a3b8]">No history found</td></tr>
                ) : history.map(h => (
                  <tr key={h.id}>
                    <td className="text-xs text-[#94a3b8]">{format(new Date(h.saleDate), 'MMM d, yyyy')}</td>
                    <td className="font-medium text-xs text-[#e2e8f0]">{h.invoiceNo}</td>
                    <td className="text-xs font-semibold">{cur}{h.totalAmount.toFixed(2)}</td>
                    <td>
                      <span className={clsx('badge-xs', h.dueAmount > 0 ? 'badge-red' : 'badge-green')}>
                        {h.dueAmount > 0 ? 'Due' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/customers?search=${search}`)
      setCustomers(data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCustomers() }, [search])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Track customer purchases and credit</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> New Customer
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
        <input className="input pl-9" placeholder="Search customers by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Contact</th>
                <th>Total Purchase</th>
                <th>Due Amount</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94a3b8]">No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-400">
                        <User size={16} />
                      </div>
                      <div className="font-medium text-[#e2e8f0]">{c.name}</div>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs text-[#e2e8f0]">{c.phone || 'No phone'}</div>
                    <div className="text-[10px] text-[#94a3b8]">{c.email || ''}</div>
                  </td>
                  <td className="font-semibold">{cur}{c.totalPurchase.toFixed(2)}</td>
                  <td className={clsx('font-bold', c.dueAmount > 0 ? 'text-red-400' : 'text-green-400')}>
                    {cur}{c.dueAmount.toFixed(2)}
                  </td>
                  <td className="text-xs text-[#94a3b8]">
                    {c.updatedAt ? format(new Date(c.updatedAt), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(c)} className="btn-ghost btn-icon" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => setHistoryModal(c)} className="btn-ghost btn-icon" title="History"><History size={14} /></button>
                      {c.dueAmount > 0 && (
                        <button onClick={() => setPaymentModal(c)} className="btn-ghost btn-icon text-brand-400" title="Receive Payment">
                          <DollarSign size={14} />
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

      {modal && (
        <CustomerModal
          customer={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchCustomers() }}
        />
      )}

      {paymentModal && (
        <PaymentModal
          customer={paymentModal}
          cur={cur}
          onClose={() => setPaymentModal(null)}
          onSave={() => { setPaymentModal(null); fetchCustomers() }}
        />
      )}

      {historyModal && (
        <HistoryModal
          customer={historyModal}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  )
}
