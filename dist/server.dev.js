"use strict";

// backend/server.js
require('dotenv').config();

var express = require('express');

var cors = require('cors');

var connectDB = require('./db'); // Import the routes for authentication and user management


var loginSignupRoutes = require('./LoginSignup');

var userManagementRoutes = require('./userManagement');

var employeeRoutes = require('./Employee'); // Employee module


var locationRoutes = require('./Location/location.routes');

var timesheetRoutes = require('./Timesheet/timesheet.routes');

var payRunRoutes = require('./payRun/payRun.routes');

var auditLogRoutes = require('./AuditLog/auditlog.routes');

var nictaxRoutes = require('./NICTax/nictax.routes');

var reportsRoutes = require('./Reports/reports.routes');

var employeeWageReportRoutes = require('./EmployeeWageReport/employeeWageReport.routes');

var app = express();
connectDB();
app.use(cors());
app.use(express.json()); // Authentication & password reset flows

app.use('/auth', loginSignupRoutes);
app.use('/audit-logs', auditLogRoutes); // User Management (Admin can create/read/update/delete users)

app.use('/users', userManagementRoutes); // Mount the Location routes:

app.use('/locations', locationRoutes);
app.use('/', employeeRoutes); // Employee routes are mounted at root (e.g. /employees)

app.use('/timesheets', timesheetRoutes);
app.use('/payruns', payRunRoutes);
app.use('/nictax', nictaxRoutes);
app.use('/reports', reportsRoutes);
app.use('/employee-wage-report', employeeWageReportRoutes);
var PORT = process.env.PORT || 4000;
app.listen(PORT, function () {
  console.log("Server listening on port ".concat(PORT));
});