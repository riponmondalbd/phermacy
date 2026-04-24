const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

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

// POST /api/purchases  — creates purchase + batches + updates supplier due
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), [
  body('supplierId').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.purchasePrice').isFloat({ min: 0 }),
  body('items.*.batchNumber').notEmpty(),
  body('items.*.expiryDate').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { supplierId, invoiceNo, purchaseDate, items, discount = 0, paidAmount = 0, notes } = req.body;

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0) - parseFloat(discount);
  const dueAmount = totalAmount - parseFloat(paidAmount);

  const result = await prisma.$transaction(async (tx) => {
    // Create purchase
    const purchase = await tx.purchase.create({
      data: {
        supplierId,
        invoiceNo,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        totalAmount,
        paidAmount: parseFloat(paidAmount),
        dueAmount,
        discount: parseFloat(discount),
        notes
      }
    });

    // Create batches & purchase items
    for (const item of items) {
      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          batchNumber: item.batchNumber,
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

    // Update supplier due
    await tx.supplier.update({
      where: { id: supplierId },
      data: { dueAmount: { increment: dueAmount } }
    });

    // Record payment if paidAmount > 0
    if (parseFloat(paidAmount) > 0) {
      await tx.supplierPayment.create({
        data: { supplierId, purchaseId: purchase.id, amount: parseFloat(paidAmount), method: req.body.paymentMethod || 'cash' }
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

  await prisma.$transaction([
    // Remove batches created by this purchase
    ...purchase.items.map(item => prisma.batch.delete({ where: { id: item.batchId } })),
    // Restore supplier due
    prisma.supplier.update({ where: { id: purchase.supplierId }, data: { dueAmount: { decrement: purchase.dueAmount } } }),
    prisma.purchase.delete({ where: { id: req.params.id } })
  ]);
  res.json({ message: 'Purchase deleted and stock reversed' });
}));

module.exports = router;
