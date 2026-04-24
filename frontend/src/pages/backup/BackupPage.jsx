import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Database, Download, Trash2, CloudUpload, History, FileArchive, Check, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'

export default function BackupPage() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/backup/list')
      setBackups(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchBackups() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await api.post('/backup/create')
      toast.success('Backup created successfully')
      fetchBackups()
    } finally { setCreating(false) }
  }

  const handleDelete = async (name) => {
    if (!confirm('Delete this backup? This cannot be undone.')) return
    try {
      await api.delete(`/backup/${name}`)
      toast.success('Backup deleted')
      fetchBackups()
    } catch (_) {}
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Database Backup</h1>
          <p className="page-subtitle">Secure your data with local and cloud backups</p>
        </div>
        <button onClick={handleCreate} disabled={creating} className="btn-primary">
          {creating ? <span className="spinner w-4 h-4 mr-2" /> : <Database size={16} className="mr-2" />}
          Create New Backup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 bg-brand-600/5 border-brand-600/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">Scheduled Backups</h3>
              <p className="text-xs text-[#94a3b8]">Auto backup occurs daily at 11:59 PM</p>
            </div>
          </div>
          <div className="p-3 bg-[#1a1d27] rounded-lg border border-[#2a2f45] flex items-center justify-between">
            <span className="text-sm text-[#e2e8f0]">Daily Auto-Backup</span>
            <span className="badge-green">Enabled</span>
          </div>
        </div>

        <div className="card p-6 border-yellow-500/20 bg-yellow-500/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-black">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">Data Restore</h3>
              <p className="text-xs text-[#94a3b8]">Restoring will overwrite current data</p>
            </div>
          </div>
          <button className="btn-secondary w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
            <CloudUpload size={16} className="mr-2" /> Restore from File
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-[#2a2f45] flex items-center justify-between">
          <h3 className="font-semibold text-white">Backup History</h3>
          <span className="text-xs text-[#94a3b8]">{backups.length} backups stored</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Backup File</th>
                <th>Created At</th>
                <th>Size</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : backups.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-[#94a3b8]">No backups found</td></tr>
              ) : backups.map(b => (
                <tr key={b.name}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileArchive size={16} className="text-brand-400" />
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td className="text-xs text-[#94a3b8]">{format(new Date(b.createdAt), 'MMM d, yyyy • hh:mm a')}</td>
                  <td className="text-xs">{formatSize(b.size)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <a 
                        href={`/api/backup/download/${b.name}?token=${localStorage.getItem('token')}`} 
                        className="btn-ghost btn-icon" 
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                      <button onClick={() => handleDelete(b.name)} className="btn-ghost btn-icon text-red-400" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
