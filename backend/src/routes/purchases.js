const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../utils/prisma');

// GET /api/purchases
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { supplierId, from, to, page = 1, limit = 20 } = req.query;
  const where = {};
  if (supplierId) where.supplierId = supplierId;
  if (from || to) {
    where.purchaseDate = {};
    if (from) where.purchaseDate.gte = new Date(from);
    if (to) where.purchaseDate.lte = new Date(to);
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true } }, batch: true } }
      },
      orderBy: { purchaseDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.purchase.count({ where })
  ]);
  res.json({ data: purchases, total });
}));

// GET /api/purchases/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      items: { include: { product: true, batch: true } },
      payments: true
    }
  });
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  res.json(purchase);
}));

// POST /api/purchases — Dynamic creation of suppliers/products
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('CREATE', 'Purchase'), asyncHandler(async (req, res) => {
  const { 
    supplierId, // could be UUID or name string
    invoiceNo, 
    purchaseDate, 
    items, 
    discount = 0, 
    paidAmount = 0, 
    notes,
    paymentMethod = 'cash'
  } = req.body;

  if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Resolve Supplier
    let finalSupplierId = supplierId;
    const isSupplierUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId);
    
    if (!isSupplierUUID) {
      // Find by name or create
      const supplier = await tx.supplier.findFirst({ where: { name: { equals: supplierId } } });
      if (supplier) {
        finalSupplierId = supplier.id;
      } else {
        const newSupplier = await tx.supplier.create({ data: { name: supplierId } });
        finalSupplierId = newSupplier.id;
      }
    }

    // 2. Resolve Items and Products
    const processedItems = [];
    for (const item of items) {
      let finalProductId = item.productId;
      const isProductUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
      
      // Resolve Category if provided
      let finalCategoryId = null;
      if (item.category) {
        const isCatUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.category);
        if (isCatUUID) {
          finalCategoryId = item.category;
        } else {
          const category = await tx.category.findFirst({ where: { name: { equals: item.category } } });
          if (category) {
            finalCategoryId = category.id;
          } else {
            const newCat = await tx.category.create({ data: { name: item.category } });
            finalCategoryId = newCat.id;
          }
        }
      }

      if (!isProductUUID) {
        // Find by name or create
        let product = await tx.product.findFirst({ where: { name: { equals: item.productId } } });
        if (product) {
          finalProductId = product.id;
          // Update product info if provided (unit, genericName, sellingPrice, category)
          await tx.product.update({
            where: { id: product.id },
            data: {
              genericName: item.genericName || product.genericName,
              unit: item.unit || product.unit,
              salePrice: item.sellingPrice ? parseFloat(item.sellingPrice) : product.salePrice,
              categoryId: finalCategoryId || product.categoryId
            }
          });
        } else {
          // Create new product
          const newProd = await tx.product.create({
            data: {
              name: item.productId,
              genericName: item.genericName || '',
              unit: item.unit || 'piece',
              salePrice: item.sellingPrice ? parseFloat(item.sellingPrice) : 0,
              categoryId: finalCategoryId,
              barcode: `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              minStockLevel: 10
            }
          });
          finalProductId = newProd.id;
        }
      } else {
        // Even for existing products, update details
        await tx.product.update({
          where: { id: finalProductId },
          data: {
            genericName: item.genericName,
            unit: item.unit,
            salePrice: item.sellingPrice ? parseFloat(item.sellingPrice) : undefined,
            categoryId: finalCategoryId || undefined
          }
        });
      }

      processedItems.push({ ...item, productId: finalProductId });
    }

    // 3. Calculate Totals
    const totalAmount = processedItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0) - parseFloat(discount);
    const dueAmount = totalAmount - parseFloat(paidAmount);

    // 4. Create Purchase Record
    const purchase = await tx.purchase.create({
      data: {
        supplierId: finalSupplierId,
        invoiceNo,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        totalAmount,
        paidAmount: parseFloat(paidAmount),
        dueAmount,
        discount: parseFloat(discount),
        notes
      }
    });

    // 5. Create Batches & Purchase Items
    for (const item of processedItems) {
      // Auto-generate batch number if missing or as per rule
      const batchNo = item.batchNumber || `BN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          batchNumber: batchNo,
          expiryDate: new Date(item.expiryDate),
          purchasePrice: parseFloat(item.purchasePrice),
          quantity: parseInt(item.quantity),
          initialQty: parseInt(item.quantity),
          manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null
        }
      });

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          batchId: batch.id,
          quantity: parseInt(item.quantity),
          purchasePrice: parseFloat(item.purchasePrice),
          totalCost: parseInt(item.quantity) * parseFloat(item.purchasePrice)
        }
      });
    }

    // 6. Update Supplier Balance
    await tx.supplier.update({
      where: { id: finalSupplierId },
      data: { dueAmount: { increment: dueAmount } }
    });

    // 7. Record Payment
    if (parseFloat(paidAmount) > 0) {
      await tx.supplierPayment.create({
        data: { supplierId: finalSupplierId, purchaseId: purchase.id, amount: parseFloat(paidAmount), method: paymentMethod }
      });
    }

    return purchase;
  });

  const full = await prisma.purchase.findUnique({
    where: { id: result.id },
    include: { supplier: true, items: { include: { product: true, batch: true } } }
  });
  res.status(201).json(full);
}));

// DELETE /api/purchases/:id  (admin only — reverses stock)
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { batch: true } } }
  });
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  // Check if any batch from this purchase has been sold
  const usedBatches = purchase.items.filter(item => item.batch.quantity < item.batch.initialQty);
  if (usedBatches.length > 0) {
    return res.status(400).json({ 
      error: `Cannot delete purchase. ${usedBatches.length} items have already been sold from these batches.` 
    });
  }

  await prisma.$transaction([
    // Remove batches created by this purchase
    ...purchase.items.map(item => prisma.batch.delete({ where: { id: item.batchId } })),
    // Restore supplier due
    prisma.supplier.update({ where: { id: purchase.supplierId }, data: { dueAmount: { decrement: purchase.dueAmount } } }),
    prisma.purchase.delete({ where: { id: req.params.id } })
  ]);
  res.json({ message: 'Purchase deleted and stock reversed' });
}));

// PUT /api/purchases/:id (manager only)
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { supplierId, invoiceNo, purchaseDate, discount = 0, paidAmount = 0, notes } = req.body;
  const purchaseId = req.params.id;

  const existing = await prisma.purchase.findUnique({ 
    where: { id: purchaseId },
    include: { items: true }
  });
  if (!existing) return res.status(404).json({ error: 'Purchase not found' });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Calculate new totals
    // Note: In this simplified edit, we only allow editing metadata and paidAmount
    // We don't recalculate based on items because we assume items are unchanged or handled separately
    const totalAmount = existing.totalAmount; 
    const newPaidAmount = parseFloat(paidAmount);
    const newDueAmount = totalAmount - newPaidAmount;
    const dueDifference = newDueAmount - existing.dueAmount;

    // 2. Update Purchase
    const updated = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        supplierId,
        invoiceNo,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        discount: parseFloat(discount),
        notes
      }
    });

    // 3. Update Supplier Balance if due changed
    if (dueDifference !== 0) {
      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { dueAmount: { increment: dueDifference } }
      });
    }

    return updated;
  });

  res.json(result);
}));

module.exports = router;
