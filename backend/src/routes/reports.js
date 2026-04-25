const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = require('../utils/prisma');

// GET /api/reports/sales?from=&to=
router.get('/sales', authenticate, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.saleDate.lte = t; }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { 
      items: true, 
      returns: { include: { items: true } },
      customer: { select: { name: true } }, 
      user: { select: { name: true } } 
    },
    orderBy: { saleDate: 'asc' }
  });

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalProfit = sales.reduce((s, sale) => {
    const grossProfit = sale.items.reduce((sp, item) => sp + item.profit, 0);
    const returnLoss = sale.returns.reduce((rp, ret) => 
      rp + ret.items.reduce((rip, ri) => {
        // Find corresponding sale item to get cost price
        const saleItem = sale.items.find(si => si.batchId === ri.batchId && si.productId === ri.productId);
        const costPrice = saleItem ? saleItem.costPrice : 0;
        return rip + (ri.totalPrice - (costPrice * ri.quantity));
      }, 0), 0);
    return s + (grossProfit - returnLoss);
  }, 0);
  const totalDiscount = sales.reduce((s, sale) => s + sale.discount, 0);
  const totalDue = sales.reduce((s, sale) => s + sale.dueAmount, 0);

  // Daily breakdown
  const dailyMap = {};
  for (const sale of sales) {
    const day = new Date(sale.saleDate).toISOString().split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, profit: 0, count: 0 };
    dailyMap[day].revenue += sale.totalAmount;
    
    const grossProfit = sale.items.reduce((sp, item) => sp + item.profit, 0);
    const returnLoss = sale.returns.reduce((rp, ret) => 
      rp + ret.items.reduce((rip, ri) => {
        const saleItem = sale.items.find(si => si.batchId === ri.batchId && si.productId === ri.productId);
        const costPrice = saleItem ? saleItem.costPrice : 0;
        return rip + (ri.totalPrice - (costPrice * ri.quantity));
      }, 0), 0);
    
    dailyMap[day].profit += (grossProfit - returnLoss);
    dailyMap[day].count += 1;
  }

  res.json({
    summary: { totalRevenue, totalProfit, totalDiscount, totalDue, salesCount: sales.length },
    daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    sales
  });
}));

// GET /api/reports/profit?from=&to=
router.get('/profit', authenticate, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.saleDate.lte = t; }
  }

  const saleItems = await prisma.saleItem.findMany({
    where: { sale: where },
    include: {
      product: { select: { id: true, name: true, category: { select: { name: true } } } },
      sale: { select: { saleDate: true } }
    }
  });

  const productProfit = {};
  for (const item of saleItems) {
    const id = item.productId;
    if (!productProfit[id]) productProfit[id] = {
      productId: id, productName: item.product.name,
      category: item.product.category?.name,
      revenue: 0, cost: 0, profit: 0, quantity: 0
    };
    productProfit[id].revenue += item.totalPrice;
    productProfit[id].cost += item.costPrice * item.quantity;
    productProfit[id].profit += item.profit;
    productProfit[id].quantity += item.quantity;
  }

  const sorted = Object.values(productProfit).sort((a, b) => b.profit - a.profit);
  const totalProfit = sorted.reduce((s, p) => s + p.profit, 0);
  const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
  const totalCost = sorted.reduce((s, p) => s + p.cost, 0);

  res.json({ summary: { totalRevenue, totalCost, totalProfit }, products: sorted });
}));

// GET /api/reports/purchases?from=&to=
router.get('/purchases', authenticate, asyncHandler(async (req, res) => {
  const { from, to, supplierId } = req.query;
  const where = {};
  if (supplierId) where.supplierId = supplierId;
  if (from || to) {
    where.purchaseDate = {};
    if (from) where.purchaseDate.gte = new Date(from);
    if (to) { const t = new Date(to); t.setHours(23,59,59,999); where.purchaseDate.lte = t; }
  }

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: { select: { name: true } }, items: true },
    orderBy: { purchaseDate: 'desc' }
  });

  const totalAmount = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalDue = purchases.reduce((s, p) => s + p.dueAmount, 0);

  res.json({ summary: { totalAmount, totalPaid, totalDue, count: purchases.length }, purchases });
}));

// GET /api/reports/dashboard-summary
router.get('/dashboard-summary', authenticate, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [todaySales, monthSales, totalProducts, lowStockCount, expiringCount, totalDue] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: today, lt: tomorrow } }, _sum: { totalAmount: true, dueAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { saleDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } }, _sum: { totalAmount: true }, _count: true }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({ where: { isActive: true }, include: { batches: true } }).then(ps =>
      ps.filter(p => p.batches.reduce((s, b) => s + b.quantity, 0) <= p.minStockLevel).length),
    prisma.batch.count({ where: { quantity: { gt: 0 }, expiryDate: { lte: new Date(Date.now() + 90*24*60*60*1000) } } }),
    prisma.customer.aggregate({ _sum: { dueAmount: true } })
  ]);

  res.json({
    todayRevenue: todaySales._sum.totalAmount || 0,
    todaySalesCount: todaySales._count || 0,
    monthRevenue: monthSales._sum.totalAmount || 0,
    totalProducts,
    lowStockCount,
    expiringCount,
    totalCustomerDue: totalDue._sum.dueAmount || 0
  });
}));

// GET /api/reports/audit-logs
router.get('/audit-logs', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, entity } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.auditLog.count({ where })
  ]);
  res.json({ data: logs, total });
}));

module.exports = router;
