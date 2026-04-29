const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../utils/prisma');

// GET /api/customers
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const where = { isActive: true };
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } }
  ];
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where, orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.customer.count({ where })
  ]);
  res.json({ data: customers, total });
}));

// GET /api/customers/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      sales: { orderBy: { saleDate: 'desc' }, take: 10, include: { items: { include: { product: true } } } },
      payments: { orderBy: { paymentDate: 'desc' }, take: 10 }
    }
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
}));

// POST /api/customers
router.post('/', authenticate, auditLog('CREATE', 'Customer'), asyncHandler(async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const customer = await prisma.customer.create({ data: { name, phone, email, address } });
  res.status(201).json(customer);
}));

// PUT /api/customers/:id
router.put('/:id', authenticate, auditLog('UPDATE', 'Customer'), asyncHandler(async (req, res) => {
  const { name, phone, email, address, isActive } = req.body;
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { name, phone, email, address, isActive }
  });
  res.json(customer);
}));

// POST /api/customers/:id/payments
router.post('/:id/payments', authenticate, auditLog('PAYMENT', 'Customer'), asyncHandler(async (req, res) => {
  const { amount, saleId, method, notes } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const ops = [
    prisma.customerPayment.create({
      data: { customerId: req.params.id, saleId, amount: parseFloat(amount), method, notes }
    }),
    prisma.customer.update({
      where: { id: req.params.id },
      data: { dueAmount: { decrement: parseFloat(amount) } }
    })
  ];
  if (saleId) {
    ops.push(prisma.sale.update({
      where: { id: saleId },
      data: { paidAmount: { increment: parseFloat(amount) }, dueAmount: { decrement: parseFloat(amount) } }
    }));
  }
  const [payment] = await prisma.$transaction(ops);
  res.status(201).json(payment);
}));

// GET /api/customers/:id/payments
router.get('/:id/payments', authenticate, asyncHandler(async (req, res) => {
  const payments = await prisma.customerPayment.findMany({
    where: { customerId: req.params.id },
    include: { sale: { select: { invoiceNo: true } } },
    orderBy: { paymentDate: 'desc' }
  });
  res.json(payments);
}));

module.exports = router;
