import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api/client'
import { usePOSStore } from '../../store/posStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Printer, Check, X, Package } from 'lucide-react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import clsx from 'clsx'

function ProductCard({ product, onAdd, cur }) {
  const stock = product.totalStock || 0
  const firstBatch = product.batches?.[0]
  return (
    <div
      className={clsx('pos-product-card', stock === 0 && 'out-of-stock')}
      onClick={() => stock > 0 && firstBatch && onAdd(product, firstBatch)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-semibold text-[#e2e8f0] text-xs leading-tight line-clamp-2">{product.name}</div>
      </div>
      <div className="text-[10px] text-[#94a3b8]">{product.genericName}</div>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-brand-400 font-bold text-sm">{cur}{product.salePrice}</span>
        <span className={clsx('text-[10px] font-medium', stock > 0 ? 'text-green-400' : 'text-red-400')}>
          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
        </span>
      </div>
    </div>
  )
}

function CartItem({ item, onQtyChange, onPriceChange, onRemove, cur }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-[#2a2f45] last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[#e2e8f0] truncate">{item.productName}</div>
          <div className="text-[10px] text-[#94a3b8]">Batch: {item.batchNumber}</div>
        </div>
        <button onClick={() => onRemove(item.batchId)} className="text-[#475569] hover:text-red-400 mt-0.5">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[#21263a] rounded-lg">
          <button onClick={() => onQtyChange(item.batchId, item.quantity - 1)}
            className="p-1 text-[#94a3b8] hover:text-white"><Minus size={12} /></button>
          <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
          <button onClick={() => onQtyChange(item.batchId, item.quantity + 1)}
            className="p-1 text-[#94a3b8] hover:text-white"><Plus size={12} /></button>
        </div>
        <span className="text-[#94a3b8] text-xs">×</span>
        <input
          type="number"
          value={item.unitPrice}
          onChange={e => onPriceChange(item.batchId, e.target.value)}
          className="input-sm w-20 text-center"
        />
        <span className="ml-auto text-xs font-semibold text-white">
          {cur}{((item.quantity * item.unitPrice) - item.discount).toFixed(2)}
        </span>
      </div>
    </div>
  )
}

export default function POSPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [searching, setSearching] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const searchRef = useRef()
  const { settings } = useSettingsStore()
  const { user } = useAuthStore()
  const cur = settings.currency || '৳'

  const {
    cartItems, customer, discount, paymentMethod, paidAmount,
    addItem, updateQty, updatePrice, updateItemDiscount, removeItem, clearCart,
    setCustomer, setDiscount, setPaymentMethod, setPaidAmount,
    getSubtotal, getTotal, getDue
  } = usePOSStore()

  const subtotal = getSubtotal()
  const total = getTotal()
  const due = getDue()

  // Search products
  useEffect(() => {
    if (!search.trim()) { setProducts([]); return }
    
    // Instant search for potential barcodes (8-14 digits)
    const isBarcode = /^\d{8,14}$/.test(search)
    const delay = isBarcode ? 50 : 250

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get(`/products/search/pos?q=${encodeURIComponent(search)}`)
        setProducts(data)
      } finally { setSearching(false) }
    }, delay)
    return () => clearTimeout(timer)
  }, [search])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && products.length === 1) {
      handleAddToCart(products[0], products[0].batches[0])
    }
  }

  // Load customers for search
  useEffect(() => {
    if (!customerSearch.trim()) { setCustomers([]); return }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/customers?search=${customerSearch}&limit=5`)
      setCustomers(data.data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [customerSearch])

  const handleAddToCart = (product, batch) => {
    addItem(product, batch, 1)
    setSearch('')
    setProducts([])
    searchRef.current?.focus()
  }

  const printInvoice = useCallback((sale) => {
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
  }, [settings, user])

  const handleSubmit = async () => {
    if (cartItems.length === 0) return toast.error('Cart is empty')
    
    // Validate: No due for anonymous walk-in customers
    if (!customer?.id && !customerSearch.trim() && due > 0) {
      setSubmitting(false)
      return toast.error('Credit/Due is not allowed for anonymous walk-in customers. Please select a customer or enter a name.')
    }

    setSubmitting(true)
    try {
      const payload = {
        customerId: customer?.id || null,
        customerName: !customer?.id && customerSearch ? customerSearch : null,
        discount,
        paymentMethod,
        paidAmount: paidAmount || (paymentMethod === 'due' ? 0 : total),
        items: cartItems.map(i => ({
          productId: i.productId,
          batchId: i.batchId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0
        }))
      }
      const { data: sale } = await api.post('/sales', payload)
      toast.success(`Sale completed! Invoice: ${sale.invoiceNo}`)
      setLastSale(sale)
      setShowSuccess(true)
      clearCart()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sale failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-3.5rem-3rem)] gap-4 animate-fade-in overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0">
      {/* Left: Product search + grid */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="page-header mb-0">
          <h1 className="page-title">Point of Sale</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              ref={searchRef}
              type="text"
              className="input pl-9 text-sm h-11"
              placeholder="Search by name, generic name, or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 spinner w-4 h-4" />}
        </div>

        {/* Product results */}
        {products.length > 0 && (
          <div className="card p-3 flex-1 overflow-y-auto">
            <div className="text-xs text-[#94a3b8] mb-2 font-medium flex justify-between">
              <span>{products.length} product(s) found</span>
              <span className="text-[10px] text-brand-400">Click to add to cart</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAdd={handleAddToCart} cur={cur} />
              ))}
            </div>
          </div>
        )}

        {search && !searching && products.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[#475569] text-sm">
            <div className="text-center">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>No products found for "{search}"</p>
              <p className="text-[10px] mt-1 italic">Make sure products are in stock and not expired.</p>
            </div>
          </div>
        )}

        {!search && (
          <div className="flex-1 flex items-center justify-center text-[#475569] text-sm">
            <div className="text-center">
              <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
              <p>Search for products to add to cart</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
        {/* Customer selector */}
        <div className="card p-3">
          <div className="text-xs text-[#94a3b8] mb-1.5 font-medium flex items-center gap-1.5">
            <User size={12} /> Customer (Optional)
          </div>
          {customer ? (
            <div className="flex items-center justify-between bg-[#21263a] rounded-lg px-3 py-2">
              <div>
                <div className="text-xs font-medium text-[#e2e8f0]">{customer.name}</div>
                <div className="text-[10px] text-[#94a3b8]">{customer.phone} • Due: {cur}{customer.dueAmount?.toFixed(2)}</div>
              </div>
              <button onClick={() => setCustomer(null)} className="text-[#475569] hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="input-sm w-full"
                placeholder="Search customer..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
              {customers.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 card shadow-modal overflow-hidden">
                  {customers.map(c => (
                    <button key={c.id} onClick={() => { setCustomer(c); setCustomers([]); setCustomerSearch('') }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[#21263a] transition-colors">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[#94a3b8]">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="card flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
              <ShoppingCart size={12} /> Cart ({cartItems.length})
            </div>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#475569] text-xs">
              <ShoppingCart size={24} className="mb-2 opacity-30" />
              Cart is empty
            </div>
          ) : cartItems.map(item => (
            <CartItem
              key={item.batchId}
              item={item}
              onQtyChange={updateQty}
              onPriceChange={updatePrice}
              onRemove={removeItem}
              cur={cur}
            />
          ))}
        </div>

        {/* Totals & checkout */}
        <div className="card p-3 space-y-2">
          <div className="flex justify-between text-xs text-[#94a3b8]">
            <span>Subtotal</span><span>{cur}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#94a3b8]">Discount</span>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
              className="input-sm w-24 text-right" min="0" />
          </div>
          <div className="flex justify-between font-bold text-sm text-white border-t border-[#2a2f45] pt-2">
            <span>Total</span><span>{cur}{total.toFixed(2)}</span>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="select">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Banking</option>
              <option value="due" disabled={!customer && !customerSearch.trim()}>Due {(!customer && !customerSearch.trim()) ? '(Enter Customer Name)' : ''}</option>
            </select>
            {!customer && !customerSearch.trim() && paymentMethod === 'due' && (
              <p className="text-[10px] text-red-400 mt-1 font-medium">Due is only allowed for named or registered customers.</p>
            )}
          </div>
          <div>
            <label className="label">Amount Paid</label>
            <input 
              type="number" 
              value={paidAmount || ''} 
              placeholder={total.toFixed(2)}
              onChange={e => setPaidAmount(e.target.value)} 
              className="input-sm" 
            />
          </div>
          {due > 0 && (
            <div className="flex justify-between text-xs text-red-400 font-bold p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
              <span>Remaining Due</span><span>{cur}{due.toFixed(2)}</span>
            </div>
          )}
          <button
            disabled={cartItems.length === 0 || submitting}
            onClick={handleSubmit}
            className="btn-primary w-full btn-lg mt-1"
          >
            {submitting ? <span className="spinner w-4 h-4" /> : <><Check size={16} /> Complete Sale</>}
          </button>
        </div>
      </div>

      {/* Success modal */}
      {showSuccess && lastSale && (
        <div className="modal-overlay">
          <div className="card p-6 w-80 text-center animate-slide-up">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-400" />
            </div>
            <h3 className="font-bold text-lg text-white mb-1">Sale Complete!</h3>
            <p className="text-[#94a3b8] text-sm mb-1">{lastSale.invoiceNo}</p>
            <p className="text-brand-400 font-bold text-xl mb-4">{cur}{lastSale.totalAmount.toFixed(2)}</p>
            {lastSale.dueAmount > 0 && (
              <p className="text-yellow-400 text-sm mb-4">Due: {cur}{lastSale.dueAmount.toFixed(2)}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowSuccess(false)} className="btn-secondary flex-1">Close</button>
              <button onClick={() => { printInvoice(lastSale); setShowSuccess(false) }} className="btn-primary flex-1">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
