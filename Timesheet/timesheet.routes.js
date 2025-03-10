const express = require('express');
const router = express.Router();
const timesheetController = require('./timesheet.controller');
const { protect } = require('../LoginSignup/auth.middleware');

// IMPORTANT: Place the template route BEFORE the parameterized route

// New route for generating the batch timesheet template
router.get('/template-employees', protect, timesheetController.getEmployeesForLocation);

// Existing Timesheet routes:
router.post('/', protect, timesheetController.createTimesheet);
router.get('/', protect, timesheetController.getTimesheets);
router.get('/:timesheetId', protect, timesheetController.getTimesheetById);
router.put('/:timesheetId', protect, timesheetController.updateTimesheet);
router.delete('/:timesheetId', protect, timesheetController.deleteTimesheet);
router.put('/:timesheetId/approve', protect, timesheetController.approveTimesheet);
router.post('/batch', protect, timesheetController.batchCreateTimesheets);

module.exports = router;
