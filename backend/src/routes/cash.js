const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// GET /api/cash/sessions
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [sessions, total] = await Promise.all([
    prisma.cashSession.findMany({
      include: {
        user: { select: { name: true } },
        expenses: true
      },
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.cashSession.count()
  ]);
  res.json({ data: sessions, total });
}));

// GET /api/cash/sessions/active
router.get('/sessions/active', authenticate, asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const session = await prisma.cashSession.findFirst({
    where: { date: { gte: today }, isClosed: false },
    include: { expenses: true, user: { select: { name: true } } }
  });

  if (session) {
    const salesAgg = await prisma.sale.aggregate({
      where: { saleDate: { gte: today, lt: tomorrow }, paymentMethod: 'cash' },
      _sum: { paidAmount: true }
    });
    session.totalSales = salesAgg._sum.paidAmount || 0;
    session.totalExpenses = session.expenses.reduce((s, e) => s + e.amount, 0);
  }

  res.json(session || null);
}));

// POST /api/cash/sessions/open
router.post('/sessions/open', authenticate, asyncHandler(async (req, res) => {
  const { openingCash, notes } = req.body;
  const today = new Date(); today.setHours(0,0,0,0);
  const existing = await prisma.cashSession.findFirst({ where: { date: { gte: today }, isClosed: false } });
  if (existing) return res.status(400).json({ error: 'Cash session already open for today' });

  const session = await prisma.cashSession.create({
    data: { userId: req.user.id, openingCash: parseFloat(openingCash || 0), notes }
  });
  res.status(201).json(session);
}));

// POST /api/cash/sessions/:id/close
router.post('/sessions/:id/close', authenticate, asyncHandler(async (req, res) => {
  const { closingCash, notes } = req.body;
  const session = await prisma.cashSession.findUnique({
    where: { id: req.params.id },
    include: { expenses: true }
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.isClosed) return res.status(400).json({ error: 'Session already closed' });

  // Calculate today's sales
  const today = new Date(session.date); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const salesAgg = await prisma.sale.aggregate({
    where: { saleDate: { gte: today, lt: tomorrow }, paymentMethod: 'cash' },
    _sum: { paidAmount: true }
  });
  const totalSales = salesAgg._sum.paidAmount || 0;
  const totalExpenses = session.expenses.reduce((s, e) => s + e.amount, 0);

  const closed = await prisma.cashSession.update({
    where: { id: req.params.id },
    data: { isClosed: true, closingCash: parseFloat(closingCash || 0), totalSales, totalExpenses, notes }
  });
  res.json(closed);
}));

// POST /api/cash/expenses
router.post('/expenses', authenticate, asyncHandler(async (req, res) => {
  const { cashSessionId, category, amount, description } = req.body;
  if (!category || !amount) return res.status(400).json({ error: 'category and amount required' });

  const expense = await prisma.expense.create({
    data: {
      cashSessionId,
      userId: req.user.id,
      category,
      amount: parseFloat(amount),
      description
    }
  });
  res.status(201).json(expense);
}));

// GET /api/cash/expenses
router.get('/expenses', authenticate, asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 20 } = req.query;
  const where = {};
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.expenseDate.lte = t; }
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { expenseDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.expense.count({ where })
  ]);
  res.json({ data: expenses, total });
}));

module.exports = router;
