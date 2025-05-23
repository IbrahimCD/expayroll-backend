"use strict";

// backend/payRun/payrun.routes.js
var express = require('express');

var router = express.Router();

var payRunController = require('./payRun.controller');

var _require = require('../LoginSignup/auth.middleware'),
    protect = _require.protect;

var _require2 = require('../userManagement/roleCheck.middleware'),
    roleCheck = _require2.roleCheck; // GET all pay runs (optionally paginated)


router.get('/', protect, roleCheck(['Admin', 'Manager']), payRunController.getPayRuns); // CREATE a new pay run

router.post('/', protect, roleCheck(['Admin', 'Manager']), payRunController.createPayRun); // GET a single pay run by ID

router.get('/:payRunId', protect, roleCheck(['Admin', 'Manager']), payRunController.getPayRunById); // UPDATE a pay run (e.g. change name/notes)

router.put('/:payRunId', protect, roleCheck(['Admin', 'Manager']), payRunController.updatePayRun); // DELETE a pay run (only if Draft)

router["delete"]('/:payRunId', protect, roleCheck(['Admin', 'Manager']), payRunController.deletePayRun); // APPROVE a pay run (Draft -> Approved)

router.put('/:payRunId/approve', protect, roleCheck(['Admin', 'Manager']), payRunController.approvePayRun); // REVERT a pay run back to Draft (Approved -> Draft)

router.put('/:payRunId/revert', protect, roleCheck(['Admin', 'Manager']), payRunController.revertPayRun); // MARK pay run as Paid (Approved -> Paid)

router.put('/:payRunId/paid', protect, roleCheck(['Admin', 'Manager']), payRunController.markPayRunAsPaid); // RECALCULATE a pay run (while status=Draft if timesheets/NIC changed)

router.put('/:payRunId/recalc', protect, roleCheck(['Admin', 'Manager']), payRunController.recalcPayRun); // NEW: EXPORT a pay run

router.get('/:payRunId/export', protect, roleCheck(['Admin', 'Manager']), payRunController.exportPayRun);
module.exports = router;