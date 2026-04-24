const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// GET /api/categories
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
}));

// POST /api/categories
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const cat = await prisma.category.create({ data: { name } });
  res.status(201).json(cat);
}));

// PUT /api/categories/:id
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const cat = await prisma.category.update({ where: { id: req.params.id }, data: { name: req.body.name } });
  res.json(cat);
}));

// DELETE /api/categories/:id
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
