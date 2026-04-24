import { create } from 'zustand'

export const usePOSStore = create((set, get) => ({
  cartItems: [],
  customer: null,
  discount: 0,
  paymentMethod: 'cash',
  paidAmount: 0,

  setCustomer: (customer) => set({ customer }),
  setDiscount: (discount) => set({ discount: parseFloat(discount) || 0 }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaidAmount: (paidAmount) => set({ paidAmount: parseFloat(paidAmount) || 0 }),

  addItem: (product, batch, quantity = 1) => {
    const items = get().cartItems
    const existing = items.find(i => i.batchId === batch.id)
    if (existing) {
      const maxQty = batch.quantity
      const newQty = Math.min(existing.quantity + quantity, maxQty)
      set({ cartItems: items.map(i => i.batchId === batch.id ? { ...i, quantity: newQty } : i) })
    } else {
      set({
        cartItems: [...items, {
          productId: product.id,
          productName: product.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          unitPrice: product.salePrice,
          costPrice: batch.purchasePrice,
          quantity,
          maxQty: batch.quantity,
          discount: 0,
          unit: product.unit
        }]
      })
    }
  },

  updateQty: (batchId, quantity) => {
    const items = get().cartItems
    const item = items.find(i => i.batchId === batchId)
    if (!item) return
    const qty = Math.min(Math.max(1, parseInt(quantity) || 1), item.maxQty)
    set({ cartItems: items.map(i => i.batchId === batchId ? { ...i, quantity: qty } : i) })
  },

  updatePrice: (batchId, unitPrice) => {
    set({ cartItems: get().cartItems.map(i => i.batchId === batchId ? { ...i, unitPrice: parseFloat(unitPrice) || 0 } : i) })
  },

  updateItemDiscount: (batchId, discount) => {
    set({ cartItems: get().cartItems.map(i => i.batchId === batchId ? { ...i, discount: parseFloat(discount) || 0 } : i) })
  },

  removeItem: (batchId) => set({ cartItems: get().cartItems.filter(i => i.batchId !== batchId) }),

  clearCart: () => set({ cartItems: [], customer: null, discount: 0, paidAmount: 0 }),

  getSubtotal: () => get().cartItems.reduce((s, i) => s + (i.quantity * i.unitPrice) - i.discount, 0),
  getTotal: () => Math.max(0, get().getSubtotal() - (get().discount || 0)),
  getDue: () => {
    const total = get().getTotal()
    const paid = get().paidAmount
    return Math.max(0, total - paid)
  },
}))
