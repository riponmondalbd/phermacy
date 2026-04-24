const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Record already exists', field: err.meta?.target });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
