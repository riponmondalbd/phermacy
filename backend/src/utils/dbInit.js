const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { logger } = require('./logger');
const prisma = require('./prisma');

async function initDb() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      logger.info('🌱 No users found. Seeding initial data...');
      
      // Users
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@system.local';
      const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await prisma.user.create({
        data: { name: 'Admin User', email: adminEmail, password: adminPass, role: 'ADMIN' }
      });
      
      const cashierEmail = process.env.CASHIER_EMAIL || 'cashier@system.local';
      const cashierPass = await bcrypt.hash(process.env.CASHIER_PASSWORD || 'cashier123', 10);
      await prisma.user.create({
        data: { name: 'John Cashier', email: cashierEmail, password: cashierPass, role: 'CASHIER' }
      });

      // Basic Settings
      const defaultSettings = [
        { key: 'shopName', value: 'PharmaCare Pharmacy' },
        { key: 'currency', value: '৳' },
        { key: 'taxRate', value: '0' },
      ];
      
      for (const s of defaultSettings) {
        await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
      }

      logger.info('✅ Initial seed complete!');
    }
  } catch (error) {
    logger.error('❌ Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { initDb };
