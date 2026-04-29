const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../utils/prisma');

// GET /api/suppliers
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const where = { isActive: true };
  if (search) where.OR = [
    { name: { contains: search } },
    { phone: { contains: search } },
    { email: { contains: search } }
  ];

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where, orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.supplier.count({ where })
  ]);
  res.json({ data: suppliers, total });
}));

// GET /api/suppliers/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      purchases: { orderBy: { purchaseDate: 'desc' }, take: 10 },
      payments: { orderBy: { paymentDate: 'desc' }, take: 10 }
    }
  });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  res.json(supplier);
}));

// POST /api/suppliers
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('CREATE', 'Supplier'), [
  body('name').notEmpty().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, contactName, phone, email, address } = req.body;
  const supplier = await prisma.supplier.create({ data: { name, contactName, phone, email, address } });
  res.status(201).json(supplier);
}));

// PUT /api/suppliers/:id
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), auditLog('UPDATE', 'Supplier'), asyncHandler(async (req, res) => {
  const { name, contactName, phone, email, address, isActive } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { name, contactName, phone, email, address, isActive }
  });
  res.json(supplier);
}));

// POST /api/suppliers/:id/payments
router.post('/:id/payments', authenticate, auditLog('PAYMENT', 'Supplier'), asyncHandler(async (req, res) => {
  const { amount, purchaseId, method, notes } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const [payment] = await prisma.$transaction([
    prisma.supplierPayment.create({
      data: { supplierId: req.params.id, purchaseId, amount: parseFloat(amount), method, notes }
    }),
    prisma.supplier.update({
      where: { id: req.params.id },
      data: { dueAmount: { decrement: parseFloat(amount) } }
    }),
    ...(purchaseId ? [prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: { increment: parseFloat(amount) },
        dueAmount: { decrement: parseFloat(amount) }
      }
    })] : [])
  ]);
  res.status(201).json(payment);
}));

// GET /api/suppliers/:id/ledger
router.get('/:id/ledger', authenticate, asyncHandler(async (req, res) => {
  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: { supplierId: req.params.id },
      orderBy: { purchaseDate: 'desc' },
      include: { items: { include: { product: true } } }
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: req.params.id },
      orderBy: { paymentDate: 'desc' }
    })
  ]);
  res.json({ purchases, payments });
}));

module.exports = router;
