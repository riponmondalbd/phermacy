const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// POST /api/returns/customer  — customer return, restores batch stock
router.post('/customer', authenticate, asyncHandler(async (req, res) => {
  const { saleId, items, refundMethod = 'cash', reason, notes } = req.body;
  if (!saleId || !items || items.length === 0) {
    return res.status(400).json({ error: 'saleId and items required' });
  }

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

  const result = await prisma.$transaction(async (tx) => {
    const ret = await tx.return.create({
      data: {
        saleId,
        customerId: sale.customerId,
        totalAmount,
        refundMethod,
        reason,
        notes
      }
    });

    for (const item of items) {
      await tx.returnItem.create({
        data: {
          returnId: ret.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseInt(item.quantity) * parseFloat(item.unitPrice)
        }
      });

      // Restore batch stock
      await tx.batch.update({
        where: { id: item.batchId },
        data: { quantity: { increment: parseInt(item.quantity) } }
      });
    }

    // Update sale status
    const fullReturn = totalAmount >= sale.totalAmount;
    await tx.sale.update({
      where: { id: saleId },
      data: { status: fullReturn ? 'FULLY_RETURNED' : 'PARTIAL_RETURN' }
    });

    // Update customer due if refund
    if (sale.customerId && refundMethod === 'cash') {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { dueAmount: { decrement: Math.min(totalAmount, sale.dueAmount) } }
      });
    }

    return ret;
  });

  res.status(201).json(result);
}));

// GET /api/returns/customer
router.get('/customer', authenticate, asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 20 } = req.query;
  const where = {};
  if (from || to) {
    where.returnDate = {};
    if (from) where.returnDate.gte = new Date(from);
    if (to) where.returnDate.lte = new Date(to);
  }
  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        sale: { select: { invoiceNo: true } },
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } }
      },
      orderBy: { returnDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.return.count({ where })
  ]);
  res.json({ data: returns, total });
}));

// POST /api/returns/supplier
router.post('/supplier', authenticate, asyncHandler(async (req, res) => {
  const { supplierId, totalAmount, reason, notes } = req.body;
  const ret = await prisma.supplierReturn.create({
    data: { supplierId, totalAmount: parseFloat(totalAmount), reason, notes }
  });
  res.status(201).json(ret);
}));

module.exports = router;
