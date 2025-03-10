const express = require('express');
const router = express.Router();
const auditLogController = require('./auditlog.controller');
const { protect } = require('../LoginSignup/auth.middleware');
const { roleCheck } = require('../userManagement/roleCheck.middleware');

// Only Admin users can view audit logs
router.get('/', protect, roleCheck(['Admin']), auditLogController.getAuditLogs);

module.exports = router;
