const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.map(u => ({ email: u.email, role: u.role, isActive: u.isActive })));
  await prisma.$disconnect();
}

check().catch(console.error);
