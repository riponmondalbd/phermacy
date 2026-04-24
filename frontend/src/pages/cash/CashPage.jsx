import { useState, useEffect } from 'react'
import api from '../../api/client'
import { format } from 'date-fns'
import { Wallet, Plus, Minus, History, Check, X, ArrowDownRight, ArrowUpRight, DollarSign, Calculator } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function ExpenseModal({ sessionId, onClose, onSave }) {
  const [form, setForm] = useState({ category: '', amount: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    if (!form.category || !form.amount) return toast.error('Required fields missing')
    setSaving(true)
    try {
      await api.post('/cash/expenses', { ...form, cashSessionId: sessionId })
      toast.success('Expense recorded')
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">New Expense</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Category *</label>
            <select className="select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">Select Category</option>
              <option value="Electricity">Electricity Bill</option>
              <option value="Rent">Rent</option>
              <option value="Salary">Staff Salary</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Office">Office Supplies</option>
              <option value="Tea/Snacks">Tea/Snacks</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount *</label>
            <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Details..." />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">Record Expense</button>
        </div>
      </div>
    </div>
  )
}

function CloseSessionModal({ session, onClose, onSave }) {
  const [closingCash, setClosingCash] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleClose = async () => {
    setSaving(true)
    try {
      await api.post(`/cash/sessions/${session.id}/close`, { closingCash })
      toast.success('Session closed successfully')
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm text-center">
        <div className="modal-body pt-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto text-yellow-400">
            <Calculator size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Close Today's Session?</h3>
          <p className="text-sm text-[#94a3b8]">Verify your physical cash and enter the closing balance.</p>
          <div className="form-group text-left">
            <label className="label">Closing Physical Cash</label>
            <input type="number" className="input" value={closingCash} onChange={e => setClosingCash(e.target.value)} placeholder="0.00" autoFocus />
          </div>
        </div>
        <div className="modal-footer justify-center pb-8 border-t-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleClose} disabled={saving} className="btn-primary px-8">Confirm & Close</button>
        </div>
      </div>
    </div>
  )
}

export default function CashPage() {
  const [session, setSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [openingCash, setOpeningCash] = useState('')
  const [opening, setOpening] = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)
  const [closingModal, setClosingModal] = useState(false)
  const { settings } = useSettingsStore()
  const { user } = useAuthStore()
  const cur = settings.currency || '৳'

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: active } = await api.get('/cash/sessions/active')
      setSession(active)
      const { data: history } = await api.get('/cash/sessions')
      setSessions(history.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpen = async () => {
    if (!openingCash) return toast.error('Enter opening cash')
    setOpening(true)
    try {
      await api.post('/cash/sessions/open', { openingCash })
      toast.success('Day started!')
      fetchData()
    } finally { setOpening(false) }
  }

  const totalSales = session?.totalSales || 0
  const totalExpenses = session?.expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const expectedCash = (session?.openingCash || 0) + totalSales - totalExpenses

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cash Management</h1>
          <p className="page-subtitle">Track daily cash flow, opening and closing</p>
        </div>
      </div>

      {!session ? (
        <div className="flex items-center justify-center py-20">
          <div className="card w-full max-w-sm p-8 text-center space-y-6 border-brand-600/30 shadow-lg shadow-brand-600/5">
            <div className="w-16 h-16 rounded-full bg-brand-600/10 flex items-center justify-center mx-auto text-brand-400">
              <Wallet size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Start New Day</h2>
              <p className="text-sm text-[#94a3b8] mt-1">Enter opening balance to begin transactions</p>
            </div>
            <div className="form-group text-left">
              <label className="label">Opening Cash Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]">{cur}</span>
                <input type="number" className="input pl-8 text-lg" value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="0.00" autoFocus />
              </div>
            </div>
            <button onClick={handleOpen} disabled={opening} className="btn-primary w-full btn-lg">
              {opening ? 'Starting...' : 'Open Session'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">Opening Cash</div>
              <div className="text-2xl font-bold text-white">{cur}{session.openingCash.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] text-green-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <ArrowUpRight size={10} /> Today's Sales (Cash)
              </div>
              <div className="text-2xl font-bold text-white">{cur}{totalSales.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <ArrowDownRight size={10} /> Today's Expenses
              </div>
              <div className="text-2xl font-bold text-white">{cur}{totalExpenses.toFixed(2)}</div>
            </div>
            <div className="stat-card bg-brand-600/5 border-brand-600/30">
              <div className="text-[10px] text-brand-400 uppercase font-bold tracking-wider">Expected Balance</div>
              <div className="text-2xl font-bold text-white">{cur}{expectedCash.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="card">
                <div className="p-4 border-b border-[#2a2f45] flex items-center justify-between">
                  <h3 className="font-semibold text-white">Daily Expenses</h3>
                  <button onClick={() => setExpenseModal(true)} className="btn-secondary btn-sm gap-1.5"><Plus size={14} /> Add Expense</button>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.expenses.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-[#94a3b8]">No expenses recorded today</td></tr>
                      ) : session.expenses.map(e => (
                        <tr key={e.id}>
                          <td>{format(new Date(e.createdAt), 'hh:mm a')}</td>
                          <td><span className="badge-gray">{e.category}</span></td>
                          <td className="text-[#94a3b8] text-xs">{e.description}</td>
                          <td className="text-right font-bold text-red-400">-{cur}{e.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6 border-yellow-500/20 bg-yellow-500/5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Check size={18} className="text-yellow-400" /> End of Day
                </h3>
                <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                  Before closing, ensure all cash sales are recorded and physical cash in drawer matches the expected balance.
                </p>
                <button onClick={() => setClosingModal(true)} className="btn-primary w-full mt-6 bg-yellow-600 hover:bg-yellow-500 border-none">
                  Close Session
                </button>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <History size={16} className="text-brand-400" /> Recent History
                </h3>
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-[#21263a]/50 text-xs">
                      <div>
                        <div className="text-white font-medium">{format(new Date(s.date), 'MMM d, yyyy')}</div>
                        <div className="text-[#94a3b8]">{s.isClosed ? 'Closed' : 'Active'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-brand-400 font-bold">{cur}{s.totalSales.toFixed(0)}</div>
                        <div className="text-red-400">{cur}{s.totalExpenses.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {expenseModal && <ExpenseModal sessionId={session?.id} onClose={() => setExpenseModal(false)} onSave={() => { setExpenseModal(false); fetchData() }} />}
      {closingModal && <CloseSessionModal session={session} onClose={() => setClosingModal(false)} onSave={() => { setClosingModal(false); fetchData() }} />}
    </div>
  )
}
