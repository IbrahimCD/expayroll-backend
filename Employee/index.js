// backend/Employee/index.js
const express = require('express');
const router = express.Router();
const employeeRoutes = require('./employee.routes');

// Mount all employee routes under /employees
router.use('/employees', employeeRoutes);

module.exports = router;
