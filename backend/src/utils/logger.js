const winston = require('winston');
const path = require('path');
const fs = require('fs');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Only write to files if NOT on Vercel
if (!process.env.VERCEL) {
  const logsDir = path.join(__dirname, '../../logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    transports.push(new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
    transports.push(new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }));
  } catch (e) {
    console.error('Could not create logs directory:', e.message);
  }
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
});

module.exports = { logger };
