import clsx from 'clsx'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { ArrowUpDown, Check, Package, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'

import AdjustmentModal from '../../components/AdjustmentModal'

export default function InventoryPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('stock') // stock | expired | adjustments | restock
  const [modal, setModal] = useState(null) // null | { productId, batchId, type }
  const [expiryFilter, setExpiryFilter] = useState('all') // all | date | stock | low
  const [restockList, setRestockList] = useState({}) // { productId: { checked, qty } }
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
      } else if (tab === 'restock') {
        const { data } = await api.get('/inventory/stock')
        const restockOnly = data.filter(p => (p.totalStock ?? 0) <= (p.minStockLevel ?? 0))
        setData(restockOnly)
      } else if (tab === 'expired') {
        if (expiryFilter === 'stock') {
          // For out of stock, we look at items with 0 stock
          const { data } = await api.get('/inventory/stock')
          const oosProducts = data.filter(p => (p.totalStock ?? 0) <= 0)
          const flattened = []
          oosProducts.forEach(p => {
            if (p.batches?.length > 0) p.batches.forEach(b => flattened.push({ ...b, product: p }))
            else flattened.push({ product: p, batchNumber: 'N/A', expiryDate: null, quantity: 0 })
          })
          setData(flattened)
        } else if (expiryFilter === 'low') {
          // For low stock, we look at items below minStockLevel but > 0
          const { data } = await api.get('/inventory/stock')
          const lowProducts = data.filter(p => {
            const stock = p.totalStock ?? 0
            const min = p.minStockLevel ?? 0
            return stock > 0 && stock <= min
          })
          
          const flattened = []
          lowProducts.forEach(p => {
            if (p.batches?.length > 0) p.batches.forEach(b => flattened.push({ ...b, product: p }))
            else flattened.push({ product: p, batchNumber: 'N/A', expiryDate: null, quantity: p.totalStock })
          })
          setData(flattened)
        } else {
          const { data } = await api.get('/inventory/expiry-alerts')
          const combined = [...data.expired, ...data.expiringSoon]
          if (expiryFilter === 'date') {
            setData(combined.filter(b => new Date(b.expiryDate) < new Date()))
          } else {
            setData(combined)
          }
        }
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

  useEffect(() => { fetchData() }, [tab, expiryFilter])

  const sortedAndFiltered = data
    .filter(item => {
      // Get the product name safely across different data structures (stock vs alerts vs logs)
      const name = item?.name || item?.product?.name || ''
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      if (tab === 'stock') {
        // Priority: Date Expired > Out of Stock > Low Stock > Others
        const getPriority = (x) => {
          const stock = x.totalStock ?? 0
          if (x.hasExpired) return 0
          if (stock <= 0) return 1
          if (stock <= (x.minStockLevel || 0)) return 2
          return 3
        }
        return getPriority(a) - getPriority(b)
      }
      if (tab === 'expired' && expiryFilter !== 'stock' && expiryFilter !== 'low') {
        // Sort by expiry date ascending
        return new Date(a.expiryDate) - new Date(b.expiryDate)
      }
      return 0
    })

  const handleRestockToggle = (id) => {
    setRestockList(prev => ({
      ...prev,
      [id]: { ...prev[id], checked: !prev[id]?.checked, unit: prev[id]?.unit || 'pcs' }
    }))
  }

  const handleRestockQty = (id, qty) => {
    setRestockList(prev => ({
      ...prev,
      [id]: { ...prev[id], qty }
    }))
  }

  const handleRestockUnit = (id, unit) => {
    setRestockList(prev => ({
      ...prev,
      [id]: { ...prev[id], unit }
    }))
  }

  const exportPDF = () => {
    try {
      const doc = new jsPDF()
      const shopName = settings.shopName || 'PharmaCare Pharmacy'
      let title = tab === 'stock' ? 'Inventory Stock Report' : 'Expiry Alerts Report'
      if (tab === 'expired') {
        if (expiryFilter === 'date') title = 'Date Expired Report'
        if (expiryFilter === 'stock') title = 'Out of Stock Report'
        if (expiryFilter === 'low') title = 'Low Stock Report'
      }
      if (tab === 'restock') title = 'Pharmacy Restock List'

      // Shop Header
      doc.setFontSize(18)
      doc.setTextColor(79, 70, 229) // Brand color
      doc.text(shopName, 14, 15)
      
      // Report Title
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text(title, 14, 22)
      
      // Generation Date
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 28)
      
      const isStockView = tab === 'stock' || (tab === 'expired' && (expiryFilter === 'stock' || expiryFilter === 'low'))
      const isRestockView = tab === 'restock'

      const headers = isRestockView 
        ? [['Product', 'Category', 'Target Stock']]
        : isStockView
          ? [['Product', 'Category', 'Total Stock', 'Status']]
          : [['Product', 'Batch #', 'Expiry Date', 'Qty', 'Status']]
        
      const rows = isRestockView 
        ? sortedAndFiltered
            .filter(item => restockList[item.id]?.checked)
            .map(item => {
              const current = item.totalStock ?? 0
              const restock = parseFloat(restockList[item.id]?.qty || 0)
              const unit = restockList[item.id]?.unit || 'pcs'
              return [item.name, item.category?.name || 'N/A', `${current + restock} ${unit}`]
            })
        : sortedAndFiltered.map(item => {
            if (isStockView) {
              let status = 'Healthy'
              const totalStock = item.totalStock ?? 0
              if (item.hasExpired || (item.batches?.some(b => new Date(b.expiryDate) < new Date()))) status = 'DATE EXPIRED'
              else if (totalStock <= 0) status = 'STOCK EXPIRED (0)'
              else if (totalStock <= item.minStockLevel) status = 'LOW STOCK'
              return [item.name || item.product?.name, item.category?.name || 'N/A', `${totalStock} ${item.unit || ''}s`, status]
            } else {
              const status = new Date(item.expiryDate) < new Date() ? 'DATE EXPIRED' : 'EXPIRING SOON'
              return [item.product?.name || item.name, item.batchNumber || '—', format(new Date(item.expiryDate), 'MMM d, yyyy'), item.quantity, status]
            }
          })

      if (isRestockView && rows.length === 0) return toast.error('No products selected for restock')

      doc.autoTable({
        head: headers,
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      })
      
      const safeName = shopName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      doc.save(`${safeName}_${title.toLowerCase().replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      toast.success('Report exported successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to export PDF')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Batch tracking and stock control</p>
        </div>
        <div className="flex gap-2">
          {(tab !== 'adjustments' && (tab !== 'restock' || Object.values(restockList).some(v => v.checked))) && (
            <button onClick={exportPDF} className="btn-secondary">
              <Package size={16} /> {tab === 'restock' ? 'Print Restock List' : 'Export PDF'}
            </button>
          )}
          {isManager() && (
            <button onClick={() => setModal({})} className="btn-primary">
              <ArrowUpDown size={16} /> Adjust Stock
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex p-1 bg-[#1a1d27] border border-[#2a2f45] rounded-xl shrink-0 overflow-x-auto">
            <button onClick={() => setTab('stock')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap', tab === 'stock' ? 'bg-brand-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Stock Level</button>
            <button onClick={() => setTab('expired')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap', tab === 'expired' ? 'bg-red-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Expiry Alerts</button>
            <button onClick={() => setTab('restock')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap', tab === 'restock' ? 'bg-orange-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Restock</button>
            <button onClick={() => setTab('adjustments')} className={clsx('px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap', tab === 'adjustments' ? 'bg-brand-600 text-white shadow-lg' : 'text-[#94a3b8] hover:text-white')}>Logs</button>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input className="input pl-9" placeholder="Search by product name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {tab === 'expired' && (
          <div className="flex gap-2 p-1 bg-[#1a1d27]/50 border border-white/5 rounded-lg w-fit">
            <button onClick={() => setExpiryFilter('all')} className={clsx('px-3 py-1 text-xs rounded-md transition-all', expiryFilter === 'all' ? 'bg-white/10 text-white' : 'text-[#94a3b8] hover:text-white')}>All Alerts</button>
            <button onClick={() => setExpiryFilter('date')} className={clsx('px-3 py-1 text-xs rounded-md transition-all', expiryFilter === 'date' ? 'bg-red-500/20 text-red-400' : 'text-[#94a3b8] hover:text-white')}>Date Expired</button>
            <button onClick={() => setExpiryFilter('stock')} className={clsx('px-3 py-1 text-xs rounded-md transition-all', expiryFilter === 'stock' ? 'bg-orange-500/20 text-orange-400' : 'text-[#94a3b8] hover:text-white')}>Out of Stock</button>
            <button onClick={() => setExpiryFilter('low')} className={clsx('px-3 py-1 text-xs rounded-md transition-all', expiryFilter === 'low' ? 'bg-yellow-500/20 text-yellow-400' : 'text-[#94a3b8] hover:text-white')}>Low Stock</button>
          </div>
        )}
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
              {tab === 'restock' && (
                <tr>
                  <th className="w-10 text-center"><Check size={14} className="mx-auto" /></th>
                  <th>Product</th>
                  <th>Batch #</th>
                  <th>Earliest Expiry</th>
                  <th>Current Stock</th>
                  <th className="w-24">Unit</th>
                  <th className="w-24">Restock Qty</th>
                  <th>Target Stock</th>
                </tr>
              )}
              {tab === 'expired' && (
                <tr>
                  <th>Product</th>
                  {expiryFilter !== 'stock' && (
                    <>
                      <th>Batch #</th>
                      <th>Expiry Date</th>
                    </>
                  )}
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
              ) : sortedAndFiltered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94a3b8]">No records found for this view</td></tr>
              ) : sortedAndFiltered.map((item, idx) => (
                <tr key={item?.id || idx} className={clsx(tab === 'restock' && restockList[item.id]?.checked && 'bg-orange-500/5')}>
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
                          {item?.batches?.slice(0, 3).map(b => (
                            <div key={b.id} className="bg-[#21263a] px-2 py-1 rounded text-[10px] border border-[#2a2f45] flex flex-col gap-0.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[#94a3b8]">Batch: <span className="text-white font-mono">{b.batchNumber}</span></span>
                                <span className={clsx("font-bold px-1 rounded bg-[#0f1117]", b.quantity <= 10 ? 'text-red-400' : 'text-green-400')}>{b.quantity}</span>
                              </div>
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-[#475569]">Expiry:</span>
                                <span className={clsx(new Date(b.expiryDate) < new Date() ? 'text-red-400' : 'text-white')}>
                                  {format(new Date(b.expiryDate), 'MMM yyyy')}
                                </span>
                              </div>
                            </div>
                          ))}
                          {item?.batches?.length > 3 && <span className="text-[10px] text-brand-400 mt-1">+{item.batches.length - 3} more batches...</span>}
                        </div>
                      </td>
                      <td>
                        {item?.totalStock <= 0 ? (
                          <span className="badge-red">Out of Stock</span>
                        ) : (
                          item?.totalStock <= item?.minStockLevel && <span className="badge-red">Low Stock</span>
                        )}
                        {item?.hasExpired && <span className="badge-red ml-1">Date Expired</span>}
                        {!item?.hasExpired && item?.hasExpiringSoon && <span className="badge-yellow ml-1">Expiring Soon</span>}
                        {item?.totalStock > item?.minStockLevel && !item?.hasExpired && !item?.hasExpiringSoon && <span className="badge-green">Healthy</span>}
                      </td>
                    </>
                  )}
                  {tab === 'restock' && (
                    <>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          className="checkbox" 
                          checked={!!restockList[item.id]?.checked} 
                          onChange={() => handleRestockToggle(item.id)} 
                        />
                      </td>
                      <td className="cursor-pointer" onClick={() => handleRestockToggle(item.id)}>
                        <div className="font-medium text-[#e2e8f0]">{item?.name}</div>
                        <div className="text-[10px] text-[#94a3b8]">{item?.category?.name}</div>
                      </td>
                      <td className="text-xs font-mono cursor-pointer" onClick={() => handleRestockToggle(item.id)}>
                        {item?.batches?.[0]?.batchNumber || <span className="text-[#475569]">N/A</span>}
                      </td>
                      <td className="text-xs cursor-pointer" onClick={() => handleRestockToggle(item.id)}>
                        {item?.batches?.[0]?.expiryDate ? (
                          <span className={clsx(new Date(item.batches[0].expiryDate) < new Date() ? 'text-red-400' : 'text-[#94a3b8]')}>
                            {format(new Date(item.batches[0].expiryDate), 'MMM yyyy')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className={clsx('font-bold cursor-pointer', item.totalStock <= item.minStockLevel ? 'text-red-400' : 'text-white')} onClick={() => handleRestockToggle(item.id)}>
                        {item.totalStock} {item.unit}s
                      </td>
                      <td>
                        <select 
                          className="input h-8 text-[10px] py-0 px-1 bg-[#1a1d27]" 
                          value={restockList[item.id]?.unit || item.unit || 'pcs'} 
                          onChange={e => handleRestockUnit(item.id, e.target.value)}
                          disabled={!restockList[item.id]?.checked}
                        >
                          <option value="stripe">Stripe</option>
                          <option value="pice">Pice</option>
                          <option value="box">Box</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="input h-8 text-xs w-24" 
                          placeholder="Qty..." 
                          value={restockList[item.id]?.qty || ''} 
                          onChange={e => handleRestockQty(item.id, e.target.value)} 
                          disabled={!restockList[item.id]?.checked}
                        />
                      </td>
                      <td className="font-bold text-brand-400">
                        {item.totalStock + parseFloat(restockList[item.id]?.qty || 0)} {restockList[item.id]?.unit || item.unit || 'units'}
                        <div className="text-[10px] text-[#475569] font-normal">Min: {item.minStockLevel}</div>
                      </td>
                    </>
                  )}
                  {tab === 'expired' && (
                    <>
                      <td>
                        <div className="font-medium text-[#e2e8f0]">{item?.product?.name || item?.name}</div>
                        <div className="text-[10px] text-[#94a3b8]">{item?.product?.category?.name || item?.category?.name}</div>
                      </td>
                      {expiryFilter !== 'stock' && (
                        <>
                          <td className="font-mono text-xs">{item?.batchNumber || '—'}</td>
                          <td className={clsx('font-medium', item?.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-red-400' : 'text-yellow-400')}>
                            {item?.expiryDate ? format(new Date(item.expiryDate), 'MMM d, yyyy') : <span className="text-[#475569]">N/A</span>}
                          </td>
                        </>
                      )}
                      <td className="font-bold">{item?.quantity ?? item?.totalStock}</td>
                      <td>
                        {item?.expiryDate && new Date(item.expiryDate) < new Date() ? (
                          <span className="badge-red">Date Expired</span>
                        ) : (item?.quantity ?? item?.totalStock) <= 0 ? (
                          <span className="badge-red">Out of Stock</span>
                        ) : (
                          <span className="badge-yellow">Low Stock</span>
                        )}
                      </td>
                      <td>
                        <button 
                          onClick={() => setModal({ 
                            productId: item?.productId || item?.product?.id || item?.id, 
                            batchId: (item?.productId || item?.product?.id) ? item.id : '', // It's a batch if it has a productId parent
                            type: item?.expiryDate && new Date(item?.expiryDate) < new Date() ? 'EXPIRED' : 'CORRECTION' 
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
