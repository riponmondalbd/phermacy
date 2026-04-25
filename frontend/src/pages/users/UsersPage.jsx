import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, User, Edit2, Trash2, Key, Shield, Check, X, Mail } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { confirmDelete } from '../../utils/swal'

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || { name: '', email: '', password: '', role: 'CASHIER' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    if (!form.name || !form.email || (!user && !form.password)) return toast.error('Required fields missing')
    setSaving(true)
    try {
      const { data } = user
        ? await api.put(`/users/${user.id}`, form)
        : await api.post('/users', form)
      toast.success(user ? 'User updated' : 'User created')
      onSave(data)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold text-[#e2e8f0]">{user ? 'Edit User' : 'New System User'}</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Staff Name" />
          </div>
          <div className="form-group">
            <label className="label">Email / Login ID</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="staff@example.com" />
          </div>
          {!user && (
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
            </div>
          )}
          <div className="form-group">
            <label className="label">Access Role</label>
            <select className="select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="SALESMAN">Salesman (Sell, Cash & Returns Only)</option>
              <option value="CASHIER">Cashier (Standard Sales Access)</option>
              <option value="MANAGER">Manager (Full Access, no Settings)</option>
              <option value="ADMIN">Administrator (All Permissions)</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">Save User</button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDeactivate = async (id) => {
    const result = await confirmDelete('Revoke Access?', 'This user will no longer be able to log into the system.')
    if (!result.isConfirmed) return
    
    try {
      await api.delete(`/users/${id}`)
      toast.success('User access revoked')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to revoke access')
    }
  }

  const handleHardDelete = async (id) => {
    const result = await confirmDelete('Permanent Delete?', 'This will completely remove the user from the database. This action cannot be undone and may fail if the user has recorded sales.')
    if (!result.isConfirmed) return
    
    try {
      await api.delete(`/users/${id}?hard=true`)
      toast.success('User permanently deleted')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Cannot delete user with existing records (sales, logs, etc.)')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage staff accounts and system access</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> New User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center"><div className="spinner w-8 h-8" /></div>
        ) : users.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#94a3b8]">No users found</div>
        ) : users.map(u => (
          <div key={u.id} className="card group relative">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-600/10 flex items-center justify-center text-brand-400">
                  <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{u.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                    <Shield size={12} className={clsx(u.role === 'ADMIN' ? 'text-red-400' : 'text-blue-400')} />
                    <span className="capitalize">{u.role.toLowerCase()}</span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal(u)} className="btn-ghost btn-icon" title="Edit User"><Edit2 size={14} /></button>
                  <button onClick={() => handleHardDelete(u.id)} className="btn-ghost btn-icon text-red-400 hover:bg-red-500/10" title="Delete Permanently"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <Mail size={14} /> <span className="truncate">{u.email}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#2a2f45]">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Joined {format(new Date(u.createdAt), 'MMM yyyy')}</span>
                  {u.isActive ? (
                    <span className="badge-green">Active</span>
                  ) : (
                    <span className="badge-gray">Inactive</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-[#21263a]/30 border-t border-[#2a2f45] flex justify-between items-center">
              <button className="text-xs text-brand-400 font-medium hover:text-brand-300 flex items-center gap-1">
                <Key size={12} /> Reset Password
              </button>
              {u.isActive && (
                <button onClick={() => handleDeactivate(u.id)} className="text-xs text-red-400 font-medium hover:text-red-300">
                  Revoke Access
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchUsers() }}
        />
      )}
    </div>
  )
}
