const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const prisma = require('./prisma');

const createBackup = async () => {
  const DB_PATH = path.join(__dirname, '../../prisma/pharmacy.db');
  const BACKUP_DIR = path.join(__dirname, '../../backups');
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `auto-backup-${timestamp}.zip`);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    if (fs.existsSync(DB_PATH)) archive.file(DB_PATH, { name: 'pharmacy.db' });
    archive.finalize();
  });

  // Keep only last 30 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('auto-backup-'))
    .sort().reverse();
  files.slice(30).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));

  logger.info(`Auto backup created: ${backupFile}`);
  return backupFile;
};

const sendDailyReport = async () => {
  try {
    const setting = await prisma.setting.findMany();
    const settings = Object.fromEntries(setting.map(s => [s.key, s.value]));
    if (!settings.smtpEnabled || settings.smtpEnabled !== 'true') return;

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date(yesterday); todayStart.setDate(todayStart.getDate() + 1);

    const sales = await prisma.sale.aggregate({
      where: { saleDate: { gte: yesterday, lt: todayStart } },
      _sum: { totalAmount: true, dueAmount: true },
      _count: true
    });
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: yesterday, lt: todayStart } } }
    });
    const totalProfit = saleItems.reduce((s, i) => s + i.profit, 0);

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost || process.env.SMTP_HOST,
      port: parseInt(settings.smtpPort || process.env.SMTP_PORT),
      auth: { user: settings.smtpUser || process.env.SMTP_USER, pass: settings.smtpPass || process.env.SMTP_PASS }
    });

    const reportDate = yesterday.toDateString();
    await transporter.sendMail({
      from: settings.smtpUser || process.env.SMTP_USER,
      to: settings.reportEmail || process.env.REPORT_EMAIL,
      subject: `Daily Sales Report - ${reportDate}`,
      html: `
        <h2>PharmaCare Daily Report - ${reportDate}</h2>
        <table border="1" cellpadding="8" style="border-collapse:collapse">
          <tr><td><strong>Total Sales</strong></td><td>${sales._count || 0}</td></tr>
          <tr><td><strong>Revenue</strong></td><td>৳${(sales._sum.totalAmount || 0).toFixed(2)}</td></tr>
          <tr><td><strong>Profit</strong></td><td>৳${totalProfit.toFixed(2)}</td></tr>
          <tr><td><strong>Due Collected</strong></td><td>৳${(sales._sum.dueAmount || 0).toFixed(2)}</td></tr>
        </table>
      `
    });
    logger.info('Daily report email sent');
  } catch (err) {
    logger.error('Failed to send daily report email: ' + err.message);
  }
};

const scheduleJobs = () => {
  // Daily backup at 11:59 PM
  cron.schedule('59 23 * * *', async () => {
    logger.info('Running scheduled backup...');
    try { await createBackup(); } catch (e) { logger.error('Backup failed: ' + e.message); }
  });

  // Daily report at 11:00 PM
  cron.schedule('0 23 * * *', async () => {
    logger.info('Sending daily report...');
    await sendDailyReport();
  });

  logger.info('⏰ Scheduled jobs registered');
};

module.exports = { scheduleJobs, createBackup, sendDailyReport };
