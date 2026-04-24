const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// GET /api/batches?productId=&expiringSoon=&expired=
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { productId, expiringSoon, expired, page = 1, limit = 50 } = req.query;
  const where = {};
  if (productId) where.productId = productId;

  const now = new Date();
  if (expired === 'true') {
    where.expiryDate = { lt: now };
  } else if (expiringSoon === 'true') {
    const soon = new Date();
    soon.setDate(soon.getDate() + 90);
    where.expiryDate = { gte: now, lte: soon };
  }

  const batches = await prisma.batch.findMany({
    where,
    include: { product: { select: { id: true, name: true, genericName: true, unit: true } } },
    orderBy: { expiryDate: 'asc' },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit)
  });
  const total = await prisma.batch.count({ where });
  res.json({ data: batches, total });
}));

// GET /api/batches/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const batch = await prisma.batch.findUnique({
    where: { id: req.params.id },
    include: { product: true }
  });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
}));

// PUT /api/batches/:id  (only admin can edit batch details)
router.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const { batchNumber, expiryDate, purchasePrice, manufactureDate } = req.body;
  const batch = await prisma.batch.update({
    where: { id: req.params.id },
    data: {
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      manufactureDate: manufactureDate ? new Date(manufactureDate) : undefined
    }
  });
  res.json(batch);
}));

module.exports = router;
