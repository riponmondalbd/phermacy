const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auditLog = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    try {
      if (res.statusCode < 400 && req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId: data?.id || req.params?.id || null,
            details: JSON.stringify({ method: req.method, url: req.url }),
            ipAddress: req.ip
          }
        });
      }
    } catch (e) { /* silent */ }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
