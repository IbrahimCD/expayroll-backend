"use strict";

// backend/Employee/employee.routes.js
var express = require('express');

var router = express.Router();

var employeeController = require('./employee.controller');

var _require = require('../LoginSignup/auth.middleware'),
    protect = _require.protect; // Create new employee


router.post('/', protect, employeeController.createEmployee); // Batch create employees

router.post('/batch', protect, employeeController.batchCreateEmployees); // Batch update employees

router.put('/batch-update', protect, employeeController.batchUpdateEmployees); // Get employees (with filtering and pagination)

router.get('/', protect, employeeController.getEmployees); // Get a single employee by ID

router.get('/:employeeId', protect, employeeController.getEmployeeById); // Update an employee by ID

router.put('/:employeeId', protect, employeeController.updateEmployee); // Delete an employee by ID

router["delete"]('/:employeeId', protect, employeeController.deleteEmployee);
module.exports = router;