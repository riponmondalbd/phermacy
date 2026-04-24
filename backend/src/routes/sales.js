const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// Generate invoice number
const generateInvoiceNo = async () => {
  const today = new Date();
  const prefix = `INV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.sale.count({
    where: { invoiceNo: { startsWith: prefix } }
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

// GET /api/sales
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { from, to, customerId, page = 1, limit = 20 } = req.query;
  const where = {};
  if (customerId) where.customerId = customerId;
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.saleDate.lte = toDate;
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } }
          }
        }
      },
      orderBy: { saleDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.sale.count({ where })
  ]);
  res.json({ data: sales, total });
}));

// GET /api/sales/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: true, batch: true } },
      payments: true
    }
  });
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  res.json(sale);
}));

// POST /api/sales  — FIFO batch deduction, profit calculation
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.batchId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { customerId, items, discount = 0, tax = 0, paidAmount, paymentMethod = 'cash', notes } = req.body;

  // Validate stock availability
  for (const item of items) {
    const batch = await prisma.batch.findUnique({ where: { id: item.batchId } });
    if (!batch) throw Object.assign(new Error(`Batch not found: ${item.batchId}`), { status: 404 });
    if (batch.quantity < item.quantity) {
      throw Object.assign(new Error(`Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantity}`), { status: 400 });
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice;
    return sum + lineTotal - (item.discount || 0);
  }, 0);
  const totalAmount = subtotal - parseFloat(discount) + parseFloat(tax);
  const paid = paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount;
  const due = totalAmount - paid;

  const invoiceNo = await generateInvoiceNo();

  let finalCustomerId = customerId;

  // Auto-create customer if name provided instead of ID
  if (!customerId && req.body.customerName) {
    const newCustomer = await prisma.customer.create({
      data: {
        name: req.body.customerName,
        phone: req.body.customerPhone || '',
        address: req.body.customerAddress || ''
      }
    });
    finalCustomerId = newCustomer.id;
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: finalCustomerId || null,
        userId: req.user.id,
        subtotal,
        discount: parseFloat(discount),
        tax: parseFloat(tax),
        totalAmount,
        paidAmount: paid,
        dueAmount: due,
        paymentMethod,
        notes
      }
    });

    for (const item of items) {
      const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
      const lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
      const profit = lineTotal - (batch.purchasePrice * item.quantity);

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount || 0),
          totalPrice: lineTotal,
          costPrice: batch.purchasePrice,
          profit
        }
      });

      // Deduct from batch
      await tx.batch.update({
        where: { id: item.batchId },
        data: { quantity: { decrement: parseInt(item.quantity) } }
      });
    }

    // Update customer totals & due
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPurchase: { increment: totalAmount },
          dueAmount: { increment: due }
        }
      });
      if (paid > 0) {
        await tx.customerPayment.create({
          data: { customerId, saleId: sale.id, amount: paid, method: paymentMethod }
        });
      }
    }

    return sale;
  });

  const full = await prisma.sale.findUnique({
    where: { id: result.id },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: true, batch: true } }
    }
  });
  res.status(201).json(full);
}));

module.exports = router;
