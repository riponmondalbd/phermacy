const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../utils/audit');
const prisma = require('../utils/prisma');

// GET /api/users
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
}));

// POST /api/users
router.post('/', authenticate, authorize('ADMIN'), [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ADMIN', 'MANAGER', 'CASHIER', 'SALESMAN'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });
  
  await logAction(req.user.id, 'CREATE_USER', 'User', user.id, { name, email, role });
  
  res.status(201).json(user);
}));

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const { name, email, role, isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email, role, isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  await logAction(req.user.id, 'UPDATE_USER', 'User', user.id, { name, email, role, isActive });

  res.json(user);
}));

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  
  const { hard } = req.query;
  
  if (hard === 'true') {
    // Check if user has associated records that would prevent deletion
    const saleCount = await prisma.sale.count({ where: { userId: req.params.id } });
    if (saleCount > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing sales records. Deactivate them instead.' });
    }
    
    await prisma.user.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, 'HARD_DELETE_USER', 'User', req.params.id);
    return res.json({ message: 'User permanently deleted' });
  }

  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  await logAction(req.user.id, 'DEACTIVATE_USER', 'User', req.params.id);
  res.json({ message: 'User deactivated' });
}));

module.exports = router;
