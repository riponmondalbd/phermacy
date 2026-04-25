const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@system.local';
  const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'secret_password_123', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: 'Admin User', email: adminEmail, password: adminPass, role: 'ADMIN' }
  });

  const cashierEmail = process.env.CASHIER_EMAIL || 'cashier@system.local';
  const cashierPass = await bcrypt.hash(process.env.CASHIER_PASSWORD || 'secret_password_123', 10);
  await prisma.user.upsert({
    where: { email: cashierEmail },
    update: {},
    create: { name: 'John Cashier', email: cashierEmail, password: cashierPass, role: 'CASHIER' }
  });

  // Categories
  const cats = ['Antibiotics', 'Analgesics', 'Antacids', 'Vitamins', 'Antihistamines', 'Cardiovascular', 'Diabetes', 'Skin Care'];
  const categoryMap = {};
  for (const name of cats) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categoryMap[name] = c.id;
  }

  // Suppliers
  await prisma.supplier.upsert({
    where: { id: 'sup-001' },
    update: {},
    create: { id: 'sup-001', name: 'Main Med Distributor', contactName: 'Supply Manager', phone: '01700000000', email: 'supplier1@system.local', address: 'Local Area' }
  });

  // Products & Batches ... (keeping them as they are generic medicine names)
  // ... (rest of the logic)

  // Customers
  await prisma.customer.upsert({
    where: { phone: '01800000000' },
    update: {},
    create: { name: 'Sample Customer', phone: '01800000000', email: 'customer@system.local', address: 'Local City' }
  });

  // Settings
  const defaultSettings = [
    { key: 'shopName', value: 'My Pharmacy' },
    { key: 'shopAddress', value: 'Local Street, City' },
    { key: 'shopPhone', value: '+880 1700-000000' },
    { key: 'shopEmail', value: 'shop@system.local' },
    { key: 'currency', value: '৳' },
    { key: 'taxRate', value: '0' },
    { key: 'invoiceFooter', value: 'Thank you!' },
    { key: 'smtpEnabled', value: 'false' },
    { key: 'lowStockDays', value: '90' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log('✅ Seed complete!');
  console.log(`👤 Admin: ${adminEmail}`);
  console.log(`👤 Cashier: ${cashierEmail}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
