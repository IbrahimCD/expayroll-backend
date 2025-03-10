"use strict";

var express = require('express');

var router = express.Router();

var _require = require('../LoginSignup/auth.middleware'),
    protect = _require.protect;

var reportController = require('./employeeWageReport.controller');

router.get('/', protect, reportController.generateEmployeeWageReport);
module.exports = router;