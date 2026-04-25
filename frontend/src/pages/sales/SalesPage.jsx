import { useState, useEffect } from 'react'
import api from '../../api/client'
import { format } from 'date-fns'
import { Search, Eye, Filter, Printer, X, ShoppingBag, User, Calendar } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import clsx from 'clsx'

function SaleDetailsModal({ sale, onClose }) {
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const printInvoice = () => {
    const doc = new jsPDF({ format: 'a4' })
    const pageW = doc.internal.pageSize.width
    const pdfCur = (settings.currency === '৳' || !settings.currency) ? 'Tk.' : settings.currency;
    
    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(31, 152, 112)
    doc.text(settings.shopName || 'PharmaCare', pageW / 2, 20, { align: 'center' })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(settings.shopAddress || '', pageW / 2, 26, { align: 'center' })
    doc.text(`Phone: ${settings.shopPhone || ''}`, pageW / 2, 31, { align: 'center' })
    
    // Divider
    doc.setDrawColor(200)
    doc.line(14, 38, pageW - 14, 38)
    
    // Invoice Info
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40)
    doc.text('INVOICE', 14, 48)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Invoice No: ${sale.invoiceNo}`, 14, 54)
    doc.text(`Date: ${format(new Date(sale.saleDate), 'PPP p')}`, 14, 59)
    doc.text(`Sold By: ${sale.user?.name}`, 14, 64)
    
    // Customer Info
    const custX = pageW - 14
    doc.setFont('helvetica', 'bold')
    doc.text('BILL TO:', custX, 48, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(sale.customer?.name || 'Walk-in Customer', custX, 54, { align: 'right' })
    if (sale.customer?.phone) doc.text(sale.customer.phone, custX, 59, { align: 'right' })
    
    // Items Table
    doc.autoTable({
      startY: 72,
      head: [['#', 'Item Details', 'Batch', 'Qty', 'Unit Price', 'Total']],
      body: sale.items.map((item, i) => [
        i + 1,
        { content: item.product.name, styles: { fontStyle: 'bold' } },
        item.batch?.batchNumber || '-',
        item.quantity,
        `${pdfCur}${item.unitPrice.toFixed(2)}`,
        `${pdfCur}${item.totalPrice.toFixed(2)}`
      ]),
      styles: { fontSize: 9, cellPadding: 4, textColor: 50 },
      headStyles: { fillColor: [31, 152, 112], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 }
    })
    
    // Totals
    const finalY = doc.lastAutoTable.finalY + 10
    const totalX = pageW - 14
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('Subtotal:', totalX - 35, finalY)
    doc.text(`${pdfCur}${sale.subtotal.toFixed(2)}`, totalX, finalY, { align: 'right' })
    
    if (sale.discount > 0) {
      doc.text('Discount:', totalX - 35, finalY + 6)
      doc.text(`-${pdfCur}${sale.discount.toFixed(2)}`, totalX, finalY + 6, { align: 'right' })
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(31, 152, 112)
    doc.text('Grand Total:', totalX - 35, finalY + 14)
    doc.text(`${pdfCur}${sale.totalAmount.toFixed(2)}`, totalX, finalY + 14, { align: 'right' })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('Amount Paid:', totalX - 35, finalY + 21)
    doc.setTextColor(0, 150, 0)
    doc.text(`${pdfCur}${sale.paidAmount.toFixed(2)}`, totalX, finalY + 21, { align: 'right' })
    
    if (sale.dueAmount > 0) {
      doc.setTextColor(200, 0, 0)
      doc.text('Due Amount:', totalX - 35, finalY + 27)
      doc.text(`${pdfCur}${sale.dueAmount.toFixed(2)}`, totalX, finalY + 27, { align: 'right' })
    }
    
    // Footer
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(settings.invoiceFooter || 'Thank you for your business!', pageW / 2, finalY + 45, { align: 'center' })
    doc.text('System generated invoice. No signature required.', pageW / 2, finalY + 50, { align: 'center' })
    
    doc.save(`Invoice-${sale.invoiceNo}.pdf`)
  }

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
          <button onClick={printInvoice} className="btn-secondary gap-2"><Printer size={14} /> Print Invoice</button>
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
                    <button 
                      onClick={() => {
                        const { settings } = useSettingsStore.getState();
                        const doc = new jsPDF({ format: 'a4' });
                        const pageW = doc.internal.pageSize.width;
                        const pdfCur = (settings.currency === '৳' || !settings.currency) ? 'Tk.' : settings.currency;
                        
                        // Header
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(22);
                        doc.setTextColor(31, 152, 112);
                        doc.text(settings.shopName || 'PharmaCare', pageW / 2, 20, { align: 'center' });
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(settings.shopAddress || '', pageW / 2, 26, { align: 'center' });
                        doc.text(`Phone: ${settings.shopPhone || ''}`, pageW / 2, 31, { align: 'center' });
                        
                        // Divider
                        doc.setDrawColor(200);
                        doc.line(14, 38, pageW - 14, 38);
                        
                        // Invoice Info
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11);
                        doc.setTextColor(40);
                        doc.text('INVOICE', 14, 48);
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.text(`Invoice No: ${s.invoiceNo}`, 14, 54);
                        doc.text(`Date: ${format(new Date(s.saleDate), 'PPP p')}`, 14, 59);
                        doc.text(`Sold By: ${s.user?.name}`, 14, 64);
                        
                        // Customer Info
                        const custX = pageW - 14;
                        doc.setFont('helvetica', 'bold');
                        doc.text('BILL TO:', custX, 48, { align: 'right' });
                        doc.setFont('helvetica', 'normal');
                        doc.text(s.customer?.name || 'Walk-in Customer', custX, 54, { align: 'right' });
                        if (s.customer?.phone) doc.text(s.customer.phone, custX, 59, { align: 'right' });
                        
                        // Items Table
                        doc.autoTable({
                          startY: 72,
                          head: [['#', 'Item Details', 'Batch', 'Qty', 'Unit Price', 'Total']],
                          body: s.items.map((item, i) => [
                            i + 1,
                            { content: item.product.name, styles: { fontStyle: 'bold' } },
                            item.batch?.batchNumber || '-',
                            item.quantity,
                            `${pdfCur}${item.unitPrice.toFixed(2)}`,
                            `${pdfCur}${item.totalPrice.toFixed(2)}`
                          ]),
                          styles: { fontSize: 9, cellPadding: 4, textColor: 50 },
                          headStyles: { fillColor: [31, 152, 112], textColor: 255, fontSize: 10, fontStyle: 'bold' },
                          alternateRowStyles: { fillColor: [245, 245, 245] },
                          margin: { left: 14, right: 14 }
                        });
                        
                        // Totals
                        const finalY = doc.lastAutoTable.finalY + 10;
                        const totalX = pageW - 14;
                        
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text('Subtotal:', totalX - 35, finalY);
                        doc.text(`${pdfCur}${s.subtotal.toFixed(2)}`, totalX, finalY, { align: 'right' });
                        
                        if (s.discount > 0) {
                          doc.text('Discount:', totalX - 35, finalY + 6);
                          doc.text(`-${pdfCur}${s.discount.toFixed(2)}`, totalX, finalY + 6, { align: 'right' });
                        }
                        
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(12);
                        doc.setTextColor(31, 152, 112);
                        doc.text('Grand Total:', totalX - 35, finalY + 14);
                        doc.text(`${pdfCur}${s.totalAmount.toFixed(2)}`, totalX, finalY + 14, { align: 'right' });
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text('Amount Paid:', totalX - 35, finalY + 21);
                        doc.setTextColor(0, 150, 0);
                        doc.text(`${pdfCur}${s.paidAmount.toFixed(2)}`, totalX, finalY + 21, { align: 'right' });
                        
                        if (s.dueAmount > 0) {
                          doc.setTextColor(200, 0, 0);
                          doc.text('Due Amount:', totalX - 35, finalY + 27);
                          doc.text(`${pdfCur}${s.dueAmount.toFixed(2)}`, totalX, finalY + 27, { align: 'right' });
                        }
                        
                        // Footer
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(settings.invoiceFooter || 'Thank you for your business!', pageW / 2, finalY + 45, { align: 'center' });
                        doc.text('System generated invoice. No signature required.', pageW / 2, finalY + 50, { align: 'center' });
                        
                        doc.save(`Invoice-${s.invoiceNo}.pdf`);
                      }} 
                      className="btn-ghost btn-icon" 
                      title="Print Invoice"
                    >
                      <Printer size={14} />
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
