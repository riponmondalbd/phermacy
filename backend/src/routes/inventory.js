const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../utils/prisma');

// GET /api/inventory/stock  — all products with current stock levels
router.get('/stock', authenticate, asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true } },
      batches: {
        where: { quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
        select: { id: true, batchNumber: true, expiryDate: true, quantity: true, purchasePrice: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const data = products.map(p => {
    const totalStock = p.batches.reduce((s, b) => s + b.quantity, 0);
    const now = new Date();
    const soon = new Date(); soon.setDate(now.getDate() + 90);
    const expiredBatches = p.batches.filter(b => new Date(b.expiryDate) < now);
    const expiringBatches = p.batches.filter(b => {
      const d = new Date(b.expiryDate);
      return d >= now && d <= soon;
    });
    return {
      ...p,
      totalStock,
      isLowStock: totalStock <= p.minStockLevel,
      hasExpired: expiredBatches.length > 0,
      hasExpiringSoon: expiringBatches.length > 0,
      stockValue: p.batches.reduce((s, b) => s + (b.quantity * b.purchasePrice), 0)
    };
  });
  res.json(data);
}));

// POST /api/inventory/adjust  — manual stock adjustment
router.post('/adjust', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { productId, batchId, type, quantity, reason, notes } = req.body;
  if (!productId || !quantity || !reason || !type) {
    return res.status(400).json({ error: 'productId, quantity, type, reason are required' });
  }

  const qty = parseInt(quantity);

  const result = await prisma.$transaction(async (tx) => {
    // Record adjustment
    const adjustment = await tx.stockAdjustment.create({
      data: { productId, userId: req.user.id, type, quantity: qty, reason, notes }
    });

    if (type === 'ADD_BATCH') {
      // Create a brand new batch
      const expiryDate = req.body.expiryDate;
      const batchNumber = expiryDate ? expiryDate.replace(/-/g, '') : `B${Date.now()}`;
      
      await tx.batch.create({
        data: {
          productId,
          batchNumber,
          expiryDate: new Date(expiryDate),
          quantity: qty,
          initialQty: qty,
          purchasePrice: parseFloat(req.body.purchasePrice) || 0
        }
      });
    } else if (batchId) {
      // Apply to specific existing batch
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
      const newQty = batch.quantity + qty;
      if (newQty < 0) throw Object.assign(new Error('Stock cannot go below 0'), { status: 400 });
      await tx.batch.update({ where: { id: batchId }, data: { quantity: newQty } });
    }

    return adjustment;
  });

  res.status(201).json(result);
}));

// GET /api/inventory/adjustments
router.get('/adjustments', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [adjustments, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.stockAdjustment.count()
  ]);
  res.json({ data: adjustments, total });
}));

// GET /api/inventory/low-stock
router.get('/low-stock', authenticate, asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({ where: { isActive: true }, include: { batches: true } });
  const low = products
    .map(p => ({ ...p, totalStock: p.batches.reduce((s, b) => s + b.quantity, 0) }))
    .filter(p => p.totalStock <= p.minStockLevel)
    .sort((a, b) => a.totalStock - b.totalStock);
  res.json(low);
}));

// GET /api/inventory/expiry-alerts
router.get('/expiry-alerts', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const soon = new Date(); soon.setDate(now.getDate() + 90);

  const batches = await prisma.batch.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { lte: soon }
    },
    include: { 
      product: { 
        include: { 
          category: { select: { name: true } } 
        } 
      } 
    },
    orderBy: { expiryDate: 'asc' }
  });

  const expired = batches.filter(b => new Date(b.expiryDate) < now);
  const expiringSoon = batches.filter(b => {
    const d = new Date(b.expiryDate);
    return d >= now && d <= soon;
  });

  res.json({ expired, expiringSoon });
}));

module.exports = router;
