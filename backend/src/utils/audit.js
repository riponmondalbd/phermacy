const prisma = require('./prisma');

/**
 * Log an action to the AuditLog table
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action name (e.g., 'LOGIN', 'CREATE_USER')
 * @param {string} entity - Entity name (e.g., 'User', 'Product')
 * @param {string} entityId - Optional ID of the affected entity
 * @param {object} details - Optional details (will be stringified)
 */
async function logAction(userId, action, entity, entityId = null, details = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
}

module.exports = { logAction };
