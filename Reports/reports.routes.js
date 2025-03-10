// backend/Reports/reports.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../LoginSignup/auth.middleware');
const reportsController = require('./reports.controller');

// Return a list of pay runs for the dropdown
router.get('/payruns', protect, reportsController.listPayRuns);

// Return wage cost allocation data for a specific pay run
router.get('/wage-cost-allocation', protect, reportsController.getWageCostAllocation);

module.exports = router;
