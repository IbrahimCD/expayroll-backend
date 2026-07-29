// backend/Employee/employee.routes.js
const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const { protect } = require('../LoginSignup/auth.middleware');

// Create new employee
router.post('/', protect, employeeController.createEmployee);

// Batch create employees
router.post('/batch', protect, employeeController.batchCreateEmployees);

// Batch update employees
router.put('/batch-update', protect, employeeController.batchUpdateEmployees);

// Get employees (with filtering and pagination)
router.get('/', protect, employeeController.getEmployees);

// Find employees sharing a payroll ID.
// IMPORTANT: must stay ABOVE '/:employeeId' or it is swallowed as an id.
router.get('/duplicate-payroll-ids', protect, employeeController.getDuplicatePayrollIds);

// Get a single employee by ID
router.get('/:employeeId', protect, employeeController.getEmployeeById);

// Update an employee by ID
router.put('/:employeeId', protect, employeeController.updateEmployee);

// Delete an employee by ID
router.delete('/:employeeId', protect, employeeController.deleteEmployee);

module.exports = router;
