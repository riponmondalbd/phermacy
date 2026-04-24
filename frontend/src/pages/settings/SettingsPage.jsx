import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Settings, Save, Store, Mail, Phone, MapPin, DollarSign, Percent, Info, Bell, Shield, Database } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import clsx from 'clsx'

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div className="card overflow-hidden">
    <div className="px-5 py-4 border-b border-[#2a2f45] bg-[#21263a]/30 flex items-center gap-3">
      <div className="text-brand-400"><Icon size={18} /></div>
      <h3 className="font-semibold text-[#e2e8f0]">{title}</h3>
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
)

export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => { setForm(settings) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/settings', form)
      setSettings(data)
      toast.success('Settings saved successfully')
    } finally { setSaving(false) }
  }

  const update = (k, v) => setForm({...form, [k]: v})

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure shop details and application behavior</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? <span className="spinner w-4 h-4 mr-2" /> : <Save size={16} className="mr-2" />}
          Save Changes
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0 space-y-1">
          {[
            { id: 'general', label: 'General Shop', icon: Store },
            { id: 'financial', label: 'Financials', icon: DollarSign },
            { id: 'notifications', label: 'Email Reports', icon: Mail },
            { id: 'security', label: 'Security', icon: Shield },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all', 
                activeTab === tab.id ? 'bg-brand-600/10 text-brand-400 border border-brand-600/20' : 'text-[#94a3b8] hover:bg-[#21263a] hover:text-[#e2e8f0]')}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <SettingsSection title="Store Information" icon={Store}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="label">Shop Name</label>
                  <input className="input" value={form.shopName || ''} onChange={e => update('shopName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input className="input" value={form.shopPhone || ''} onChange={e => update('shopPhone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <input className="input" value={form.shopEmail || ''} onChange={e => update('shopEmail', e.target.value)} />
                </div>
                <div className="form-group col-span-2">
                  <label className="label">Address</label>
                  <textarea className="input h-20 resize-none" value={form.shopAddress || ''} onChange={e => update('shopAddress', e.target.value)} />
                </div>
                <div className="form-group col-span-2">
                  <label className="label">Invoice Footer Note</label>
                  <input className="input" value={form.invoiceFooter || ''} onChange={e => update('invoiceFooter', e.target.value)} />
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'financial' && (
            <SettingsSection title="Currency & Tax" icon={DollarSign}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Currency Symbol</label>
                  <input className="input" value={form.currency || '৳'} onChange={e => update('currency', e.target.value)} maxLength={3} />
                </div>
                <div className="form-group">
                  <label className="label">Default Tax Rate (%)</label>
                  <input type="number" className="input" value={form.taxRate || 0} onChange={e => update('taxRate', e.target.value)} />
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'notifications' && (
            <SettingsSection title="Automated Email Reports" icon={Mail}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#21263a]/50 rounded-xl border border-[#2a2f45]">
                  <div>
                    <div className="font-semibold text-[#e2e8f0]">Daily Sales Email</div>
                    <div className="text-xs text-[#94a3b8]">Send a summary of sales to admin every night</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={form.smtpEnabled === 'true'} onChange={e => update('smtpEnabled', String(e.target.checked))} />
                    <div className="w-11 h-6 bg-[#2a2f45] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                </div>
                {form.smtpEnabled === 'true' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="form-group">
                      <label className="label">Recipient Email</label>
                      <input className="input" value={form.reportEmail || ''} onChange={e => update('reportEmail', e.target.value)} placeholder="admin@example.com" />
                    </div>
                    <div className="form-group">
                      <label className="label">SMTP Host</label>
                      <input className="input" value={form.smtpHost || ''} onChange={e => update('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
                    </div>
                    <div className="form-group">
                      <label className="label">SMTP Port</label>
                      <input className="input" value={form.smtpPort || ''} onChange={e => update('smtpPort', e.target.value)} placeholder="587" />
                    </div>
                    <div className="form-group">
                      <label className="label">SMTP User</label>
                      <input className="input" value={form.smtpUser || ''} onChange={e => update('smtpUser', e.target.value)} placeholder="email@gmail.com" />
                    </div>
                    <div className="form-group">
                      <label className="label">SMTP Password</label>
                      <input type="password" className="input" value={form.smtpPass || ''} onChange={e => update('smtpPass', e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                )}
              </div>
            </SettingsSection>
          )}

          {activeTab === 'security' && (
            <SettingsSection title="System Security" icon={Shield}>
              <div className="space-y-4">
                <div className="p-4 bg-brand-600/10 border border-brand-600/20 rounded-xl flex gap-3">
                  <Info className="text-brand-400 shrink-0" size={18} />
                  <p className="text-xs text-brand-300 leading-relaxed">
                    Role-based access is enabled. Only Admins can modify these settings. Data backups are recommended before any major changes.
                  </p>
                </div>
                <div className="form-group">
                  <label className="label">Low Stock Warning Days</label>
                  <input type="number" className="input" value={form.lowStockDays || 90} onChange={e => update('lowStockDays', e.target.value)} />
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  )
}
