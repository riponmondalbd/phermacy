const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// GET /api/products?search=&categoryId=&lowStock=&page=&limit=
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, categoryId, lowStock, page = 1, limit = 50, isActive } = req.query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  else where.isActive = true;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { genericName: { contains: search } },
      { barcode: { contains: search } }
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, batchNumber: true, expiryDate: true, quantity: true, purchasePrice: true }
        }
      },
      orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.product.count({ where })
  ]);

  // Compute total stock per product
  const enriched = products.map(p => ({
    ...p,
    totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0),
    isLowStock: p.batches.reduce((sum, b) => sum + b.quantity, 0) <= p.minStockLevel
  }));

  if (lowStock === 'true') {
    return res.json({ data: enriched.filter(p => p.isLowStock), total, page: parseInt(page), limit: parseInt(limit) });
  }

  res.json({ data: enriched, total, page: parseInt(page), limit: parseInt(limit) });
}));

// GET /api/products/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      batches: { orderBy: { expiryDate: 'asc' } }
    }
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

// GET /api/products/search/pos  – lightweight for POS
router.get('/search/pos', authenticate, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { genericName: { contains: q } },
        { barcode: q }
      ]
    },
    include: {
      batches: {
        where: { quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
        orderBy: { expiryDate: 'asc' }
      }
    },
    take: 20
  });

  const results = products.map(p => ({
    ...p,
    totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0)
  })).filter(p => p.totalStock > 0);

  res.json(results);
}));

// POST /api/products
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), [
  body('name').notEmpty().trim(),
  body('salePrice').isFloat({ min: 0 }),
  body('unit').isIn(['piece', 'strip', 'box'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, genericName, barcode, categoryId, unit, piecesPerStrip, stripsPerBox,
    salePrice, minStockLevel, description, requiresPrescription } = req.body;

  const product = await prisma.product.create({
    data: {
      name, genericName, barcode, categoryId, unit,
      piecesPerStrip: parseInt(piecesPerStrip) || 1,
      stripsPerBox: parseInt(stripsPerBox) || 1,
      salePrice: parseFloat(salePrice),
      minStockLevel: parseInt(minStockLevel) || 10,
      description, requiresPrescription: !!requiresPrescription
    },
    include: { category: true }
  });
  res.status(201).json(product);
}));

// PUT /api/products/:id
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { name, genericName, barcode, categoryId, unit, piecesPerStrip, stripsPerBox,
    salePrice, minStockLevel, description, requiresPrescription, isActive } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name, genericName, barcode, categoryId, unit,
      piecesPerStrip: piecesPerStrip ? parseInt(piecesPerStrip) : undefined,
      stripsPerBox: stripsPerBox ? parseInt(stripsPerBox) : undefined,
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : undefined,
      description, requiresPrescription, isActive
    },
    include: { category: true }
  });
  res.json(product);
}));

// DELETE /api/products/:id
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Product deactivated' });
}));

module.exports = router;
