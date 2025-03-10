const AuditLog = require('./auditlog.model');

// Endpoint to fetch audit logs (only Admin can access this)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 });
    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ message: 'Server error fetching audit logs' });
  }
};

// A helper function that you can call in other controllers to record an audit log.
exports.createAuditLog = async ({ userId, userName, action, entity, entityId, details }) => {
  try {
    const log = new AuditLog({ userId, userName, action, entity, entityId, details });
    await log.save();
    return log;
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};
