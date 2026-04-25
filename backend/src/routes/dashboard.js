const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const soon = new Date(); soon.setDate(soon.getDate() + 90);

  const [
    todaySales, monthSales, todayPurchases,
    totalProducts, lowStockProducts, expiringBatches, expiredBatches,
    totalCustomerDue, totalSupplierDue,
    recentSales, topProducts
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: today, lt: tomorrow } }, _sum: { totalAmount: true, dueAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { saleDate: { gte: monthStart } }, _sum: { totalAmount: true }, _count: true }),
    prisma.purchase.aggregate({ where: { purchaseDate: { gte: today, lt: tomorrow } }, _sum: { totalAmount: true }, _count: true }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({ where: { isActive: true }, include: { batches: { where: { quantity: { gt: 0 } } } } })
      .then(ps => ps.filter(p => p.batches.reduce((s,b) => s+b.quantity,0) <= p.minStockLevel).length),
    prisma.batch.count({ where: { quantity: { gt: 0 }, expiryDate: { gte: today, lte: soon } } }),
    prisma.batch.count({ where: { quantity: { gt: 0 }, expiryDate: { lt: today } } }),
    prisma.customer.aggregate({ _sum: { dueAmount: true } }),
    prisma.supplier.aggregate({ _sum: { dueAmount: true } }),
    prisma.sale.findMany({
      take: 5, orderBy: { saleDate: 'desc' },
      include: { customer: { select: { name: true } }, user: { select: { name: true } } }
    }),
    prisma.saleItem.groupBy({
      by: ['productId'], 
      _sum: { quantity: true, profit: true },
      orderBy: { _sum: { quantity: 'desc' } }, 
      take: 5
    }).then(async tops => {
      // Subtract returns for these top products
      const enriched = await Promise.all(tops.map(async t => {
        const returns = await prisma.returnItem.aggregate({
          where: { productId: t.productId },
          _sum: { quantity: true, totalPrice: true }
        });
        
        const retQty = returns._sum.quantity || 0;
        const retTotal = returns._sum.totalPrice || 0;
        
        // Find cost price to calculate lost profit from returns
        const saleItem = await prisma.saleItem.findFirst({ where: { productId: t.productId }, select: { costPrice: true } });
        const costPrice = saleItem?.costPrice || 0;
        const lostProfit = retTotal - (costPrice * retQty);

        return {
          ...t,
          _sum: {
            quantity: t._sum.quantity - retQty,
            profit: t._sum.profit - lostProfit
          }
        };
      }));
      return enriched;
    })
  ]);

  // Enrich top products with names
  const productIds = topProducts.map(t => t.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } }, select: { id: true, name: true }
  });
  const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));

  // Last 7 days chart data
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
    const d2 = new Date(d); d2.setDate(d2.getDate() + 1);
    const agg = await prisma.sale.aggregate({
      where: { saleDate: { gte: d, lt: d2 } },
      _sum: { totalAmount: true }
    });
    last7.push({ date: d.toISOString().split('T')[0], revenue: agg._sum.totalAmount || 0 });
  }

  res.json({
    today: {
      revenue: todaySales._sum.totalAmount || 0,
      due: todaySales._sum.dueAmount || 0,
      salesCount: todaySales._count || 0,
      purchaseAmount: todayPurchases._sum.totalAmount || 0
    },
    month: { revenue: monthSales._sum.totalAmount || 0, salesCount: monthSales._count || 0 },
    inventory: { totalProducts, lowStockCount: lowStockProducts, expiringCount: expiringBatches, expiredCount: expiredBatches },
    dues: { customer: totalCustomerDue._sum.dueAmount || 0, supplier: totalSupplierDue._sum.dueAmount || 0 },
    recentSales,
    topProducts: topProducts.map(t => ({
      productId: t.productId,
      name: nameMap[t.productId] || 'Unknown',
      quantity: t._sum.quantity,
      profit: t._sum.profit
    })),
    salesChart: last7
  });
}));

module.exports = router;
