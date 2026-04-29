const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { logAction } = require('../utils/audit');

const prisma = require('../utils/prisma');

// GET /api/settings
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const settings = await prisma.setting.findMany();
  const result = {};
  settings.forEach(s => result[s.key] = s.value);
  res.json(result);
}));

// PUT /api/settings  — upsert multiple keys
router.put('/', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const updates = req.body; // { key: value, ... }
  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    })
  );
  await prisma.$transaction(ops);
  
  await logAction(req.user.id, 'UPDATE_SETTINGS', 'Setting', null, updates);
  
  const all = await prisma.setting.findMany();
  const result = {};
  all.forEach(s => result[s.key] = s.value);
  res.json(result);
}));

module.exports = router;
