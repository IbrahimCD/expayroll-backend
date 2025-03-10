"use strict";

var express = require('express');

var router = express.Router();

var auditLogController = require('./auditlog.controller');

var _require = require('../LoginSignup/auth.middleware'),
    protect = _require.protect;

var _require2 = require('../userManagement/roleCheck.middleware'),
    roleCheck = _require2.roleCheck; // Only Admin users can view audit logs


router.get('/', protect, roleCheck(['Admin']), auditLogController.getAuditLogs);
module.exports = router;