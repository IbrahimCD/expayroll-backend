const express = require('express');
const router = express.Router();
const { protect } = require('../LoginSignup/auth.middleware');
const reportController = require('./employeeWageReport.controller');

router.get('/', protect, reportController.generateEmployeeWageReport);

module.exports = router;
