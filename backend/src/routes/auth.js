const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../utils/audit');

const prisma = require('../utils/prisma');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await logAction(user.id, 'LOGIN', 'Auth');

    // Set cookies
    const isLocal = req.get('host').includes('localhost');
    const cookieOptions = {
      httpOnly: true,
      secure: !isLocal,
      sameSite: isLocal ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('token', token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login Error', details: err.message });
  }
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
  res.json({ message: 'Password changed successfully' });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isLocal = req.get('host').includes('localhost');
  const cookieOptions = {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? 'lax' : 'none',
    maxAge: -1
  };
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
