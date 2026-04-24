const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const DB_PATH = path.join(__dirname, '../../prisma/pharmacy.db');
const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// POST /api/backup/create
router.post('/create', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `pharmacy-backup-${timestamp}.zip`);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    if (fs.existsSync(DB_PATH)) archive.file(DB_PATH, { name: 'pharmacy.db' });
    archive.finalize();
  });

  const stat = fs.statSync(backupFile);
  res.json({
    message: 'Backup created successfully',
    file: path.basename(backupFile),
    size: stat.size,
    createdAt: new Date().toISOString()
  });
}));

// GET /api/backup/list
router.get('/list', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(files);
}));

// GET /api/backup/download/:filename
router.get('/download/:filename', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const file = path.join(BACKUP_DIR, req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup file not found' });
  res.download(file);
}));

// DELETE /api/backup/:filename
router.delete('/:filename', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const file = path.join(BACKUP_DIR, req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(file);
  res.json({ message: 'Backup deleted' });
}));

module.exports = router;
