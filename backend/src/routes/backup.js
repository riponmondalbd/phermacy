const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../prisma/pharmacy.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../temp_uploads');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `restore-${Date.now()}.zip`)
});
const upload = multer({ storage });

// POST /api/backup/create
router.post('/create', authenticate, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `pharmacy-backup-${timestamp}.zip`);

  logger.info(`Creating backup at ${backupFile}...`);
  
  if (!fs.existsSync(DB_PATH)) {
    logger.error(`Database file not found at ${DB_PATH}`);
    return res.status(500).json({ error: 'Database file not found' });
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.file(DB_PATH, { name: 'pharmacy.db' });
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
  const safeFilename = path.basename(req.params.filename);
  const file = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup file not found' });
  res.download(file);
}));

// POST /api/backup/restore — Upload and restore
router.post('/restore', authenticate, authorize('ADMIN'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No backup file uploaded' });

  const zipPath = req.file.path;
  logger.info(`Starting restore from ${zipPath}`);

  try {
    const directory = await unzipper.Open.file(zipPath);
    const dbFile = directory.files.find(f => f.path === 'pharmacy.db');

    if (!dbFile) {
      fs.unlinkSync(zipPath);
      return res.status(400).json({ error: 'Invalid backup: pharmacy.db not found in zip' });
    }

    // Overwrite database
    const buffer = await dbFile.buffer();
    fs.writeFileSync(DB_PATH, buffer);
    
    // Stamp the NEW database with restore info
    try {
      const { PrismaClient } = require('@prisma/client');
      const tempPrisma = new PrismaClient();
      const stamp = `Restored from ${req.file.originalname} on ${new Date().toLocaleString()}`;
      await tempPrisma.setting.upsert({
        where: { key: 'last_restore_info' },
        update: { value: stamp },
        create: { key: 'last_restore_info', value: stamp }
      });
      await tempPrisma.$disconnect();
    } catch (e) {
      logger.error('Failed to stamp database: ' + e.message);
    }
    
    fs.unlinkSync(zipPath);
    logger.info('Database restored and stamped successfully');
    res.json({ message: 'Database restored successfully.' });
  } catch (err) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    logger.error('Restore failed: ' + err.message);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
}));

// DELETE /api/backup/:filename
router.delete('/:filename', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const file = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(file);
  res.json({ message: 'Backup deleted' });
}));

module.exports = router;
