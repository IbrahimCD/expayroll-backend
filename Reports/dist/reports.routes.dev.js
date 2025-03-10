"use strict";

// backend/Reports/reports.routes.js
var express = require('express');

var router = express.Router();

var _require = require('../LoginSignup/auth.middleware'),
    protect = _require.protect;

var reportsController = require('./reports.controller'); // Return a list of pay runs for the dropdown


router.get('/payruns', protect, reportsController.listPayRuns); // Return wage cost allocation data for a specific pay run

router.get('/wage-cost-allocation', protect, reportsController.getWageCostAllocation);
module.exports = router;