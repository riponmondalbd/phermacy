import { useState, useEffect } from 'react'
import api from '../../api/client'
import { format } from 'date-fns'
import { Search, Eye, Filter, Printer, X, ShoppingBag, User, Calendar } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import clsx from 'clsx'

function SaleDetailsModal({ sale, onClose }) {
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <div>
            <h3 className="font-semibold text-[#e2e8f0]">Sale Details</h3>
            <p className="text-xs text-[#94a3b8]">{sale.invoiceNo}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card p-3">
              <div className="text-[10px] text-[#94a3b8] uppercase font-semibold">Date</div>
              <div className="text-sm font-medium">{format(new Date(sale.saleDate), 'dd/MM/yyyy')}</div>
            </div>
            <div className="stat-card p-3">
              <div className="text-[10px] text-[#94a3b8] uppercase font-semibold">Time</div>
              <div className="text-sm font-medium">{format(new Date(sale.saleDate), 'hh:mm a')}</div>
            </div>
            <div className="stat-card p-3">
              <div className="text-[10px] text-[#94a3b8] uppercase font-semibold">Method</div>
              <div className="text-sm font-medium capitalize">{sale.paymentMethod}</div>
            </div>
            <div className="stat-card p-3">
              <div className="text-[10px] text-[#94a3b8] uppercase font-semibold">Cashier</div>
              <div className="text-sm font-medium">{sale.user?.name}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-400">
                <User size={20} />
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">Customer</div>
                <div className="font-semibold">{sale.customer?.name || 'Walk-in Customer'}</div>
                <div className="text-xs text-[#94a3b8]">{sale.customer?.phone || ''}</div>
              </div>
            </div>
          </div>

          <div className="table-wrap border border-[#2a2f45] rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Disc</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-[10px] text-[#94a3b8]">{item.product.genericName}</div>
                    </td>
                    <td className="text-xs">{item.batch?.batchNumber}</td>
                    <td>{item.quantity}</td>
                    <td>{cur}{item.unitPrice.toFixed(2)}</td>
                    <td>{cur}{item.discount.toFixed(2)}</td>
                    <td className="font-semibold">{cur}{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#94a3b8]">Subtotal</span>
                <span className="text-white">{cur}{sale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#94a3b8]">Discount</span>
                <span className="text-white">-{cur}{sale.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-[#2a2f45] pt-2">
                <span className="text-white">Grand Total</span>
                <span className="text-brand-400">{cur}{sale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-400 font-medium">
                <span>Paid Amount</span>
                <span>{cur}{sale.paidAmount.toFixed(2)}</span>
              </div>
              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-sm text-red-400 font-medium">
                  <span>Due Amount</span>
                  <span>{cur}{sale.dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary gap-2"><Printer size={14} /> Print Invoice</button>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'
  const LIMIT = 20

  const fetchSales = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/sales?page=${page}&limit=${LIMIT}&invoiceNo=${search}`)
      setSales(data.data)
      setTotal(data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchSales() }, [page, search])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">View and manage all past invoices</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input className="input pl-9" placeholder="Search by invoice number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <button className="btn-secondary gap-2"><Filter size={15} /> Filters</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><div className="spinner w-6 h-6 mx-auto" /></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-[#94a3b8]">No sales records found</td></tr>
              ) : sales.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-xs text-brand-400">{s.invoiceNo}</td>
                  <td>{format(new Date(s.saleDate), 'dd/MM/yyyy')}</td>
                  <td>{s.customer?.name || <span className="text-[#475569]">Walk-in</span>}</td>
                  <td className="font-semibold">{cur}{s.totalAmount.toFixed(2)}</td>
                  <td className="text-green-400">{cur}{s.paidAmount.toFixed(2)}</td>
                  <td className={clsx('font-medium', s.dueAmount > 0 ? 'text-red-400' : 'text-[#94a3b8]')}>
                    {cur}{s.dueAmount.toFixed(2)}
                  </td>
                  <td className="capitalize text-xs">{s.paymentMethod}</td>
                  <td>
                    {s.status === 'COMPLETED' && <span className="badge-green">Completed</span>}
                    {s.status === 'PARTIAL_RETURN' && <span className="badge-yellow">Partial Return</span>}
                    {s.status === 'FULLY_RETURNED' && <span className="badge-red">Returned</span>}
                  </td>
                  <td>
                    <button onClick={() => setSelectedSale(s)} className="btn-ghost btn-icon" title="View Details">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2f45] text-sm">
            <span className="text-[#94a3b8]">Showing {(page-1)*LIMIT + 1} to {Math.min(page*LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">Prev</button>
              <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  )
}
