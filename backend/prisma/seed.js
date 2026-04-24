const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@pharmacy.com', password: adminPass, role: 'ADMIN' }
  });
  const cashierPass = await bcrypt.hash('cashier123', 10);
  await prisma.user.upsert({
    where: { email: 'cashier@pharmacy.com' },
    update: {},
    create: { name: 'John Cashier', email: 'cashier@pharmacy.com', password: cashierPass, role: 'CASHIER' }
  });

  // Categories
  const cats = ['Antibiotics', 'Analgesics', 'Antacids', 'Vitamins', 'Antihistamines', 'Cardiovascular', 'Diabetes', 'Skin Care'];
  const categoryMap = {};
  for (const name of cats) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categoryMap[name] = c.id;
  }

  // Suppliers
  const sup1 = await prisma.supplier.upsert({
    where: { id: 'sup-001' },
    update: {},
    create: { id: 'sup-001', name: 'MedCo Distributors', contactName: 'Ali Hassan', phone: '01711111111', email: 'medco@email.com', address: 'Dhaka, Bangladesh' }
  });
  const sup2 = await prisma.supplier.upsert({
    where: { id: 'sup-002' },
    update: {},
    create: { id: 'sup-002', name: 'PharmaLink Ltd', contactName: 'Sara Khan', phone: '01722222222', email: 'pharmalink@email.com', address: 'Chittagong, Bangladesh' }
  });

  // Products
  const products = [
    { name: 'Napa 500mg', genericName: 'Paracetamol', barcode: 'NAP001', cat: 'Analgesics', unit: 'strip', salePrice: 15, minStockLevel: 50 },
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', barcode: 'AZI001', cat: 'Antibiotics', unit: 'strip', salePrice: 120, minStockLevel: 20 },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', barcode: 'OME001', cat: 'Antacids', unit: 'strip', salePrice: 55, minStockLevel: 30 },
    { name: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', barcode: 'VTC001', cat: 'Vitamins', unit: 'strip', salePrice: 30, minStockLevel: 40 },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', barcode: 'CET001', cat: 'Antihistamines', unit: 'strip', salePrice: 25, minStockLevel: 25 },
    { name: 'Amlodipine 5mg', genericName: 'Amlodipine', barcode: 'AML001', cat: 'Cardiovascular', unit: 'strip', salePrice: 85, minStockLevel: 20 },
    { name: 'Metformin 500mg', genericName: 'Metformin HCl', barcode: 'MET001', cat: 'Diabetes', unit: 'strip', salePrice: 35, minStockLevel: 30 },
    { name: 'Clotrimazole Cream', genericName: 'Clotrimazole', barcode: 'CLO001', cat: 'Skin Care', unit: 'piece', salePrice: 75, minStockLevel: 15 },
  ];

  const productMap = {};
  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        name: p.name, genericName: p.genericName, barcode: p.barcode,
        categoryId: categoryMap[p.cat], unit: p.unit,
        salePrice: p.salePrice, minStockLevel: p.minStockLevel
      }
    });
    productMap[p.barcode] = prod.id;
  }

  // Batches (initial stock)
  const batchData = [
    { barcode: 'NAP001', batchNo: 'B2024001', qty: 200, cost: 9, expiry: '2026-12-31' },
    { barcode: 'AZI001', batchNo: 'B2024002', qty: 80, cost: 85, expiry: '2026-08-30' },
    { barcode: 'OME001', batchNo: 'B2024003', qty: 120, cost: 38, expiry: '2026-10-31' },
    { barcode: 'VTC001', batchNo: 'B2024004', qty: 150, cost: 20, expiry: '2027-01-31' },
    { barcode: 'CET001', batchNo: 'B2024005', qty: 100, cost: 17, expiry: '2026-09-30' },
    { barcode: 'AML001', batchNo: 'B2024006', qty: 60, cost: 60, expiry: '2026-11-30' },
    { barcode: 'MET001', batchNo: 'B2024007', qty: 90, cost: 22, expiry: '2027-03-31' },
    { barcode: 'CLO001', batchNo: 'B2024008', qty: 40, cost: 52, expiry: '2026-07-31' },
    // Expiring soon batch
    { barcode: 'NAP001', batchNo: 'B2024009', qty: 30, cost: 8, expiry: '2025-06-30' },
  ];

  for (const b of batchData) {
    const existing = await prisma.batch.findFirst({ where: { batchNumber: b.batchNo, productId: productMap[b.barcode] } });
    if (!existing) {
      await prisma.batch.create({
        data: {
          productId: productMap[b.barcode], batchNumber: b.batchNo,
          expiryDate: new Date(b.expiry), purchasePrice: b.cost,
          quantity: b.qty, initialQty: b.qty
        }
      });
    }
  }

  // Customers
  const cust1 = await prisma.customer.upsert({
    where: { phone: '01811111111' },
    update: {},
    create: { name: 'Rahim Uddin', phone: '01811111111', email: 'rahim@email.com', address: 'Mirpur, Dhaka' }
  });
  await prisma.customer.upsert({
    where: { phone: '01822222222' },
    update: {},
    create: { name: 'Fatema Begum', phone: '01822222222', address: 'Gulshan, Dhaka' }
  });

  // Settings
  const defaultSettings = [
    { key: 'shopName', value: 'PharmaCare Pharmacy' },
    { key: 'shopAddress', value: '123 Health Street, Dhaka, Bangladesh' },
    { key: 'shopPhone', value: '+880 1700-000000' },
    { key: 'shopEmail', value: 'info@pharmacare.com' },
    { key: 'currency', value: '৳' },
    { key: 'taxRate', value: '0' },
    { key: 'invoiceFooter', value: 'Thank you for your purchase!' },
    { key: 'smtpEnabled', value: 'false' },
    { key: 'lowStockDays', value: '90' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log('✅ Seed complete!');
  console.log('👤 Admin: admin@pharmacy.com / admin123');
  console.log('👤 Cashier: cashier@pharmacy.com / cashier123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
